import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, posts, autoReplyRules, autoReplyLogs } from "@/lib/db/schema";
import { lt, eq } from "drizzle-orm";
import { getPlatformClient } from "@/lib/platforms/factory";
import { executePublishing } from "@/lib/platforms/publisher";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Publish Post (Event-triggered) ──────────────────────────────────────────

export const publishPost = inngest.createFunction(
  { id: "publish-post", event: "post/publish" },
  async ({ event, step }) => {
    const { postId } = event.data;
    console.log("Inngest: Triggered publish-post for postId:", postId);

    await step.run("execute-publish", async () => {
      const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
      if (!post) {
        console.log("Inngest: Post not found, skipping.", postId);
        return { skipped: true };
      }
      if (post.status !== "scheduled" && post.status !== "published") {
        console.log("Inngest: Post status is not scheduled, skipping.", post.status);
        return { skipped: true };
      }
      return await executePublishing(postId);
    });
  }
);

// ─── Refresh Tokens (Cron every 6h) ──────────────────────────────────────────

export const refreshToken = inngest.createFunction(
  { id: "refresh-tokens", cron: "0 */6 * * *" },
  async ({ step }) => {
    console.log("Inngest: Refreshing tokens...");
    const expiringAccounts = await step.run("fetch-expiring-accounts", async () => {
      return await db.query.connectedAccounts.findMany({
        where: lt(connectedAccounts.expiresAt, new Date(Date.now() + 60 * 60 * 1000)),
      });
    });

    for (const account of expiringAccounts) {
      if (!account.refreshToken) continue;
      await step.run(`refresh-account-${account.id}`, async () => {
        try {
          const client = getPlatformClient(account.platform);
          const newTokens = await client.refreshToken(account.refreshToken!);
          await db
            .update(connectedAccounts)
            .set({
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken || account.refreshToken,
              expiresAt: newTokens.expiresAt,
              status: "connected",
            })
            .where(eq(connectedAccounts.id, account.id));
        } catch {
          await db
            .update(connectedAccounts)
            .set({ status: "expired" })
            .where(eq(connectedAccounts.id, account.id));
        }
      });
    }
  }
);

// ─── Monitor Comments (Cron every 5 min) ─────────────────────────────────────

export const monitorComments = inngest.createFunction(
  { id: "monitor-comments", cron: "*/5 * * * *" },
  async ({ step }) => {
    console.log("Inngest: monitorComments triggered");

    const activeRules = await step.run("fetch-active-rules", async () => {
      return await db.query.autoReplyRules.findMany({
        where: eq(autoReplyRules.isActive, true),
        with: { account: true },
      });
    });

    for (const rule of activeRules) {
      await step.run(`check-rule-${rule.id}`, async () => {
        const account = rule.account;
        if (!account?.accessToken) return;

        let comments: any[] = [];
        try {
          const client = getPlatformClient(account.platform);
          comments = await client.getComments({ accessToken: account.accessToken }, "");
        } catch (e) {
          console.log(`monitorComments: Failed to fetch comments for rule ${rule.id}:`, e);
          return;
        }

        const existingLogs = await db.query.autoReplyLogs.findMany({
          where: eq(autoReplyLogs.ruleId, rule.id),
        });
        const repliedIds = new Set(existingLogs.map((l) => l.targetCommentId));

        for (const comment of comments) {
          if (!comment.id || repliedIds.has(comment.id)) continue;

          const text = (comment.text || comment.content || "").toLowerCase();
          let matches = false;
          if (rule.triggerType === "any") {
            matches = true;
          } else if (rule.triggerType === "keyword" && rule.triggerKeywords) {
            const keywords = rule.triggerKeywords
              .split(",")
              .map((k: string) => k.trim().toLowerCase());
            matches = keywords.some((kw: string) => text.includes(kw));
          }

          if (matches) {
            await inngest.send({
              name: "auto-reply/send",
              data: {
                ruleId: rule.id,
                commentId: comment.id,
                commentText: comment.text || comment.content || "",
                username: comment.username || comment.authorName || "user",
                platform: account.platform,
                accountId: account.id,
              },
            });
          }
        }
      });
    }
  }
);

// ─── Send Auto-Reply (Event-triggered) ───────────────────────────────────────

export const sendAutoReply = inngest.createFunction(
  { id: "send-auto-reply", event: "auto-reply/send" },
  async ({ event, step }) => {
    const { ruleId, commentId, commentText, username, platform, accountId } = event.data;

    const replyText = await step.run("generate-reply", async () => {
      const rule = await db.query.autoReplyRules.findFirst({
        where: eq(autoReplyRules.id, ruleId),
      });
      if (!rule) return null;

      if (rule.useAi && rule.aiPrompt) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = `${rule.aiPrompt}\n\nComment from @${username}: "${commentText}"\n\nWrite a reply:`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } else if (rule.replyTemplate) {
        return rule.replyTemplate
          .replace(/\{username\}/g, username)
          .replace(/\{comment\}/g, commentText);
      }
      return null;
    });

    if (!replyText) return;

    await step.run("send-and-log", async () => {
      const account = await db.query.connectedAccounts.findFirst({
        where: eq(connectedAccounts.id, accountId),
      });
      if (!account) return;

      try {
        const client = getPlatformClient(platform);
        await client.replyToComment({ accessToken: account.accessToken }, commentId, replyText);
      } catch (e) {
        console.error("sendAutoReply: Failed to post reply:", e);
      }

      await db.insert(autoReplyLogs).values({
        ruleId,
        targetCommentId: commentId,
        commentText,
        replyText,
        platform,
      });
    });
  }
);

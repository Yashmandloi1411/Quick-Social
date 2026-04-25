import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, posts, autoReplyRules, autoReplyLogs, platformPosts, postAnalytics, postComments } from "@/lib/db/schema";
import { lt, eq, and, sql } from "drizzle-orm";
import { getPlatformClient } from "@/lib/platforms/factory";
import { executePublishing } from "@/lib/platforms/publisher";
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🚀 Inngest Functions Module Loaded");

// ─── Publish Post (Event-triggered) ──────────────────────────────────────────

export const publishPost = inngest.createFunction(
  { 
    id: "publish-post",
    triggers: [{ event: "post/publish" }]
  },
  async ({ event, step }) => {
    const { postId } = event.data;
    await step.run("execute-publish", async () => {
      const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
      if (!post || (post.status !== "scheduled" && post.status !== "published")) return { skipped: true };
      return await executePublishing(postId);
    });
  }
);

// ─── Refresh Tokens (Cron every 6h) ──────────────────────────────────────────

export const refreshToken = inngest.createFunction(
  { 
    id: "refresh-tokens",
    triggers: [{ cron: "0 */6 * * *" }]
  },
  async ({ step }) => {
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
          await db.update(connectedAccounts).set({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken || account.refreshToken,
            expiresAt: newTokens.expiresAt,
            status: "connected",
          }).where(eq(connectedAccounts.id, account.id));
        } catch {
          await db.update(connectedAccounts).set({ status: "expired" }).where(eq(connectedAccounts.id, account.id));
        }
      });
    }
  }
);

// ─── Monitor Comments (Cron every 1 min) ─────────────────────────────────────

export const monitorComments = inngest.createFunction(
  { 
    id: "monitor-comments",
    triggers: [{ cron: "* * * * *" }]
  },
  async ({ step }) => {
    const activeRules = await step.run("fetch-rules", async () => {
      return await db.query.autoReplyRules.findMany({
        where: eq(autoReplyRules.isActive, true),
        with: { account: true },
      });
    });

    console.log(`[Monitor] Found ${activeRules.length} active rules.`);

    for (const rule of activeRules) {
      await step.run(`check-rule-${rule.id}`, async () => {
        const account = rule.account;
        if (!account) return;

        console.log(`[Monitor] Checking rule ${rule.id} for platform ${account.platform}`);
        const client = getPlatformClient(account.platform);
        const comments = await client.getComments({ accessToken: account.accessToken }, account.accountId);
        
        const existingLogs = await db.query.autoReplyLogs.findMany({
          where: eq(autoReplyLogs.ruleId, rule.id),
        });
        const repliedIds = new Set(existingLogs.map((l) => l.targetCommentId));

        for (const comment of comments) {
          if (!comment.id || repliedIds.has(comment.id) || comment.fromId === account.accountId) continue;

          const text = (comment.text || "").toLowerCase();
          let match = false;
          if (rule.triggerType === "any") {
            match = true;
          } else if (rule.triggerType === "keyword" && rule.triggerKeywords) {
            const keys = rule.triggerKeywords.split(",").map((k) => k.trim().toLowerCase());
            match = keys.some((k) => text.includes(k));
          }

          if (match) {
            console.log(`🚀 [Monitor] Match! Sending auto-reply.execute for comment ${comment.id}`);
            await inngest.send({
              name: "auto-reply.execute",
              data: {
                ruleId: rule.id,
                commentId: comment.id,
                commentText: comment.text,
                username: comment.username || "user",
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
  { 
    id: "auto-reply-processor",
    triggers: [{ event: "auto-reply.execute" }]
  },
  async ({ event, step }) => {
    const { ruleId, commentId, commentText, username, platform, accountId } = event.data;
    console.log(`[Processor] Handling event for comment ${commentId}`);

    const replyText = await step.run("generate-reply", async () => {
      if (!ruleId || ruleId === "undefined") return null;

      const rule = await db.query.autoReplyRules.findFirst({
        where: eq(autoReplyRules.id, ruleId),
      });
      if (!rule) return null;

      if (rule.useAi && rule.aiPrompt) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(
          `${rule.aiPrompt}\n\nComment from ${username}: ${commentText}\n\nReply shortly and naturally.`
        );
        return result.response.text().trim();
      }

      if (rule.replyTemplate) {
        return rule.replyTemplate.replace(/\{username\}/g, username).replace(/\{comment\}/g, commentText);
      }
      return null;
    });

    if (!replyText) return;

    await step.run("send-and-log", async () => {
      const account = await db.query.connectedAccounts.findFirst({
        where: eq(connectedAccounts.id, accountId),
      });
      if (!account) return;

      const client = getPlatformClient(platform);
      await client.replyToComment({ accessToken: account.accessToken }, commentId, replyText);
      
      await db.insert(autoReplyLogs).values({
        ruleId,
        targetCommentId: commentId,
        commentText,
        replyText,
        platform,
      });
      console.log(`✅ [Processor] Reply sent to ${platform} and logged.`);
    });
  }
);

// ─── Sync Analytics (Cron every 1h + Manual) ───────────────────────────────────

export const syncAnalytics = inngest.createFunction(
  { 
    id: "sync-analytics",
    triggers: [
      { cron: "0 * * * *" },
      { event: "analytics/sync" }
    ]
  },
  async ({ event, step }) => {
    const accountsToSync = await step.run("fetch-accounts", async () => {
      if (event.data?.accountId) {
        return await db.query.connectedAccounts.findMany({
          where: eq(connectedAccounts.id, event.data.accountId),
        });
      }
      return await db.query.connectedAccounts.findMany({
        where: eq(connectedAccounts.status, "connected"),
      });
    });

    for (const account of accountsToSync) {
      await step.run(`sync-account-${account.id}`, async () => {
        const client = getPlatformClient(account.platform);
        if (!client.getAllPosts) return;

        const postsData = await client.getAllPosts({ accessToken: account.accessToken }, account.accountId!);
        
        for (const post of postsData) {
          // 1. Upsert Post
          await db.insert(platformPosts).values({
            accountId: account.id,
            platformPostId: post.id,
            platform: account.platform,
            content: post.message || post.caption || "",
            mediaUrl: post.full_picture || post.media_url || post.thumbnail_url || null,
            mediaType: post.media_type || "IMAGE",
            permalink: post.permalink_url || post.permalink || null,
            publishedAt: post.created_time || post.timestamp ? new Date(post.created_time || post.timestamp) : null,
          }).onConflictDoUpdate({
            target: platformPosts.platformPostId,
            set: {
              content: post.message || post.caption || "",
              mediaUrl: post.full_picture || post.media_url || post.thumbnail_url || null,
              permalink: post.permalink_url || post.permalink || null,
            }
          });

          // 2. Fetch & Upsert Metrics
          let metrics = { reach: 0, impressions: 0 };
          if (client.getPostMetrics) {
            metrics = await client.getPostMetrics({ accessToken: account.accessToken }, post.id);
          }

          const likes = post.like_count !== undefined ? post.like_count.toString() : (post.likes?.summary?.total_count?.toString() || "0");
          const comments = post.comments_count !== undefined ? post.comments_count.toString() : (post.comments?.data?.length?.toString() || "0");
          const shares = post.shares?.count?.toString() || "0";

          await db.insert(postAnalytics).values({
            platformPostId: post.id,
            likesCount: likes,
            commentsCount: comments,
            sharesCount: shares,
            reach: metrics.reach.toString(),
            impressions: metrics.impressions.toString(),
            syncedAt: new Date(),
          }).onConflictDoUpdate({
            target: postAnalytics.platformPostId,
            set: {
              likesCount: likes,
              commentsCount: comments,
              sharesCount: shares,
              reach: metrics.reach.toString(),
              impressions: metrics.impressions.toString(),
              syncedAt: new Date(),
            }
          });

          // 3. Upsert Comments
          const platformComments = post.comments?.data || [];
          for (const comm of platformComments) {
            await db.insert(postComments).values({
              platformPostId: post.id,
              platformCommentId: comm.id,
              authorName: comm.from?.name || comm.username || "User",
              authorId: comm.from?.id || "",
              text: comm.message || comm.text || "",
              commentedAt: comm.created_time || comm.timestamp ? new Date(comm.created_time || comm.timestamp) : null,
              syncedAt: new Date(),
            }).onConflictDoUpdate({
              target: postComments.platformCommentId,
              set: {
                text: comm.message || comm.text || "",
                syncedAt: new Date(),
              }
            });
          }
        }
      });
    }

    return { synced: accountsToSync.length };
  }
);

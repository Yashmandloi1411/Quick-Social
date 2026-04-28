import { inngest } from "./client";
import { connectMongo } from "@/lib/db/mongo";
import { User, ConnectedAccount, Post, PostTarget, AutoReplyRule, AutoReplyLog, PlatformPost, PostComment } from "@/lib/db/models";
import { getPlatformClient } from "@/lib/platforms/factory";
import { executePublishing } from "@/lib/platforms/publisher";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";

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
      await connectMongo();
      const post = await Post.findById(postId);
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
      await connectMongo();
      return await ConnectedAccount.find({
        expiresAt: { $lt: new Date(Date.now() + 60 * 60 * 1000) }
      }).lean();
    });

    for (const account of expiringAccounts) {
      if (!account.refreshToken) continue;
      await step.run(`refresh-account-${account._id}`, async () => {
        try {
          await connectMongo();
          const client = getPlatformClient(account.platform);
          const newTokens = await client.refreshToken(account.refreshToken!);
          await ConnectedAccount.updateOne(
            { _id: account._id },
            {
              $set: {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken || account.refreshToken,
                expiresAt: newTokens.expiresAt,
                status: "connected",
              }
            }
          );
        } catch {
          await ConnectedAccount.updateOne(
            { _id: account._id },
            { $set: { status: "expired" } }
          );
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
      await connectMongo();
      return await AutoReplyRule.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "connectedaccounts",
            localField: "accountId",
            foreignField: "_id",
            as: "account"
          }
        },
        { $unwind: "$account" }
      ]);
    });

    console.log(`[Monitor] Found ${activeRules.length} active rules.`);

    for (const rule of activeRules) {
      await step.run(`check-rule-${rule._id}`, async () => {
        await connectMongo();
        const account = rule.account;
        if (!account) return;

        console.log(`[Monitor] Checking rule ${rule._id} for platform ${account.platform}`);
        const client = getPlatformClient(account.platform);
        const comments = await client.getComments({ accessToken: account.accessToken }, account.accountId);
        
        const existingLogs = await AutoReplyLog.find({ ruleId: rule._id }).lean();
        const repliedIds = new Set(existingLogs.map((l: any) => l.targetCommentId));

        for (const comment of comments) {
          if (!comment.id || repliedIds.has(comment.id) || comment.fromId === account.accountId) continue;

          const text = (comment.text || "").toLowerCase();
          let match = false;
          if (rule.triggerType === "any") {
            match = true;
          } else if (rule.triggerType === "keyword" && rule.triggerKeywords) {
            const keys = rule.triggerKeywords.split(",").map((k: string) => k.trim().toLowerCase());
            match = keys.some((k: string) => text.includes(k));
          }

          if (match) {
            console.log(`🚀 [Monitor] Match! Sending auto-reply.execute for comment ${comment.id}`);
            await inngest.send({
              name: "auto-reply.execute",
              data: {
                ruleId: rule._id,
                commentId: comment.id,
                commentText: comment.text,
                username: comment.username || "user",
                platform: account.platform,
                accountId: account._id,
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
      await connectMongo();
      if (!ruleId || ruleId === "undefined") return null;

      const rule = await AutoReplyRule.findById(ruleId).lean();
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
      await connectMongo();
      const account = await ConnectedAccount.findById(accountId).lean();
      if (!account) return;

      const client = getPlatformClient(platform);
      await client.replyToComment({ accessToken: account.accessToken }, commentId, replyText);
      
      await AutoReplyLog.create({
        _id: uuidv4(),
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
      await connectMongo();
      if (event.data?.accountId) {
        return await ConnectedAccount.find({ _id: event.data.accountId }).lean();
      }
      return await ConnectedAccount.find({ status: "connected" }).lean();
    });

    for (const account of accountsToSync) {
      await step.run(`sync-account-${account._id}`, async () => {
        await connectMongo();
        const client = getPlatformClient(account.platform);
        if (!client.getAllPosts) return;

        const postsData = await client.getAllPosts({ accessToken: account.accessToken }, account.accountId!);
        
        for (const post of postsData) {
          // 1. Fetch Metrics
          let metrics: any = { reach: 0, impressions: 0, clicks: 0, negativeActions: 0, saves: 0, videoViews: 0 };
          if (client.getPostMetrics) {
            metrics = await client.getPostMetrics({ accessToken: account.accessToken }, post.id, post.media_type);
          }

          // Check if post originated from QuickSocial
          const postTarget = await PostTarget.findOne({ platformPostId: post.id }).lean();
          
          // Fallback: Check if we have a post with the same content (trimmed) for this user
          let isQuickSocialOrigin = !!postTarget;
          if (!isQuickSocialOrigin) {
            const cleanCaption = (post.caption || post.text || post.message || "").trim();
            if (cleanCaption) {
              const contentMatch = await Post.findOne({ 
                userId: account.userId, 
                // Improved regex: ignores leading/trailing whitespace and is case-insensitive
                content: { $regex: new RegExp(`^\\s*${cleanCaption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }
              }).lean();
              isQuickSocialOrigin = !!contentMatch;
            }
          }
          
          if (post.caption?.toLowerCase().includes("nike") || isQuickSocialOrigin) {
            console.log(`[Sync Debug] Post: "${post.caption}" | ID: ${post.id} | Found Target: ${!!postTarget} | Found Content: ${isQuickSocialOrigin} | User: ${account.userId}`);
          }

          const likesNum = post.like_count !== undefined ? Number(post.like_count) : (Number(post.likes?.summary?.total_count) || 0);
          const commentsNum = post.comments_count !== undefined ? Number(post.comments_count) : (Number(post.comments?.data?.length) || 0);
          const sharesNum = Number(post.shares?.count) || (Number(metrics.shares) || 0);
          const reachNum = Number(metrics.reach) || 0;
          const savesNum = Number(metrics.saves) || 0;

          // 2. Calculations
          // Engagement Rate = (Likes + Comments + Shares + Saves) / Reach
          const totalInteractions = likesNum + commentsNum + sharesNum + savesNum;
          const engagementRate = reachNum > 0 ? (totalInteractions / reachNum) : 0;
          
          // Engagement Score = ((Likes * 1) + (Comments * 2) + (Shares * 3)) / Reach
          const scoreBasis = (likesNum * 1) + (commentsNum * 2) + (sharesNum * 3);
          const engagementScore = reachNum > 0 ? (scoreBasis / reachNum) : 0;

          // 3. Upsert PlatformPost (embedding analytics)
          await PlatformPost.findOneAndUpdate(
            { platformPostId: post.id },
            {
              $set: {
                accountId: account._id,
                platform: account.platform,
                content: post.message || post.caption || "",
                mediaUrl: post.full_picture || post.media_url || post.thumbnail_url || null,
                mediaType: post.media_type || "IMAGE",
                permalink: post.permalink_url || post.permalink || null,
                publishedAt: post.created_time || post.timestamp ? new Date(post.created_time || post.timestamp) : null,
                isQuickSocialOrigin,
                "analytics.likesCount": likesNum.toString(),
                "analytics.commentsCount": commentsNum.toString(),
                "analytics.sharesCount": sharesNum.toString(),
                "analytics.savesCount": savesNum.toString(),
                "analytics.clicksCount": (metrics.clicks || 0).toString(),
                "analytics.negativeActionsCount": (metrics.negativeActions || 0).toString(),
                "analytics.reach": reachNum.toString(),
                "analytics.impressions": (metrics.impressions || 0).toString(),
                "analytics.videoViews": (metrics.videoViews || 0).toString(),
                "analytics.engagementRate": engagementRate,
                "analytics.engagementScore": engagementScore,
                "analytics.syncedAt": new Date(),
              },
              $setOnInsert: { _id: uuidv4(), createdAt: new Date() }
            },
            { upsert: true, new: true }
          );

          // 4. Upsert Comments
          const platformComments = post.comments?.data || [];
          for (const comm of platformComments) {
            await PostComment.findOneAndUpdate(
              { platformCommentId: comm.id },
              {
                $set: {
                  platformPostId: post.id,
                  authorName: comm.from?.name || comm.username || "User",
                  authorId: comm.from?.id || "",
                  text: comm.message || comm.text || "",
                  commentedAt: comm.created_time || comm.timestamp ? new Date(comm.created_time || comm.timestamp) : null,
                  syncedAt: new Date(),
                },
                $setOnInsert: { _id: uuidv4() }
              },
              { upsert: true, new: true }
            );
          }
        }
      });
    }

    return { synced: accountsToSync.length };
  }
);

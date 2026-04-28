import { db } from "../lib/db";
import { connectMongo } from "../lib/db/mongo";
import * as models from "../lib/db/models";
import * as schema from "../lib/db/schema";
import mongoose from "mongoose";

async function migrate() {
  console.log("Starting Postgres to MongoDB Migration...");

  try {
    await connectMongo();
    console.log("✅ Connected to MongoDB");

    // 1. Users
    const users = await db.query.users.findMany();
    await models.User.deleteMany({});
    if (users.length > 0) {
      const userDocs = users.map(u => ({
        _id: u.id,
        clerkId: u.clerkId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        plan: u.plan,
        createdAt: u.createdAt,
      }));
      await models.User.insertMany(userDocs);
    }
    console.log(`✅ Migrated ${users.length} Users`);

    // 2. Connected Accounts
    const accounts = await db.query.connectedAccounts.findMany();
    await models.ConnectedAccount.deleteMany({});
    if (accounts.length > 0) {
      const accountDocs = accounts.map(a => ({
        _id: a.id,
        userId: a.userId,
        platform: a.platform,
        accessToken: a.accessToken,
        refreshToken: a.refreshToken,
        expiresAt: a.expiresAt,
        accountName: a.accountName,
        accountId: a.accountId,
        avatarUrl: a.avatarUrl,
        scopes: a.scopes,
        status: a.status,
      }));
      await models.ConnectedAccount.insertMany(accountDocs);
    }
    console.log(`✅ Migrated ${accounts.length} Connected Accounts`);

    // 3. Auto Reply Rules
    const rules = await db.query.autoReplyRules.findMany();
    await models.AutoReplyRule.deleteMany({});
    if (rules.length > 0) {
      const ruleDocs = rules.map(r => ({
        _id: r.id,
        userId: r.userId,
        accountId: r.accountId,
        triggerType: r.triggerType,
        triggerKeywords: r.triggerKeywords,
        useAi: r.useAi,
        aiPrompt: r.aiPrompt,
        replyTemplate: r.replyTemplate,
        isActive: r.isActive,
        createdAt: r.createdAt,
      }));
      await models.AutoReplyRule.insertMany(ruleDocs);
    }
    console.log(`✅ Migrated ${rules.length} Auto Reply Rules`);

    // 4. Platform Posts & Embedded Analytics
    const platformPosts = await db.query.platformPosts.findMany();
    const analytics = await db.query.postAnalytics.findMany();
    const analyticsMap = new Map(analytics.map(a => [a.platformPostId, a]));

    await models.PlatformPost.deleteMany({});
    if (platformPosts.length > 0) {
      const ppDocs = platformPosts.map(p => {
        const postAnal = analyticsMap.get(p.platformPostId);
        return {
          _id: p.id,
          accountId: p.accountId,
          platformPostId: p.platformPostId,
          platform: p.platform,
          content: p.content,
          mediaUrl: p.mediaUrl,
          mediaType: p.mediaType,
          permalink: p.permalink,
          publishedAt: p.publishedAt,
          createdAt: p.createdAt,
          analytics: postAnal ? {
            likesCount: postAnal.likesCount,
            commentsCount: postAnal.commentsCount,
            sharesCount: postAnal.sharesCount,
            reach: postAnal.reach,
            impressions: postAnal.impressions,
            reactionsJson: postAnal.reactionsJson,
            syncedAt: postAnal.syncedAt,
          } : undefined
        };
      });
      await models.PlatformPost.insertMany(ppDocs);
    }
    console.log(`✅ Migrated ${platformPosts.length} Platform Posts (with embedded analytics)`);

    console.log("Migration completed successfully! 🎉");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connectedAccounts = pgTable("connected_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  accountName: text("account_name"),
  accountId: text("account_id"),
  avatarUrl: text("avatar_url"),
  scopes: text("scopes"),
  status: text("status").default("connected"),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  status: text("status").notNull(), // 'draft', 'scheduled', 'published', 'failed'
  scheduledFor: timestamp("scheduled_for"),
  mediaUrls: text("media_urls"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postTargets = pgTable("post_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => posts.id).notNull(),
  accountId: uuid("account_id").references(() => connectedAccounts.id).notNull(),
  status: text("status").default("pending").notNull(),
  error: text("error"),
});

export const autoReplyRules = pgTable("auto_reply_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  accountId: uuid("account_id").references(() => connectedAccounts.id).notNull(),
  triggerType: text("trigger_type").notNull().default("keyword"), // 'keyword' | 'any'
  triggerKeywords: text("trigger_keywords"), // comma-separated, null if triggerType='any'
  useAi: boolean("use_ai").default(false).notNull(),
  aiPrompt: text("ai_prompt"), // instructions for Gemini if useAi=true
  replyTemplate: text("reply_template"), // template with {username},{comment} if useAi=false
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const autoReplyLogs = pgTable("auto_reply_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").references(() => autoReplyRules.id).notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  targetCommentId: text("target_comment_id").notNull(),
  commentText: text("comment_text"),
  replyText: text("reply_text"),
  platform: text("platform"),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  url: text("url").notNull(),
  publicId: text("public_id").notNull(),
  type: text("type").notNull(), // 'image', 'video'
});

export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: text("job_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(connectedAccounts),
  posts: many(posts),
}));

export const connectedAccountsRelations = relations(connectedAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [connectedAccounts.userId],
    references: [users.id],
  }),
  postTargets: many(postTargets),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  targets: many(postTargets),
}));

export const postTargetsRelations = relations(postTargets, ({ one }) => ({
  post: one(posts, {
    fields: [postTargets.postId],
    references: [posts.id],
  }),
  account: one(connectedAccounts, {
    fields: [postTargets.accountId],
    references: [connectedAccounts.id],
  }),
}));

export const autoReplyRulesRelations = relations(autoReplyRules, ({ one, many }) => ({
  user: one(users, { fields: [autoReplyRules.userId], references: [users.id] }),
  account: one(connectedAccounts, { fields: [autoReplyRules.accountId], references: [connectedAccounts.id] }),
  logs: many(autoReplyLogs),
}));

export const autoReplyLogsRelations = relations(autoReplyLogs, ({ one }) => ({
  rule: one(autoReplyRules, { fields: [autoReplyLogs.ruleId], references: [autoReplyRules.id] }),
}));

// ─── Analytics Tables ─────────────────────────────────────────────────────────

export const platformPosts = pgTable("platform_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => connectedAccounts.id).notNull(),
  platformPostId: text("platform_post_id").notNull().unique(),
  platform: text("platform").notNull(),        // "facebook" | "instagram"
  content: text("content"),                    // caption / message
  mediaUrl: text("media_url"),                 // thumbnail image
  mediaType: text("media_type"),               // "IMAGE" | "VIDEO" | "TEXT"
  permalink: text("permalink"),                // direct link to post on platform
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postAnalytics = pgTable("post_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  platformPostId: text("platform_post_id").notNull().unique(),
  likesCount: text("likes_count").default("0"),
  commentsCount: text("comments_count").default("0"),
  sharesCount: text("shares_count").default("0"),
  reach: text("reach").default("0"),
  impressions: text("impressions").default("0"),
  reactionsJson: text("reactions_json"),   // JSON string: { LIKE: 5, LOVE: 2, ... }
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  platformPostId: text("platform_post_id").notNull(),
  platformCommentId: text("platform_comment_id").notNull().unique(),
  authorName: text("author_name"),
  authorId: text("author_id"),
  text: text("text"),
  commentedAt: timestamp("commented_at"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const platformPostsRelations = relations(platformPosts, ({ one, many }) => ({
  account: one(connectedAccounts, { fields: [platformPosts.accountId], references: [connectedAccounts.id] }),
  analytics: many(postAnalytics),
  comments: many(postComments),
}));

export const postAnalyticsRelations = relations(postAnalytics, ({ one }) => ({
  post: one(platformPosts, { fields: [postAnalytics.platformPostId], references: [platformPosts.platformPostId] }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(platformPosts, { fields: [postComments.platformPostId], references: [platformPosts.platformPostId] }),
}));

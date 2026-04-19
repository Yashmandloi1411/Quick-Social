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



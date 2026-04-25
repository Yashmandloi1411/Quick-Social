import { pgTable, foreignKey, uuid, text, timestamp, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const postMetrics = pgTable("post_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	targetId: uuid("target_id"),
	platformPostId: text("platform_post_id").notNull(),
	likes: text().default('0'),
	comments: text().default('0'),
	shares: text().default('0'),
	reach: text().default('0'),
	impressions: text().default('0'),
	saves: text().default('0'),
	content: text(),
	platform: text(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.targetId],
			foreignColumns: [postTargets.id],
			name: "post_metrics_target_id_post_targets_id_fk"
		}),
]);

export const accountAnalytics = pgTable("account_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	followers: text().default('0'),
	reach: text().default('0'),
	impressions: text().default('0'),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [connectedAccounts.id],
			name: "account_analytics_account_id_connected_accounts_id_fk"
		}),
]);

export const connectedAccounts = pgTable("connected_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	platform: text().notNull(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	accountName: text("account_name"),
	accountId: text("account_id"),
	avatarUrl: text("avatar_url"),
	scopes: text(),
	status: text().default('connected'),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "connected_accounts_user_id_users_id_fk"
		}),
]);

export const posts = pgTable("posts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	content: text().notNull(),
	status: text().notNull(),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	mediaUrls: text("media_urls"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "posts_user_id_users_id_fk"
		}),
]);

export const scheduledJobs = pgTable("scheduled_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: text("job_id").notNull(),
	type: text().notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const autoReplyLogs = pgTable("auto_reply_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ruleId: uuid("rule_id").notNull(),
	appliedAt: timestamp("applied_at", { mode: 'string' }).defaultNow().notNull(),
	targetCommentId: text("target_comment_id").notNull(),
	commentText: text("comment_text"),
	replyText: text("reply_text"),
	platform: text(),
}, (table) => [
	foreignKey({
			columns: [table.ruleId],
			foreignColumns: [autoReplyRules.id],
			name: "auto_reply_logs_rule_id_auto_reply_rules_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	plan: text().default('free'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const mediaAssets = pgTable("media_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	url: text().notNull(),
	publicId: text("public_id").notNull(),
	type: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "media_assets_user_id_users_id_fk"
		}),
]);

export const autoReplyRules = pgTable("auto_reply_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	triggerKeywords: text("trigger_keywords"),
	isActive: boolean("is_active").default(true).notNull(),
	accountId: uuid("account_id").notNull(),
	triggerType: text("trigger_type").default('keyword').notNull(),
	useAi: boolean("use_ai").default(false).notNull(),
	aiPrompt: text("ai_prompt"),
	replyTemplate: text("reply_template"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auto_reply_rules_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [connectedAccounts.id],
			name: "auto_reply_rules_account_id_connected_accounts_id_fk"
		}),
]);

export const postTargets = pgTable("post_targets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	postId: uuid("post_id").notNull(),
	accountId: uuid("account_id").notNull(),
	status: text().default('pending').notNull(),
	error: text(),
	platformPostId: text("platform_post_id"),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_targets_post_id_posts_id_fk"
		}),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [connectedAccounts.id],
			name: "post_targets_account_id_connected_accounts_id_fk"
		}),
]);

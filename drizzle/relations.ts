import { relations } from "drizzle-orm/relations";
import { postTargets, postMetrics, connectedAccounts, accountAnalytics, users, posts, autoReplyRules, autoReplyLogs, mediaAssets } from "./schema";

export const postMetricsRelations = relations(postMetrics, ({one}) => ({
	postTarget: one(postTargets, {
		fields: [postMetrics.targetId],
		references: [postTargets.id]
	}),
}));

export const postTargetsRelations = relations(postTargets, ({one, many}) => ({
	postMetrics: many(postMetrics),
	post: one(posts, {
		fields: [postTargets.postId],
		references: [posts.id]
	}),
	connectedAccount: one(connectedAccounts, {
		fields: [postTargets.accountId],
		references: [connectedAccounts.id]
	}),
}));

export const accountAnalyticsRelations = relations(accountAnalytics, ({one}) => ({
	connectedAccount: one(connectedAccounts, {
		fields: [accountAnalytics.accountId],
		references: [connectedAccounts.id]
	}),
}));

export const connectedAccountsRelations = relations(connectedAccounts, ({one, many}) => ({
	accountAnalytics: many(accountAnalytics),
	user: one(users, {
		fields: [connectedAccounts.userId],
		references: [users.id]
	}),
	autoReplyRules: many(autoReplyRules),
	postTargets: many(postTargets),
}));

export const usersRelations = relations(users, ({many}) => ({
	connectedAccounts: many(connectedAccounts),
	posts: many(posts),
	mediaAssets: many(mediaAssets),
	autoReplyRules: many(autoReplyRules),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	user: one(users, {
		fields: [posts.userId],
		references: [users.id]
	}),
	postTargets: many(postTargets),
}));

export const autoReplyLogsRelations = relations(autoReplyLogs, ({one}) => ({
	autoReplyRule: one(autoReplyRules, {
		fields: [autoReplyLogs.ruleId],
		references: [autoReplyRules.id]
	}),
}));

export const autoReplyRulesRelations = relations(autoReplyRules, ({one, many}) => ({
	autoReplyLogs: many(autoReplyLogs),
	user: one(users, {
		fields: [autoReplyRules.userId],
		references: [users.id]
	}),
	connectedAccount: one(connectedAccounts, {
		fields: [autoReplyRules.accountId],
		references: [connectedAccounts.id]
	}),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({one}) => ({
	user: one(users, {
		fields: [mediaAssets.userId],
		references: [users.id]
	}),
}));
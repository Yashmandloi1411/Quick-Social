import mongoose, { Schema } from "mongoose";

// We use String for _id to retain PostgreSQL UUIDs

// --- Users ---
const userSchema = new Schema({
  _id: { type: String, required: true }, // Postgres UUID
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  firstName: String,
  lastName: String,
  plan: { type: String, default: "free" },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);

// --- Connected Accounts ---
const connectedAccountSchema = new Schema({
  _id: { type: String, required: true }, // Postgres UUID
  userId: { type: String, ref: "User", required: true },
  platform: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: String,
  expiresAt: Date,
  accountName: String,
  accountId: String,
  avatarUrl: String,
  scopes: String,
  status: { type: String, default: "connected" },
});

export const ConnectedAccount = mongoose.models.ConnectedAccount || mongoose.model("ConnectedAccount", connectedAccountSchema);

// --- Posts ---
const postSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, ref: "User", required: true },
  content: { type: String, required: true },
  status: { type: String, required: true },
  scheduledFor: Date,
  mediaUrls: String,
  createdAt: { type: Date, default: Date.now },
});

export const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

const postTargetSchema = new Schema({
  _id: { type: String, required: true },
  postId: { type: String, ref: "Post", required: true },
  accountId: { type: String, ref: "ConnectedAccount", required: true },
  status: { type: String, default: "pending", required: true },
  platformPostId: String,
  error: String,
});

export const PostTarget = mongoose.models.PostTarget || mongoose.model("PostTarget", postTargetSchema);

// --- Auto Reply Rules & Logs ---
const autoReplyRuleSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, ref: "User", required: true },
  accountId: { type: String, ref: "ConnectedAccount", required: true },
  triggerType: { type: String, required: true, default: "keyword" },
  triggerKeywords: String,
  useAi: { type: Boolean, default: false, required: true },
  aiPrompt: String,
  replyTemplate: String,
  isActive: { type: Boolean, default: true, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const AutoReplyRule = mongoose.models.AutoReplyRule || mongoose.model("AutoReplyRule", autoReplyRuleSchema);

const autoReplyLogSchema = new Schema({
  _id: { type: String, required: true },
  ruleId: { type: String, ref: "AutoReplyRule", required: true },
  appliedAt: { type: Date, default: Date.now },
  targetCommentId: { type: String, required: true },
  commentText: String,
  replyText: String,
  platform: String,
});

export const AutoReplyLog = mongoose.models.AutoReplyLog || mongoose.model("AutoReplyLog", autoReplyLogSchema);

// --- Media Assets & Scheduled Jobs ---
const mediaAssetSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, ref: "User", required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  type: { type: String, required: true },
});

export const MediaAsset = mongoose.models.MediaAsset || mongoose.model("MediaAsset", mediaAssetSchema);

const scheduledJobSchema = new Schema({
  _id: { type: String, required: true },
  jobId: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ScheduledJob = mongoose.models.ScheduledJob || mongoose.model("ScheduledJob", scheduledJobSchema);

// --- Analytics ---
const platformPostSchema = new Schema({
  _id: { type: String, required: true },
  accountId: { type: String, ref: "ConnectedAccount", required: true },
  platformPostId: { type: String, required: true, unique: true },
  platform: { type: String, required: true },
  content: String,
  mediaUrl: String,
  mediaType: String,
  permalink: String,
  publishedAt: Date,
  isQuickSocialOrigin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  
  // Embedded Analytics (replaces postAnalytics table)
  analytics: {
    likesCount: { type: String, default: "0" },
    commentsCount: { type: String, default: "0" },
    sharesCount: { type: String, default: "0" },
    savesCount: { type: String, default: "0" },
    clicksCount: { type: String, default: "0" },
    negativeActionsCount: { type: String, default: "0" },
    reach: { type: String, default: "0" },
    impressions: { type: String, default: "0" },
    videoViews: { type: String, default: "0" },
    engagementRate: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
    reactionsJson: String,
    syncedAt: { type: Date, default: Date.now },
  }
});

export const PlatformPost = mongoose.models.PlatformPost || mongoose.model("PlatformPost", platformPostSchema);

const postCommentSchema = new Schema({
  _id: { type: String, required: true },
  platformPostId: { type: String, required: true }, // referencing platformPostId instead of internal _id
  platformCommentId: { type: String, required: true, unique: true },
  authorName: String,
  authorId: String,
  text: String,
  commentedAt: Date,
  syncedAt: { type: Date, default: Date.now },
});

export const PostComment = mongoose.models.PostComment || mongoose.model("PostComment", postCommentSchema);

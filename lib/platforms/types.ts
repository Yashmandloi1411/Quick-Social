export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
}

export interface AccountMetadata {
  accountId: string;
  accountName: string;
  avatarUrl?: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface PlatformClient {
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<TokenResponse & AccountMetadata>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  publishPost(tokens: { accessToken: string }, content: string, media?: string[], accountId?: string): Promise<PublishResult>;
  getComments(tokens: { accessToken: string }, accountId: string): Promise<any>;
  replyToComment(tokens: { accessToken: string }, commentId: string, text: string, accountId?: string): Promise<any>;
  getAllPosts?(tokens: { accessToken: string }, accountId: string): Promise<any[]>;
  getPostMetrics?(tokens: { accessToken: string }, postId: string): Promise<any>;
}

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
  publishPost(tokens: { accessToken: string }, content: string, media?: string[]): Promise<PublishResult>;
  getComments(tokens: { accessToken: string }, postId: string): Promise<any>;
  replyToComment(tokens: { accessToken: string }, commentId: string, text: string): Promise<any>;
}

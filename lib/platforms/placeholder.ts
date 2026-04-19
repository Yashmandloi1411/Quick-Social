import { PlatformClient, AuthTokenData, PublishResult } from "./types";

export class PlaceholderClient implements PlatformClient {
  constructor(private platform: string) {}

  getAuthUrl(state: string): string {
    return `#error=Platform ${this.platform} is coming soon!`;
  }

  async exchangeCode(code: string): Promise<AuthTokenData> {
    throw new Error(`Platform ${this.platform} is not fully implemented yet.`);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenData> {
    throw new Error(`Platform ${this.platform} is not fully implemented yet.`);
  }

  async publishPost(token: { accessToken: string }, content: string, mediaUrls?: string[]): Promise<PublishResult> {
    return { success: false, error: `Platform ${this.platform} is not fully implemented yet.` };
  }
}

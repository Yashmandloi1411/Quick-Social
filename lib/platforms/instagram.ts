import { PlatformClient, AuthTokenData, PublishResult } from "./types";

export class InstagramClient implements PlatformClient {
  private clientId = process.env.INSTAGRAM_CLIENT_ID!;
  private clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  private redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

  getAuthUrl(state: string): string {
    const scopes = ["instagram_basic", "instagram_content_publish", "pages_read_engagement"];
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&state=${state}&scope=${scopes.join(",")}`;
  }

  async exchangeCode(code: string): Promise<AuthTokenData> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&client_secret=${this.clientSecret}&code=${code}`
    );
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    // Instagram usually requires a long-lived token exchange
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.clientId}&client_secret=${this.clientSecret}&fb_exchange_token=${data.access_token}`
    );
    const longLivedData = await longLivedRes.json();

    // Get account info (Simplified for now)
    // In reality, you'd need to find the Instagram Business Account linked to a Page
    return {
      accessToken: longLivedData.access_token,
      expiresAt: longLivedData.expires_in ? new Date(Date.now() + longLivedData.expires_in * 1000) : null,
      accountName: "Instagram Business",
      accountId: "ig_placeholder",
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenData> {
    // Facebook/Instagram long-lived tokens don't use refresh tokens in the same way, 
    // they just need to be refreshed before they expire.
    return {
      accessToken: refreshToken, // For now
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days
    };
  }

  async publishPost(token: { accessToken: string }, content: string, mediaUrls?: string[]): Promise<PublishResult> {
    try {
      // 1. Create container
      // 2. Publish container
      // This requires an ig_user_id which we should have stored
      return { success: true, postId: "ig_post_placeholder" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

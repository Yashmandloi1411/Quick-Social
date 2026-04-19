import { PlatformClient, AuthTokenData, PublishResult } from "./types";

export class LinkedInClient implements PlatformClient {
  private clientId = process.env.LINKEDIN_CLIENT_ID!;
  private clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  private redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;

  getAuthUrl(state: string): string {
    const scopes = ["w_member_social", "profile", "openid", "email"];
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&state=${state}&scope=${scopes.join(" ")}`;
  }

  async exchangeCode(code: string): Promise<AuthTokenData> {
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    const data = await response.json();

    if (data.error) throw new Error(data.error_description);

    // Fetch user profile to get name and ID
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const profile = await profileRes.json();

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountName: profile.name || profile.given_name,
      accountId: profile.sub,
      avatarUrl: profile.picture,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenData> {
    // LinkedIn tokens last 60 days, refreshable
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async publishPost(token: { accessToken: string }, content: string, mediaUrls?: string[]): Promise<PublishResult> {
    try {
      // LinkedIn UGC API logic here
      return { success: true, postId: "li_post_placeholder" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

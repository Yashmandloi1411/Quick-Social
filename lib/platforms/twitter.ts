import { PlatformClient, TokenResponse, AccountMetadata, PublishResult } from "./types";

export class TwitterClient implements PlatformClient {
  private clientId = process.env.TWITTER_CLIENT_ID!;
  private clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  private redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

  getAuthUrl(state: string): string {
    const scopes = "tweet.read tweet.write users.read offline.access";
    // For simplicity in this demo, we're not using PKCE code_challenge yet, 
    // but in a real app, you should. Twitter v2 OAuth 2.0 requires PKCE.
    return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
  }

  async exchangeCode(code: string): Promise<TokenResponse & AccountMetadata> {
    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
        code_verifier: "challenge",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || "Twitter auth failed");

    // Fetch user profile
    const userResponse = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope,
      accountId: userData.data.id,
      accountName: userData.data.username,
      avatarUrl: userData.data.profile_image_url,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || "Twitter refresh failed");

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope,
    };
  }

  async publishPost(tokens: { accessToken: string }, content: string): Promise<PublishResult> {
    console.log("X/Twitter: Attempting to publish tweet...");
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ 
        text: content
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("X/Twitter Publish Error:", JSON.stringify(data, null, 2));
      return { success: false, error: data.detail || "X/Twitter publish failed" };
    }

    console.log("Twitter: Tweet published successfully! ID:", data.data.id);
    return { success: true, platformPostId: data.data.id };
  }

  async getComments(tokens: { accessToken: string }, postId: string): Promise<any> {
    // Twitter v2 search/replies logic
    return [];
  }

  async replyToComment(tokens: { accessToken: string }, commentId: string, text: string): Promise<any> {
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ 
        text,
        reply: { in_reply_to_tweet_id: commentId }
      }),
    });
    return await response.json();
  }
}

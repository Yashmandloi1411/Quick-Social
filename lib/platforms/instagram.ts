import { PlatformClient, TokenResponse, AccountMetadata, PublishResult } from "./types";

export class InstagramClient implements PlatformClient {
  private clientId = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID!;
  private clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET!;
  private redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

  getAuthUrl(state: string): string {
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "pages_read_engagement",
      "pages_show_list",
      "public_profile"
    ];
    return `https://www.facebook.com/v22.0/dialog/oauth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}&scope=${scopes.join(",")}`;
  }

  async exchangeCode(code: string): Promise<TokenResponse & AccountMetadata> {
    // 1. Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&client_secret=${this.clientSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    const userAccessToken = tokenData.access_token;

    // 2. Get user's pages and their linked IG accounts
    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=instagram_business_account{id,username,profile_picture_url},name&access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const pageWithIg = pagesData.data.find((p: any) => p.instagram_business_account);
    if (!pageWithIg) {
      throw new Error("No Instagram Business account found linked to your Facebook Pages.");
    }

    const igAccount = pageWithIg.instagram_business_account;

    return {
      accessToken: userAccessToken, // We use the user token to manage IG
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      accountId: igAccount.id,
      accountName: igAccount.username,
      avatarUrl: igAccount.profile_picture_url,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    // IG use long-lived user tokens.
    const res = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.clientId}&client_secret=${this.clientSecret}&fb_exchange_token=${refreshToken}`
    );
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async publishPost(tokens: { accessToken: string }, content: string, media?: string[], accountId?: string): Promise<PublishResult> {
    try {
      if (!media || media.length === 0) {
        return { success: false, error: "Instagram requires at least one image or video." };
      }

      const igId = accountId;
      if (!igId) throw new Error("Instagram Business Account ID is required for publishing.");

      // 1. Create Media Container
      const containerRes = await fetch(
        `https://graph.facebook.com/v22.0/${igId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: media[0],
            caption: content,
            access_token: tokens.accessToken,
          }),
        }
      );
      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);

      const creationId = containerData.id;

      // 2. Publish Media
      const publishRes = await fetch(
        `https://graph.facebook.com/v22.0/${igId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: tokens.accessToken,
          }),
        }
      );
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      return { success: true, platformPostId: publishData.id };
    } catch (error: any) {
      console.error("Instagram Publish Error:", error);
      return { success: false, error: error.message };
    }
  }

  async getComments(tokens: { accessToken: string }, accountId: string): Promise<any> {
    try {
      const mediaRes = await fetch(
        `https://graph.facebook.com/v22.0/${accountId}/media?fields=comments{id,text,username,from,timestamp}&access_token=${tokens.accessToken}`
      );
      const mediaData = await mediaRes.json();
      
      const allComments: any[] = [];
      if (mediaData.data) {
        mediaData.data.forEach((media: any) => {
          if (media.comments && media.comments.data) {
            media.comments.data.forEach((comment: any) => {
              allComments.push({
                id: comment.id,
                text: comment.text,
                username: comment.username,
                fromId: comment.from?.id || "",
                createdAt: comment.timestamp,
              });
            });
          }
        });
      }
      return allComments;
    } catch (error) {
      console.error("Instagram getComments error:", error);
      return [];
    }
  }

  async replyToComment(tokens: { accessToken: string }, commentId: string, text: string, accountId?: string): Promise<any> {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${commentId}/replies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          access_token: tokens.accessToken,
        }),
      }
    );
    return await response.json();
  }
}

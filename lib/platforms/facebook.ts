import { PlatformClient, TokenResponse, AccountMetadata, PublishResult } from "./types";

export class FacebookClient implements PlatformClient {
  private clientId = process.env.FACEBOOK_CLIENT_ID!;
  private clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
  private redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;

  getAuthUrl(state: string): string {
    const scopes = ["pages_manage_posts", "pages_manage_engagement", "pages_read_engagement", "pages_show_list", "public_profile"];
    return `https://www.facebook.com/v22.0/dialog/oauth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}&scope=${scopes.join(",")}`;
  }

  async exchangeCode(code: string): Promise<TokenResponse & AccountMetadata> {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&client_secret=${this.clientSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    const userAccessToken = tokenData.access_token;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error("No Facebook Pages found for this account.");
    }

    const page = pagesData.data[0];

    const pageInfoRes = await fetch(
      `https://graph.facebook.com/v22.0/${page.id}?fields=name,picture&access_token=${page.access_token}`
    );
    const pageInfo = await pageInfoRes.json();

    return {
      accessToken: page.access_token,
      expiresAt: undefined,
      accountId: page.id,
      accountName: pageInfo.name || page.name,
      avatarUrl: pageInfo.picture?.data?.url,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return { accessToken: refreshToken };
  }

  async publishPost(tokens: { accessToken: string }, content: string, media?: string[], accountId?: string): Promise<PublishResult> {
    try {
      const targetId = accountId || "me";
      let url = `https://graph.facebook.com/v22.0/${targetId}/feed`;
      const params = new URLSearchParams();
      params.append("access_token", tokens.accessToken);

      if (media && media.length > 0) {
        url = `https://graph.facebook.com/v22.0/${targetId}/photos`;
        params.append("url", media[0]);
        params.append("caption", content);
      } else {
        params.append("message", content);
      }

      const response = await fetch(`${url}?${params.toString()}`, {
        method: "POST",
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return { success: true, platformPostId: data.id || data.post_id };
    } catch (error: any) {
      console.error("Facebook Publish Error:", error);
      return { success: false, error: error.message };
    }
  }

  async getComments(tokens: { accessToken: string }, accountId: string): Promise<any> {
    try {
      console.log(`[AutoReply Debug] FacebookClient: Fetching posts for page ${accountId}...`);
      const postRes = await fetch(
        `https://graph.facebook.com/v22.0/${accountId}/posts?fields=id,message,created_time&limit=10&access_token=${tokens.accessToken}`
      );
      // ... rest is same

      const postData = await postRes.json();
      if (postData.error) throw new Error(postData.error.message);

      if (!postData.data) {
        console.log("[AutoReply Debug] FacebookClient: No posts found.");
        return [];
      }

      let allComments: any[] = [];

      for (const post of postData.data) {
        console.log(`[AutoReply Debug] FacebookClient: Fetching comments for post ${post.id}...`);
        const commentRes = await fetch(
          `https://graph.facebook.com/v22.0/${post.id}/comments?fields=id,message,from,created_time&access_token=${tokens.accessToken}`
        );

        const commentData = await commentRes.json();
        if (commentData.data) {
          const mapped = commentData.data.map((comment: any) => ({
            id: comment.id,
            text: comment.message,
            username: comment.from?.name || "user",
            fromId: comment.from?.id || "",
            createdAt: comment.created_time,
          }));

          allComments.push(...mapped);
        }
      }

      const unique = Array.from(
        new Map(allComments.map((c) => [c.id, c])).values()
      );

      console.log(`[AutoReply Debug] FacebookClient: Total unique comments fetched: ${unique.length}`);
      return unique;
    } catch (error) {
      console.error("[AutoReply Debug] Facebook getComments error:", error);
      return [];
    }
  }

  async replyToComment(tokens: { accessToken: string }, commentId: string, text: string, accountId?: string): Promise<any> {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/${commentId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            access_token: tokens.accessToken,
          }),
        }
      );

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      console.log("[AutoReply Debug] Facebook reply response:", data);
      return data;
    } catch (error) {
      console.error("[AutoReply Debug] Facebook replyToComment error:", error);
      throw error;
    }
  }

  async getAllPosts(tokens: { accessToken: string }, pageId: string): Promise<any[]> {
    try {
      const fields = [
        "id", "message", "created_time", "full_picture", "permalink_url",
        "likes.summary(true)", "comments{id,message,from,created_time}",
        "shares", "reactions.summary(true)"
      ].join(",");

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${pageId}/posts?fields=${fields}&limit=100&access_token=${tokens.accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.data || [];
    } catch (error) {
      console.error("[Analytics] Facebook getAllPosts error:", error);
      return [];
    }
  }

  async getPostMetrics(tokens: { accessToken: string }, postId: string, mediaType?: string): Promise<any> {
    try {
      const metricsList = [
        "post_impressions",
        "post_impressions_unique",
        "post_clicks",
        "post_negative_feedback"
      ].join(",");

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${postId}/insights?metric=${metricsList}&access_token=${tokens.accessToken}`
      );
      const data = await res.json();
      if (data.error) return { reach: 0, impressions: 0, clicks: 0, negativeActions: 0 };

      const metrics: Record<string, number> = {};
      (data.data || []).forEach((m: any) => {
        metrics[m.name] = m.values?.[0]?.value || 0;
      });

      return {
        reach: metrics["post_impressions_unique"] || 0,
        impressions: metrics["post_impressions"] || 0,
        clicks: metrics["post_clicks"] || 0,
        negativeActions: metrics["post_negative_feedback"] || 0,
      };
    } catch {
      return { reach: 0, impressions: 0, clicks: 0, negativeActions: 0 };
    }
  }
}

export const facebookClient = new FacebookClient();
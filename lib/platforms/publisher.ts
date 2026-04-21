import { db } from "@/lib/db";
import { posts, postTargets, connectedAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPlatformClient } from "@/lib/platforms/factory";

export async function executePublishing(postId: string) {
  console.log("Starting publishing for postId:", postId);
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    console.error("Post not found:", postId);
    return { success: false, error: "Post not found" };
  }

  const targets = await db.query.postTargets.findMany({
    where: eq(postTargets.postId, postId),
  });

  console.log("Found targets:", targets.length);

  let overallSuccess = true;

  for (const target of targets) {
    const account = await db.query.connectedAccounts.findFirst({
      where: eq(connectedAccounts.id, target.accountId),
    });

    if (!account) {
      await db.update(postTargets)
        .set({ status: "failed", error: "Account not found" })
        .where(eq(postTargets.id, target.id));
      overallSuccess = false;
      continue;
    }

    try {
      const client = getPlatformClient(account.platform);
      
      let accessToken = account.accessToken;
      
      // Auto-refresh if expired
      if (account.expiresAt && new Date() > new Date(account.expiresAt)) {
        console.log(`Token for ${account.platform} expired. Refreshing...`);
        if (account.refreshToken) {
          try {
            const refreshed = await client.refreshToken(account.refreshToken);
            accessToken = refreshed.accessToken;
            
            // Update the account in the DB
            await db.update(connectedAccounts)
              .set({
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken || account.refreshToken,
                expiresAt: refreshed.expiresAt,
              })
              .where(eq(connectedAccounts.id, account.id));
              
            console.log(`Token for ${account.platform} refreshed successfully.`);
          } catch (refreshError: any) {
            console.error(`Failed to refresh token for ${account.platform}:`, refreshError);
            throw new Error("Session expired. Please reconnect your account.");
          }
        } else {
          throw new Error("Session expired. Please reconnect your account.");
        }
      }

      const result = await client.publishPost(
        { accessToken },
        post.content,
        post.mediaUrls?.split(","),
        account.accountId || undefined
      );

      if (result.success) {
        await db.update(postTargets)
          .set({ status: "published" })
          .where(eq(postTargets.id, target.id));
      } else {
        await db.update(postTargets)
          .set({ status: "failed", error: result.error })
          .where(eq(postTargets.id, target.id));
        overallSuccess = false;
      }
    } catch (error: any) {
      await db.update(postTargets)
        .set({ status: "failed", error: error.message })
        .where(eq(postTargets.id, target.id));
      overallSuccess = false;
    }
  }

  await db.update(posts)
    .set({ status: overallSuccess ? "published" : "failed" })
    .where(eq(posts.id, postId));

  return { success: overallSuccess };
}

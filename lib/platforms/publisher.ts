import { connectMongo } from "@/lib/db/mongo";
import { Post, PostTarget, ConnectedAccount } from "@/lib/db/models";
import { getPlatformClient } from "@/lib/platforms/factory";

export async function executePublishing(postId: string) {
  console.log("Starting publishing for postId:", postId);
  
  await connectMongo();
  
  const post = await (Post as any).findById(postId).lean();

  if (!post) {
    console.error("Post not found:", postId);
    return { success: false, error: "Post not found" };
  }

  const targets = await (PostTarget as any).find({ postId }).lean();

  console.log("Found targets:", targets.length);

  let overallSuccess = true;

  for (const target of targets) {
    const account = await (ConnectedAccount as any).findById(target.accountId).lean();

    if (!account) {
      await (PostTarget as any).updateOne(
        { _id: target._id },
        { $set: { status: "failed", error: "Account not found" } }
      );
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
            await (ConnectedAccount as any).updateOne(
              { _id: account._id },
              {
                $set: {
                  accessToken: refreshed.accessToken,
                  refreshToken: refreshed.refreshToken || account.refreshToken,
                  expiresAt: refreshed.expiresAt,
                }
              }
            );
              
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
        console.log(`[Publish Debug] Saving platformPostId ${result.platformPostId} for target ${target._id}`);
        await (PostTarget as any).updateOne(
          { _id: target._id },
          { $set: { status: "published", platformPostId: result.platformPostId } }
        );
      } else {
        await (PostTarget as any).updateOne(
          { _id: target._id },
          { $set: { status: "failed", error: result.error } }
        );
        overallSuccess = false;
      }
    } catch (error: any) {
      await (PostTarget as any).updateOne(
        { _id: target._id },
        { $set: { status: "failed", error: error.message } }
      );
      overallSuccess = false;
    }
  }

  await (Post as any).updateOne(
    { _id: postId },
    { $set: { status: overallSuccess ? "published" : "failed" } }
  );

  return { success: overallSuccess };
}

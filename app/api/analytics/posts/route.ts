import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { platformPosts, connectedAccounts, users, postAnalytics } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const platform = searchParams.get("platform");

    // 1. Get user's connected accounts
    const userAccounts = await db.query.connectedAccounts.findMany({
      where: eq(connectedAccounts.userId, user.id),
    });
    const accountIds = userAccounts.map(a => a.id);

    if (accountIds.length === 0) return NextResponse.json([]);

    // 2. Build filter
    let filters = [inArray(platformPosts.accountId, accountIds)];
    if (accountId) filters.push(eq(platformPosts.accountId, accountId));
    if (platform) filters.push(eq(platformPosts.platform, platform));

    // 3. Fetch posts with analytics using standard joins to avoid Drizzle lateral join bugs
    const results = await db.select({
      post: platformPosts,
      analytics: postAnalytics
    })
    .from(platformPosts)
    .leftJoin(postAnalytics, eq(platformPosts.platformPostId, postAnalytics.platformPostId))
    .where(and(...filters))
    .orderBy(desc(platformPosts.publishedAt))
    .limit(50);

    // Format the response to match what the frontend expects
    const posts = results.map(row => ({
      ...row.post,
      analytics: row.analytics ? [row.analytics] : []
    }));

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error("GET /api/analytics/posts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

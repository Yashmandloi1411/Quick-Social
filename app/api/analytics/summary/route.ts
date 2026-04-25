import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { platformPosts, connectedAccounts, users, postAnalytics } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    // 1. Get user's connected accounts
    const userAccounts = await db.query.connectedAccounts.findMany({
      where: eq(connectedAccounts.userId, user.id),
    });
    const accountIds = userAccounts.map(a => a.id);

    if (accountIds.length === 0) {
      return NextResponse.json({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalReach: 0,
      });
    }

    // 2. Build filter for posts
    let filters = [inArray(platformPosts.accountId, accountIds)];
    if (accountId) filters.push(eq(platformPosts.accountId, accountId));

    // 3. Fetch all post IDs matching filter
    const posts = await db.query.platformPosts.findMany({
      where: and(...filters),
      columns: { platformPostId: true }
    });
    const platformPostIds = posts.map(p => p.platformPostId);

    if (platformPostIds.length === 0) {
      return NextResponse.json({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalReach: 0,
      });
    }

    // 4. Aggregate analytics
    // Note: Since metrics are stored as strings (text) in DB for flexibility, we cast them to numeric
    const result = await db.select({
      totalLikes: sql<number>`SUM(CAST(COALESCE(${postAnalytics.likesCount}, '0') AS INTEGER))`,
      totalComments: sql<number>`SUM(CAST(COALESCE(${postAnalytics.commentsCount}, '0') AS INTEGER))`,
      totalShares: sql<number>`SUM(CAST(COALESCE(${postAnalytics.sharesCount}, '0') AS INTEGER))`,
      totalReach: sql<number>`SUM(CAST(COALESCE(${postAnalytics.reach}, '0') AS INTEGER))`,
    })
    .from(postAnalytics)
    .where(inArray(postAnalytics.platformPostId, platformPostIds));

    const summary = result[0];

    return NextResponse.json({
      totalPosts: platformPostIds.length,
      totalLikes: summary.totalLikes || 0,
      totalComments: summary.totalComments || 0,
      totalShares: summary.totalShares || 0,
      totalReach: summary.totalReach || 0,
    });
  } catch (error: any) {
    console.error("GET /api/analytics/summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

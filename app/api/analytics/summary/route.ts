import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, ConnectedAccount, PlatformPost } from "@/lib/db/models";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();

    const user = await User.findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    // 1. Get user's connected accounts
    const userAccounts = await ConnectedAccount.find({ userId: user._id });
    const accountIds = userAccounts.map(a => a._id);

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
    let filter: any = { accountId: { $in: accountIds }, isQuickSocialOrigin: true };
    if (accountId) filter.accountId = accountId;

    // 3. Aggregate analytics directly from PlatformPost
    const result = await (PlatformPost as any).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $toInt: { $ifNull: ["$analytics.likesCount", "0"] } } },
          totalComments: { $sum: { $toInt: { $ifNull: ["$analytics.commentsCount", "0"] } } },
          totalShares: { $sum: { $toInt: { $ifNull: ["$analytics.sharesCount", "0"] } } },
          totalSaves: { $sum: { $toInt: { $ifNull: ["$analytics.savesCount", "0"] } } },
          totalClicks: { $sum: { $toInt: { $ifNull: ["$analytics.clicksCount", "0"] } } },
          totalReach: { $sum: { $toInt: { $ifNull: ["$analytics.reach", "0"] } } },
          avgEngagementRate: { $avg: "$analytics.engagementRate" },
          avgEngagementScore: { $avg: "$analytics.engagementScore" },
        }
      }
    ]);

    if (result.length === 0) {
      return NextResponse.json({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        totalClicks: 0,
        totalReach: 0,
        avgEngagementRate: 0,
        avgEngagementScore: 0,
      });
    }

    const summary = result[0];

    return NextResponse.json({
      totalPosts: summary.totalPosts,
      totalLikes: summary.totalLikes,
      totalComments: summary.totalComments,
      totalShares: summary.totalShares,
      totalSaves: summary.totalSaves,
      totalClicks: summary.totalClicks,
      totalReach: summary.totalReach,
      avgEngagementRate: summary.avgEngagementRate || 0,
      avgEngagementScore: summary.avgEngagementScore || 0,
    });
  } catch (error: any) {
    console.error("GET /api/analytics/summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

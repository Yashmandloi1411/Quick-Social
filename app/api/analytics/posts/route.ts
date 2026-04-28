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
    const platform = searchParams.get("platform");

    // 1. Get user's connected accounts
    const userAccounts = await ConnectedAccount.find({ userId: user._id });
    const accountIds = userAccounts.map(a => a._id);

    if (accountIds.length === 0) return NextResponse.json([]);

    // 2. Build filter
    let filter: any = { accountId: { $in: accountIds } };
    if (accountId) filter.accountId = accountId;
    if (platform) filter.platform = platform;

    // 3. Fetch posts with analytics
    const results = await PlatformPost.find(filter)
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean();

    // Format the response to match what the frontend expects
    const posts = results.map((row: any) => ({
      ...row,
      id: row._id,
      analytics: row.analytics ? [row.analytics] : []
    }));

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error("GET /api/analytics/posts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

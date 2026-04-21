import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPlatformClient } from "@/lib/platforms/factory";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const account = await db.query.connectedAccounts.findFirst({
      where: eq(connectedAccounts.platform, "facebook"),
    });

    if (!account) return NextResponse.json({ error: "No Facebook account connected" }, { status: 404 });

    const client = getPlatformClient("facebook");
    
    console.log("Debug API: Fetching comments for account:", account.accountId);
    const comments = await client.getComments(
      { accessToken: account.accessToken },
      account.accountId
    );

    return NextResponse.json({
      success: true,
      accountName: account.accountName,
      facebookPageId: account.accountId,
      commentsFetched: comments.length,
      sampleComments: comments.slice(0, 5),
      tokenPreview: `${account.accessToken.substring(0, 10)}...`,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

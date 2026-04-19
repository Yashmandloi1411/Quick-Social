import { NextRequest, NextResponse } from "next/server";
import { getPlatformClient } from "@/lib/platforms/factory";
import { db } from "@/lib/db";
import { connectedAccounts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = await params;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateBase64 = searchParams.get("state");

  if (!code || !stateBase64) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  try {
    const state = JSON.parse(Buffer.from(stateBase64, "base64").toString());
    const { userId: clerkId } = state;

    // Get internal user ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const client = getPlatformClient(platform);
    const tokenData = await client.exchangeCode(code);

    // Store or update the connected account
    const existing = await db.query.connectedAccounts.findFirst({
      where: and(
        eq(connectedAccounts.userId, user.id),
        eq(connectedAccounts.platform, platform)
      ),
    });

    if (existing) {
      await db.update(connectedAccounts)
        .set({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          accountName: tokenData.accountName,
          accountId: tokenData.accountId,
          avatarUrl: tokenData.avatarUrl,
          scopes: tokenData.scopes,
          status: "connected",
        })
        .where(eq(connectedAccounts.id, existing.id));
    } else {
      await db.insert(connectedAccounts).values({
        userId: user.id,
        platform,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        accountName: tokenData.accountName,
        accountId: tokenData.accountId,
        avatarUrl: tokenData.avatarUrl,
        scopes: tokenData.scopes,
        status: "connected",
      });
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/accounts?success=true`);
  } catch (error: any) {
    console.error(`Error in ${platform} callback:`, error);
    
    // Log error to file for debugging
    const fs = require('fs');
    const path = require('path');
    try {
      fs.writeFileSync(path.join(process.cwd(), 'scratch', 'auth-error.log'), error.stack || error.message);
    } catch(e) {}

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/accounts?error=${encodeURIComponent(error.message)}`);
  }
}

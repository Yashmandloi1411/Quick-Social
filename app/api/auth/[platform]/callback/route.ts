import { NextRequest, NextResponse } from "next/server";
import { getPlatformClient } from "@/lib/platforms/factory";
import { connectMongo } from "@/lib/db/mongo";
import { User, ConnectedAccount } from "@/lib/db/models";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateBase64 = searchParams.get("state");

  if (!code || !stateBase64) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  try {
    await connectMongo();
    const state = JSON.parse(Buffer.from(stateBase64, "base64").toString());
    const { userId: clerkId } = state;

    // Get internal user ID
    const user = await (User as any).findOne({ clerkId });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const client = getPlatformClient(platform);
    const tokenData = await client.exchangeCode(code);

    // Store or update the connected account
    const existing = await (ConnectedAccount as any).findOne({
      userId: user._id,
      platform,
    });

    if (existing) {
      await (ConnectedAccount as any).updateOne(
        { _id: existing._id },
        {
          $set: {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresAt: tokenData.expiresAt,
            accountName: tokenData.accountName,
            accountId: tokenData.accountId,
            avatarUrl: tokenData.avatarUrl,
            scopes: tokenData.scopes,
            status: "connected",
          }
        }
      );
    } else {
      await (ConnectedAccount as any).create({
        _id: uuidv4(),
        userId: user._id,
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

import { NextRequest, NextResponse } from "next/server";
import { getPlatformClient } from "@/lib/platforms/factory";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { platform } = await params;
  
  try {
    const client = getPlatformClient(platform);
    // In a real app, generate a secure random state and store it (e.g., in a cookie or DB)
    const state = JSON.stringify({ userId, platform });
    const authUrl = client.getAuthUrl(Buffer.from(state).toString("base64"));
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error(`Error initiating auth for ${platform}:`, error);
    return new NextResponse(`Error: ${error.message}`, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { inngest } from "@/lib/inngest/client";
import { connectMongo } from "@/lib/db/mongo";
import { User } from "@/lib/db/models";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();

    const user = await (User as any).findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { accountId } = body;

    await inngest.send({
      name: "analytics/sync",
      data: { accountId },
    });

    return NextResponse.json({ success: true, message: "Sync triggered" });
  } catch (error: any) {
    console.error("POST /api/analytics/sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { postComments, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id: platformPostId } = await params;

    const comments = await db.query.postComments.findMany({
      where: eq(postComments.platformPostId, platformPostId),
      orderBy: [desc(postComments.commentedAt)],
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error("GET /api/analytics/comments error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

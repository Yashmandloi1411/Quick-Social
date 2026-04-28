import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, PostComment } from "@/lib/db/models";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();

    const user = await User.findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id: platformPostId } = await params;

    const comments = await PostComment.find({ platformPostId })
      .sort({ commentedAt: -1 })
      .lean();

    const formattedComments = comments.map((c: any) => ({
      ...c,
      id: c._id
    }));

    return NextResponse.json(formattedComments);
  } catch (error: any) {
    console.error("GET /api/analytics/comments error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

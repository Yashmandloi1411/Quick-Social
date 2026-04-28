import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, Post } from "@/lib/db/models";
import { inngest } from "@/lib/inngest/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectMongo();

    const user = await (User as any).findOne({ clerkId });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();
    const { scheduledFor } = body;

    if (!scheduledFor) {
      return new NextResponse("Missing scheduledFor", { status: 400 });
    }

    // Update the post in the database
    const updatedPost = await (Post as any).findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        $set: {
          scheduledFor: new Date(scheduledFor),
          status: "scheduled",
        }
      },
      { new: true }
    ).lean();

    if (!updatedPost) {
      return new NextResponse("Post not found or unauthorized", { status: 404 });
    }

    // Schedule a new Inngest job for the new time
    // The old job will check the DB timestamp and exit if it doesn't match
    await inngest.send({
      name: "post/publish",
      data: { postId: updatedPost._id },
      ts: new Date(scheduledFor).getTime(),
    });

    return NextResponse.json({ ...updatedPost, id: updatedPost._id });
  } catch (error: any) {
    console.error("Reschedule API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

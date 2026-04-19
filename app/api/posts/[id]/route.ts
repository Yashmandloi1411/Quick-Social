import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { id } = params;
    const body = await req.json();
    const { scheduledFor } = body;

    if (!scheduledFor) {
      return new NextResponse("Missing scheduledFor", { status: 400 });
    }

    // Update the post in the database
    const [updatedPost] = await db
      .update(posts)
      .set({
        scheduledFor: new Date(scheduledFor),
        status: "scheduled",
      })
      .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
      .returning();

    if (!updatedPost) {
      return new NextResponse("Post not found or unauthorized", { status: 404 });
    }

    // Schedule a new Inngest job for the new time
    // The old job will check the DB timestamp and exit if it doesn't match
    await inngest.send({
      name: "post/publish",
      data: { postId: updatedPost.id },
      ts: new Date(scheduledFor).getTime(),
    });

    return NextResponse.json(updatedPost);
  } catch (error: any) {
    console.error("Reschedule API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

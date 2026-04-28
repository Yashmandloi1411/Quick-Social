import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, Post, PostTarget } from "@/lib/db/models";
import { v4 as uuidv4 } from "uuid";

import { inngest } from "@/lib/inngest/client";
import { executePublishing } from "@/lib/platforms/publisher";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  await connectMongo();

  const user = await (User as any).findOne({ clerkId });

  if (!user) return new NextResponse("User not found", { status: 404 });

  try {
    const { content, accountIds, scheduledFor, mediaUrls, status } = await req.json();

    const postId = uuidv4();
    const newPost = await (Post as any).create({
      _id: postId,
      userId: user._id,
      content,
      status, // 'draft', 'scheduled', 'published'
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      mediaUrls: mediaUrls?.join(","),
    });

    const targetPromises = accountIds.map((accountId: string) => 
      (PostTarget as any).create({
        _id: uuidv4(),
        postId: newPost._id,
        accountId,
        status: "pending",
      })
    );
    await Promise.all(targetPromises);

    if (status === "scheduled" && scheduledFor) {
      await inngest.send({
        name: "post/publish",
        data: { postId: newPost._id },
        ts: new Date(scheduledFor).getTime(),
      });
      return NextResponse.json({ ...newPost.toObject(), id: newPost._id });
    } else if (status === "published") {
      // Direct publishing for "Publish Now"
      const result = await executePublishing(newPost._id);
      if (!result.success) {
        return NextResponse.json({ error: "Failed to publish to one or more platforms. Check your platform credits." }, { status: 500 });
      }
      return NextResponse.json({ ...newPost.toObject(), id: newPost._id });
    }

    return NextResponse.json({ ...newPost.toObject(), id: newPost._id });
  } catch (error: any) {
    console.error("Post creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, postTargets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { inngest } from "@/lib/inngest/client";
import { executePublishing } from "@/lib/platforms/publisher";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) return new NextResponse("User not found", { status: 404 });

  try {
    const { content, accountIds, scheduledFor, mediaUrls, status } = await req.json();

    const [newPost] = await db.insert(posts).values({
      userId: user.id,
      content,
      status, // 'draft', 'scheduled', 'published'
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      mediaUrls: mediaUrls?.join(","),
    }).returning();

    const targetPromises = accountIds.map((accountId: string) => 
      db.insert(postTargets).values({
        postId: newPost.id,
        accountId,
        status: "pending",
      })
    );
    await Promise.all(targetPromises);

    if (status === "scheduled" && scheduledFor) {
      await inngest.send({
        name: "post/publish",
        data: { postId: newPost.id },
        ts: new Date(scheduledFor).getTime(),
      });
      return NextResponse.json(newPost);
    } else if (status === "published") {
      // Direct publishing for "Publish Now"
      const result = await executePublishing(newPost.id);
      if (!result.success) {
        return NextResponse.json({ error: "Failed to publish to one or more platforms. Check your platform credits." }, { status: 500 });
      }
      return NextResponse.json(newPost);
    }

    return NextResponse.json(newPost);
  } catch (error: any) {
    console.error("Post creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}

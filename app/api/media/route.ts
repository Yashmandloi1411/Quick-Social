import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { imagekit } from "@/lib/imagekit";
import { db } from "@/lib/db";
import { mediaAssets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) return new NextResponse("User not found", { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return new NextResponse("No file provided", { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: file.name,
      folder: `/users/${user.id}/posts`,
    });

    const [asset] = await db.insert(mediaAssets).values({
      userId: user.id,
      url: uploadResponse.url,
      publicId: uploadResponse.fileId,
      type: file.type.startsWith("video") ? "video" : "image",
    }).returning();

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

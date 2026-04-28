import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { imagekit } from "@/lib/imagekit";
import { connectMongo } from "@/lib/db/mongo";
import { User, MediaAsset } from "@/lib/db/models";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  await connectMongo();

  const user = await (User as any).findOne({ clerkId });

  if (!user) return new NextResponse("User not found", { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return new NextResponse("No file provided", { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: file.name,
      folder: `/users/${user._id}/posts`,
    });

    const asset = await (MediaAsset as any).create({
      _id: uuidv4(),
      userId: user._id,
      url: uploadResponse.url,
      publicId: uploadResponse.fileId,
      type: file.type.startsWith("video") ? "video" : "image",
    });

    return NextResponse.json({ ...asset.toObject(), id: asset._id });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

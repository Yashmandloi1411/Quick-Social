import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, AutoReplyRule, AutoReplyLog } from "@/lib/db/models";

// PATCH — toggle isActive or update rule fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();
    const user = await User.findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;
    const body = await req.json();

    const updated = await AutoReplyRule.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: body },
      { new: true }
    ).lean();

    if (!updated) return new NextResponse("Rule not found", { status: 404 });

    return NextResponse.json({ ...updated, id: updated._id });
  } catch (error: any) {
    console.error("Auto-reply PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove a rule and its logs
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();
    const user = await User.findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;

    // Delete logs first
    await AutoReplyLog.deleteMany({ ruleId: id });

    // Delete the rule
    await AutoReplyRule.deleteOne({ _id: id, userId: user._id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Auto-reply DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

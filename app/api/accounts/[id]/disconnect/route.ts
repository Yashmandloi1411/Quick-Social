import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, ConnectedAccount, PostTarget, AutoReplyRule, AutoReplyLog } from "@/lib/db/models";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;
  const { userId: clerkId } = await auth();
  console.log("Disconnect: Request for accountId:", accountId, "from clerkId:", clerkId);
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  await connectMongo();

  const user = await User.findOne({ clerkId });

  if (!user) return new NextResponse("User not found", { status: 404 });

  try {
    // 1. Delete auto-reply logs for rules belonging to this account
    const rules = await AutoReplyRule.find({ accountId });
    const ruleIds = rules.map(r => r._id);
    
    if (ruleIds.length > 0) {
      await AutoReplyLog.deleteMany({ ruleId: { $in: ruleIds } });
      await AutoReplyRule.deleteMany({ accountId });
    }

    // 2. Delete post targets
    await PostTarget.deleteMany({ accountId });

    // 3. Delete the account itself
    await ConnectedAccount.deleteOne({ _id: accountId, userId: user._id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[Disconnect Error] Failed for account ${accountId}:`, error);
    return NextResponse.json({ 
      error: error.message,
      detail: error.stack 
    }, { status: 500 });
  }
}

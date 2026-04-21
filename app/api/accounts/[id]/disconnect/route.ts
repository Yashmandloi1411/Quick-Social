import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { connectedAccounts, users, postTargets, autoReplyRules, autoReplyLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;
  const { userId: clerkId } = await auth();
  console.log("Disconnect: Request for accountId:", accountId, "from clerkId:", clerkId);
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) return new NextResponse("User not found", { status: 404 });

  try {
    // 1. Delete auto-reply logs for rules belonging to this account
    const rules = await db.query.autoReplyRules.findMany({
      where: eq(autoReplyRules.accountId, accountId),
    });
    const ruleIds = rules.map(r => r.id);
    
    if (ruleIds.length > 0) {
      for (const ruleId of ruleIds) {
        await db.delete(autoReplyLogs).where(eq(autoReplyLogs.ruleId, ruleId));
      }
      await db.delete(autoReplyRules).where(eq(autoReplyRules.accountId, accountId));
    }

    // 2. Delete post targets
    await db.delete(postTargets).where(eq(postTargets.accountId, accountId));

    // 3. Delete the account itself
    await db.delete(connectedAccounts).where(
      and(
        eq(connectedAccounts.id, accountId),
        eq(connectedAccounts.userId, user.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[Disconnect Error] Failed for account ${accountId}:`, error);
    return NextResponse.json({ 
      error: error.message,
      detail: error.stack 
    }, { status: 500 });
  }
}


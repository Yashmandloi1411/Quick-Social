import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { autoReplyRules, autoReplyLogs, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH — toggle isActive or update rule fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(autoReplyRules)
      .set(body)
      .where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id)))
      .returning();

    if (!updated) return new NextResponse("Rule not found", { status: 404 });

    return NextResponse.json(updated);
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

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;

    // Delete logs first (FK constraint)
    await db.delete(autoReplyLogs).where(eq(autoReplyLogs.ruleId, id));

    // Delete the rule
    await db
      .delete(autoReplyRules)
      .where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Auto-reply DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

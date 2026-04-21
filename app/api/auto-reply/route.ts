import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { autoReplyRules, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET — list all rules for the current user
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const rules = await db.query.autoReplyRules.findMany({
      where: eq(autoReplyRules.userId, user.id),
      with: {
        account: true,
        logs: {
          orderBy: (logs, { desc }) => [desc(logs.appliedAt)],
          limit: 20,
        },
      },
    });

    return NextResponse.json(rules);
  } catch (error: any) {
    console.error("Auto-reply GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create a new rule
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (!user) return new NextResponse("User not found", { status: 404 });

    // Plan limit: Free = 1 rule
    const existingRules = await db.query.autoReplyRules.findMany({
      where: eq(autoReplyRules.userId, user.id),
    });

    /* 
    if (user.plan === "free" && existingRules.length >= 1) {
      return NextResponse.json(
        { error: "Free plan is limited to 1 auto-reply rule. Upgrade to Pro for more." },
        { status: 403 }
      );
    }
    */

    const body = await req.json();
    const { accountId, triggerType, triggerKeywords, useAi, aiPrompt, replyTemplate } = body;

    if (!accountId || !triggerType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [newRule] = await db
      .insert(autoReplyRules)
      .values({
        userId: user.id,
        accountId,
        triggerType,
        triggerKeywords: triggerKeywords || null,
        useAi: useAi ?? false,
        aiPrompt: aiPrompt || null,
        replyTemplate: replyTemplate || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newRule, { status: 201 });
  } catch (error: any) {
    console.error("Auto-reply POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

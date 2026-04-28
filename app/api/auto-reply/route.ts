import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, AutoReplyRule } from "@/lib/db/models";
import { v4 as uuidv4 } from "uuid";

// GET — list all rules for the current user
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();

    const user = await User.findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const rules = await AutoReplyRule.aggregate([
      { $match: { userId: user._id } },
      {
        $lookup: {
          from: "connectedaccounts",
          localField: "accountId",
          foreignField: "_id",
          as: "account"
        }
      },
      { $unwind: "$account" },
      {
        $lookup: {
          from: "autoreplylogs",
          localField: "_id",
          foreignField: "ruleId",
          pipeline: [
            { $sort: { appliedAt: -1 } },
            { $limit: 20 }
          ],
          as: "logs"
        }
      }
    ]);

    // Map `_id` back to `id` for frontend consistency
    const formattedRules = rules.map((r: any) => ({
      ...r,
      id: r._id,
      account: { ...r.account, id: r.account._id },
      logs: r.logs.map((l: any) => ({ ...l, id: l._id }))
    }));

    return NextResponse.json(formattedRules);
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

    await connectMongo();

    const user = await User.findOne({ clerkId });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const body = await req.json();
    const { accountId, triggerType, triggerKeywords, useAi, aiPrompt, replyTemplate } = body;

    if (!accountId || !triggerType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newRule = await AutoReplyRule.create({
      _id: uuidv4(),
      userId: user._id,
      accountId,
      triggerType,
      triggerKeywords: triggerKeywords || null,
      useAi: useAi ?? false,
      aiPrompt: aiPrompt || null,
      replyTemplate: replyTemplate || null,
      isActive: true,
    });

    return NextResponse.json({ ...newRule.toObject(), id: newRule._id }, { status: 201 });
  } catch (error: any) {
    console.error("Auto-reply POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

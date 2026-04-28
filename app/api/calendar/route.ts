import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, Post } from "@/lib/db/models";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectMongo();

    const user = await (User as any).findOne({ clerkId });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month"); // e.g., '2025-01'

    let startDate, endDate;
    if (monthStr) {
      const date = parseISO(`${monthStr}-01`);
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    } else {
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    const calendarPosts = await (Post as any).aggregate([
      {
        $match: {
          userId: user._id,
          scheduledFor: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: "posttargets",
          localField: "_id",
          foreignField: "postId",
          as: "targets"
        }
      },
      {
        $unwind: { path: "$targets", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "connectedaccounts",
          localField: "targets.accountId",
          foreignField: "_id",
          as: "targets.account"
        }
      },
      {
        $unwind: { path: "$targets.account", preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: "$_id",
          post: { $first: "$$ROOT" },
          targets: { $push: "$targets" }
        }
      },
      {
        $project: {
          _id: 1,
          userId: "$post.userId",
          content: "$post.content",
          status: "$post.status",
          scheduledFor: "$post.scheduledFor",
          mediaUrls: "$post.mediaUrls",
          createdAt: "$post.createdAt",
          targets: {
            $filter: {
              input: "$targets",
              as: "t",
              cond: { $ne: ["$$t._id", null] }
            }
          }
        }
      }
    ]);

    // Format result to include 'id' instead of '_id' for compatibility
    const formattedPosts = calendarPosts.map((p: any) => ({
      ...p,
      id: p._id,
      targets: p.targets.map((t: any) => ({
        ...t,
        id: t._id,
        account: t.account ? { ...t.account, id: t.account._id } : null
      }))
    }));

    return NextResponse.json(formattedPosts);
  } catch (error: any) {
    console.error("Calendar API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

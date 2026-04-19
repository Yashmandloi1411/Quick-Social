import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

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

    const calendarPosts = await db.query.posts.findMany({
      where: and(
        eq(posts.userId, user.id),
        gte(posts.scheduledFor, startDate),
        lte(posts.scheduledFor, endDate)
      ),
      with: {
        targets: {
          with: {
            account: true,
          },
        },
      },
    });

    return NextResponse.json(calendarPosts);
  } catch (error: any) {
    console.error("Calendar API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

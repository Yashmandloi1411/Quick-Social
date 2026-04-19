import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { connectedAccounts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) return new NextResponse("User not found", { status: 404 });

    const accounts = await db.query.connectedAccounts.findMany({
      where: eq(connectedAccounts.userId, user.id),
    });

    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

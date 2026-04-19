import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { connectedAccounts, users, postTargets } from "@/lib/db/schema";
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
    // Delete targets first to avoid foreign key constraints
    await db.delete(postTargets).where(eq(postTargets.accountId, accountId));

    await db.delete(connectedAccounts).where(
      and(
        eq(connectedAccounts.id, accountId),
        eq(connectedAccounts.userId, user.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

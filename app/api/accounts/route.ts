import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectMongo } from "@/lib/db/mongo";
import { User, ConnectedAccount } from "@/lib/db/models";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    await connectMongo();

    const user = await User.findOne({ clerkId });

    if (!user) return new NextResponse("User not found", { status: 404 });

    const accounts = await ConnectedAccount.find({ userId: user._id }).lean();

    const formattedAccounts = accounts.map((a: any) => ({
      ...a,
      id: a._id
    }));

    return NextResponse.json(formattedAccounts);
  } catch (error: any) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

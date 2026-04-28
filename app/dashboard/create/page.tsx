import { connectMongo } from "@/lib/db/mongo";
import { User, ConnectedAccount } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { ComposerClient } from "./composer-client";

export default async function CreatePostPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await connectMongo();

  const user = await (User as any).findOne({ clerkId });

  if (!user) return null;

  const accounts = await (ConnectedAccount as any).find({
    userId: user._id,
  }).lean();

  // Format accounts for compatibility
  const formattedAccounts = accounts.map((a: any) => ({
    ...a,
    id: a._id
  }));

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Create Post</h2>
        <p className="text-zinc-500">Draft, schedule, and publish your content across platforms.</p>
      </div>
      <ComposerClient initialAccounts={formattedAccounts} />
    </div>
  );
}

import { db } from "@/lib/db";
import { connectedAccounts, users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { ComposerClient } from "./composer-client";

export default async function CreatePostPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) return null;

  const accounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.userId, user.id),
  });

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Create Post</h2>
        <p className="text-zinc-500">Draft, schedule, and publish your content across platforms.</p>
      </div>
      <ComposerClient initialAccounts={accounts} />
    </div>
  );
}

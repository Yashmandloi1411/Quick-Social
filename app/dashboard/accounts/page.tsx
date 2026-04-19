import { db } from "@/lib/db";
import { connectedAccounts, users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TwitterIcon, 
  InstagramIcon, 
  Facebook01Icon, 
  YoutubeIcon, 
  Linkedin01Icon, 
  PinterestIcon, 
  TiktokIcon, 
  DiscordIcon, 
  SlackIcon,
  Link01Icon
} from "hugeicons-react";
import Link from "next/link";
import { DisconnectButton } from "./account-card-client";

const PLATFORMS = [
  { id: "twitter", name: "Twitter / X", icon: TwitterIcon, color: "bg-black text-white" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin01Icon, color: "bg-blue-700 text-white" },
  { id: "instagram", name: "Instagram", icon: InstagramIcon, color: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white" },
  { id: "youtube", name: "YouTube", icon: YoutubeIcon, color: "bg-red-600 text-white" },
  { id: "tiktok", name: "TikTok", icon: TiktokIcon, color: "bg-black text-white" },
  { id: "facebook", name: "Facebook", icon: Facebook01Icon, color: "bg-blue-600 text-white" },
  { id: "pinterest", name: "Pinterest", icon: PinterestIcon, color: "bg-red-700 text-white" },
  { id: "discord", name: "Discord", icon: DiscordIcon, color: "bg-indigo-600 text-white" },
  { id: "slack", name: "Slack", icon: SlackIcon, color: "bg-purple-600 text-white" },
];

export default async function AccountsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    const [newUser] = await db.insert(users).values({
      clerkId: clerkId,
      email: "user@example.com",
    }).returning();
    user = newUser;
  }

  const accounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.userId, user.id),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Connected Accounts</h2>
        <p className="text-zinc-500 text-sm">Manage your social media profiles and connections.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connectedAccount = accounts.find(a => a.platform.toLowerCase() === platform.id);
          const Icon = platform.icon;

          return (
            <Card key={platform.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center shadow-sm`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{platform.name}</CardTitle>
                </div>
                {connectedAccount && (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-[10px] h-5">
                    Connected
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedAccount ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={connectedAccount.avatarUrl || ""} />
                      <AvatarFallback>{connectedAccount.accountName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{connectedAccount.accountName}</p>
                      <p className="text-[10px] text-zinc-500">Connected</p>
                    </div>
                    <DisconnectButton accountId={connectedAccount.id} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <p className="text-xs text-zinc-500">No account connected</p>
                    <Link href={`/api/auth/${platform.id}`} className="w-full">
                      <Button variant="outline" className="w-full gap-2 text-xs h-9 border-zinc-200 dark:border-zinc-800">
                        <Link01Icon size={14} />
                        Connect
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

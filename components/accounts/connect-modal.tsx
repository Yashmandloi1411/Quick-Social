"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { 
  TwitterIcon, 
  InstagramIcon, 
  Facebook01Icon, 
  YoutubeIcon, 
  Linkedin01Icon, 
  PinterestIcon, 
  TiktokIcon, 
  DiscordIcon, 
  SlackIcon 
} from "hugeicons-react";

const PLATFORMS = [
  { id: "twitter", name: "Twitter / X", icon: TwitterIcon, color: "bg-black text-white" },
  { id: "instagram", name: "Instagram", icon: InstagramIcon, color: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white" },
  { id: "facebook", name: "Facebook", icon: Facebook01Icon, color: "bg-blue-600 text-white" },
  { id: "youtube", name: "YouTube", icon: YoutubeIcon, color: "bg-red-600 text-white" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin01Icon, color: "bg-blue-700 text-white" },
  { id: "pinterest", name: "Pinterest", icon: PinterestIcon, color: "bg-red-700 text-white" },
  { id: "tiktok", name: "TikTok", icon: TiktokIcon, color: "bg-black text-white" },
  { id: "discord", name: "Discord", icon: DiscordIcon, color: "bg-indigo-600 text-white" },
  { id: "slack", name: "Slack", icon: SlackIcon, color: "bg-purple-600 text-white" },
];

export function ConnectAccountModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = (platformId: string) => {
    // Redirect to our initiation route
    window.location.href = `/api/auth/${platformId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Connect New Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Social Account</DialogTitle>
          <DialogDescription>
            Choose a platform to connect your account and start scheduling posts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handleConnect(platform.id)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                <platform.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-center">{platform.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

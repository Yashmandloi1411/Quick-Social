"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  X, 
  Image as ImageIcon, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  Send, 
  ChevronRight,
  Monitor,
  Smartphone
} from "lucide-react";
import { 
  TwitterIcon, 
  InstagramIcon, 
  Facebook01Icon, 
  YoutubeIcon, 
  Linkedin01Icon, 
  TiktokIcon,
  PinterestIcon
} from "hugeicons-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, any> = {
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  facebook: Facebook01Icon,
  youtube: YoutubeIcon,
  linkedin: Linkedin01Icon,
  tiktok: TiktokIcon,
  pinterest: PinterestIcon,
};

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
  facebook: 63206,
};

export function ComposerClient({ initialAccounts }: { initialAccounts: any[] }) {
  const [content, setContent] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleAICompose = async () => {
    if (!content && selectedAccounts.length === 0) return;
    console.log("Starting AI Compose with content:", content, "and selected accounts:", selectedAccounts);
    setIsGeneratingAI(true);
    try {
      const platforms = Array.from(new Set(
        initialAccounts
          .filter(a => selectedAccounts.includes(a.id))
          .map(a => a.platform)
      ));
      
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content || "Write a catchy social media post about tech tools.", platforms }),
      });
      const data = await res.json();
      if (res.ok) {
        setContent(data.text);
        toast.success("AI Caption generated!");
      } else {
        toast.error(data.error || "Failed to generate caption");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during AI generation");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = await res.json();
      setMedia(prev => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (status: "published" | "scheduled") => {
    console.log("Submitting post with status:", status);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          accountIds: selectedAccounts,
          mediaUrls: media.map(m => m.url),
          scheduledFor: status === "scheduled" ? scheduledDate : null,
          status,
        }),
      });
      if (res.ok) {
        toast.success(status === "published" ? "Post published successfully!" : "Post scheduled!");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit post");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while submitting post");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
      {/* Left Panel: Composer */}
      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* Platform Selection */}
        <section className="space-y-3">
          <Label className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Select Accounts</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {initialAccounts.map(account => {
              const Icon = PLATFORM_ICONS[account.platform.toLowerCase()] || TwitterIcon;
              const isSelected = selectedAccounts.includes(account.id);
              return (
                <button
                  key={account.id}
                  onClick={() => toggleAccount(account.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                    ${isSelected 
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/10 ring-1 ring-purple-600' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'}
                  `}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={account.avatarUrl || ""} />
                      <AvatarFallback>{account.accountName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
                      <Icon size={12} className={isSelected ? 'text-purple-600' : 'text-zinc-500'} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{account.accountName}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{account.platform}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Content Editor */}
        <Card className="border-none shadow-none bg-zinc-100/50 dark:bg-zinc-900/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
             <Label className="text-sm font-semibold">Content</Label>
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 gap-2 h-8"
               onClick={handleAICompose}
               disabled={isGeneratingAI}
             >
               <Sparkles size={14} />
               {isGeneratingAI ? "Generating..." : "AI Caption"}
             </Button>
          </div>
          <Textarea 
            placeholder="What's on your mind?" 
            className="min-h-[200px] bg-transparent border-none focus-visible:ring-0 text-base resize-none p-0"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          
          {/* Character Counters */}
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedAccounts.map(id => {
              const account = initialAccounts.find(a => a.id === id);
              if (!account) return null;
              const limit = PLATFORM_LIMITS[account.platform.toLowerCase()] || 0;
              const isOver = limit > 0 && (content?.length || 0) > limit;
              return (
                <Badge key={id} variant="outline" className={`text-[10px] py-0 px-2 font-normal ${isOver ? 'border-red-500 text-red-500' : ''}`}>
                  {account.platform}: {(content?.length || 0)}{limit > 0 ? `/${limit}` : ''}
                </Badge>
              );
            })}
          </div>
        </Card>

        {/* Media Upload */}
        <section className="space-y-3">
          <Label className="text-sm font-semibold">Media</Label>
          <div className="flex flex-wrap gap-3">
            {media.map((item, index) => (
              <div key={index} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <img src={item.url} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setMedia(prev => prev.filter((_, i) => i !== index))}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-purple-500 cursor-pointer transition-colors bg-white dark:bg-zinc-900">
              <ImageIcon className="w-6 h-6 text-zinc-400 mb-1" />
              <span className="text-[10px] text-zinc-500 font-medium">Add Media</span>
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </section>

        {/* Scheduling */}
        <Card className="p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-zinc-500" />
              <Label className="font-semibold">Schedule this post</Label>
            </div>
            <Switch checked={isScheduling} onCheckedChange={setIsScheduling} />
          </div>
          {isScheduling && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Publish Date & Time</Label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-sm"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 pb-8">
          <Button variant="outline" className="flex-1">Save as Draft</Button>
          <Button 
            className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white gap-2"
            disabled={selectedAccounts.length === 0 || !content}
            onClick={() => handleSubmit(isScheduling ? "scheduled" : "published")}
          >
            {isScheduling ? (
              <><Clock size={18} /> Schedule Post</>
            ) : (
              <><Send size={18} /> Publish Now</>
            )}
          </Button>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="hidden lg:flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0f] sticky top-0 h-full">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor size={18} className={previewDevice === 'desktop' ? 'text-purple-600' : 'text-zinc-400'} onClick={() => setPreviewDevice('desktop')} />
            <Smartphone size={18} className={previewDevice === 'mobile' ? 'text-purple-600' : 'text-zinc-400'} onClick={() => setPreviewDevice('mobile')} />
            <span className="text-sm font-semibold ml-2">Preview</span>
          </div>
          <Badge variant="secondary" className="font-normal">Real-time</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-zinc-50 dark:bg-[#050505]">
          {selectedAccounts.length === 0 ? (
            <div className="text-center mt-20 text-zinc-500">
              <p className="text-sm">Select an account to see the preview.</p>
            </div>
          ) : (
            <div className={`transition-all duration-300 ${previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-[550px]'}`}>
              <Tabs defaultValue={selectedAccounts[0]}>
                <TabsList className="bg-transparent h-auto p-0 gap-4 mb-6 overflow-x-auto flex justify-start border-none">
                  {selectedAccounts.map(id => {
                    const account = initialAccounts.find(a => a.id === id);
                    const Icon = PLATFORM_ICONS[account.platform.toLowerCase()] || TwitterIcon;
                    return (
                      <TabsTrigger 
                        key={id} 
                        value={id} 
                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-white p-2 rounded-full border border-zinc-200 dark:border-zinc-800 transition-all"
                      >
                        <Icon size={16} />
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {selectedAccounts.map(id => {
                  const account = initialAccounts.find(a => a.id === id);
                  return (
                    <TabsContent key={id} value={id}>
                      <MockPostCard platform={account.platform} content={content} media={media} account={account} />
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MockPostCard({ platform, content, media, account }: any) {
  return (
    <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={account.avatarUrl} />
          <AvatarFallback>{account.accountName?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-sm font-bold">{account.accountName}</CardTitle>
          <CardDescription className="text-[10px]">@{account.accountName.toLowerCase()} • Just now</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <p className="text-sm whitespace-pre-wrap">{content || "Post content will appear here..."}</p>
        {media.length > 0 && (
          <div className="grid grid-cols-1 gap-2 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
            {media.map((item: any, i: number) => (
              <img key={i} src={item.url} className="w-full object-cover max-h-[400px]" />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
           <div className="flex gap-4">
              <div className="h-2 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              <div className="h-2 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              <div className="h-2 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
           </div>
           <div className="h-2 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

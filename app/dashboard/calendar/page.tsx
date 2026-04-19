"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit,
  Copy,
  Share2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostTarget = {
  id: string;
  status: string;
  error: string | null;
  account: {
    id: string;
    platform: string;
    accountName: string | null;
    avatarUrl: string | null;
  };
};

type CalendarPost = {
  id: string;
  content: string;
  status: string;
  scheduledFor: string | null;
  mediaUrls: string | null;
  targets: PostTarget[];
};

// ─── Platform helpers ─────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  twitter: {
    color: "text-sky-400",
    bg: "bg-sky-500",
    icon: <Share2 className="w-3 h-3" />,
    label: "Twitter / X",
  },
  instagram: {
    color: "text-pink-400",
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    icon: <Share2 className="w-3 h-3" />,
    label: "Instagram",
  },
  facebook: {
    color: "text-blue-400",
    bg: "bg-blue-600",
    icon: <Share2 className="w-3 h-3" />,
    label: "Facebook",
  },
};

const getPlatform = (platform: string) =>
  PLATFORM_CONFIG[platform] ?? {
    color: "text-zinc-400",
    bg: "bg-zinc-500",
    icon: null,
    label: platform,
  };

const STATUS_BADGE: Record<string, string> = {
  published: "bg-green-500/20 text-green-400 border-green-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

// ─── Post Pill ────────────────────────────────────────────────────────────────

function PostPill({
  post,
  onClick,
  onDragStart,
}: {
  post: CalendarPost;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const platforms = post.targets.map((t) => t.account.platform);
  const first = platforms[0] ?? "twitter";
  const config = getPlatform(first);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-grab active:cursor-grabbing
        text-xs font-medium text-white truncate max-w-full
        ${config.bg} opacity-90 hover:opacity-100 transition-all
        hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
        select-none
      `}
      title={post.content}
    >
      <span className="shrink-0">{config.icon}</span>
      <span className="truncate">{post.content}</span>
      {platforms.length > 1 && (
        <span className="ml-auto shrink-0 bg-white/20 rounded-full px-1 text-[10px]">
          +{platforms.length - 1}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Build calendar grid: full weeks from start of month to end
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch posts for the current month
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const month = format(currentDate, "yyyy-MM");
      const res = await fetch(`/api/calendar?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error("Failed to fetch calendar posts:", e);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Group posts by day key (YYYY-MM-DD)
  const postsByDay: Record<string, CalendarPost[]> = {};
  for (const post of posts) {
    if (!post.scheduledFor) continue;
    const dayKey = format(parseISO(post.scheduledFor), "yyyy-MM-dd");
    if (!postsByDay[dayKey]) postsByDay[dayKey] = [];
    postsByDay[dayKey].push(post);
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayKey);
  };

  const handleDrop = async (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    if (!draggedPostId) return;

    const post = posts.find((p) => p.id === draggedPostId);
    if (!post || !post.scheduledFor) return;

    const oldDate = parseISO(post.scheduledFor);
    const newDate = new Date(day);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === draggedPostId ? { ...p, scheduledFor: newDate.toISOString() } : p
      )
    );

    // Persist to API
    try {
      await fetch(`/api/posts/${draggedPostId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: newDate.toISOString() }),
      });
    } catch {
      // Rollback on failure
      fetchPosts();
    }

    setDraggedPostId(null);
  };

  const handleDragEnd = () => {
    setDraggedPostId(null);
    setDragOverDay(null);
  };

  // ── Delete & Duplicate ───────────────────────────────────────────────────────

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    // For now, just close sheet and refresh — delete API can be added later
    setSelectedPost(null);
    fetchPosts();
  };

  const handleClickDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    router.push(`/dashboard/create?date=${dateStr}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-zinc-500 text-sm">Visualize and manage your scheduled content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-base font-semibold min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="ml-1"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#111118]">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {weekDays.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className="grid grid-cols-7"
          style={{ gridAutoRows: "minmax(110px, 1fr)" }}
        >
          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDay[dayKey] ?? [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodays = isToday(day);
            const isDragTarget = dragOverDay === dayKey;

            return (
              <div
                key={dayKey}
                onDragOver={(e) => handleDragOver(e, dayKey)}
                onDrop={(e) => handleDrop(e, day)}
                onDragLeave={() => setDragOverDay(null)}
                onClick={() => handleClickDay(day)}
                className={`
                  relative border-b border-r border-zinc-100 dark:border-zinc-800/80
                  p-1.5 flex flex-col gap-1 cursor-pointer min-h-[110px]
                  transition-colors duration-150
                  ${!isCurrentMonth ? "bg-zinc-50/50 dark:bg-[#0d0d14]/50" : ""}
                  ${isTodays ? "bg-purple-50/60 dark:bg-purple-900/10" : ""}
                  ${isDragTarget ? "bg-purple-100/80 dark:bg-purple-800/20 ring-2 ring-inset ring-purple-400/60" : ""}
                  hover:bg-zinc-50 dark:hover:bg-zinc-800/30
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${isTodays
                        ? "bg-purple-600 text-white"
                        : isCurrentMonth
                        ? "text-zinc-700 dark:text-zinc-200"
                        : "text-zinc-400 dark:text-zinc-600"}
                    `}
                  >
                    {format(day, "d")}
                  </span>
                  {isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClickDay(day);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-500 transition-opacity"
                      title="Create post on this day"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Post pills */}
                <div className="flex flex-col gap-1 overflow-hidden">
                  {loading && isCurrentMonth && (
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  )}
                  {dayPosts.slice(0, 3).map((post) => (
                    <PostPill
                      key={post.id}
                      post={post}
                      onClick={() => setSelectedPost(post)}
                      onDragStart={(e) => handleDragStart(e, post.id)}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[10px] text-zinc-400 pl-1">
                      +{dayPosts.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        {Object.entries(PLATFORM_CONFIG).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${val.bg}`} />
            {val.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          Today
        </div>
        <span className="ml-auto italic">Drag posts to reschedule</span>
      </div>

      {/* Post Detail Sheet */}
      <Sheet open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedPost && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Post Details
                </SheetTitle>
                <SheetDescription>
                  {selectedPost.scheduledFor
                    ? format(parseISO(selectedPost.scheduledFor), "EEEE, MMMM d, yyyy 'at' h:mm a")
                    : "No scheduled time"}
                </SheetDescription>
              </SheetHeader>

              {/* Content Preview */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 mb-4 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {selectedPost.content}
                </p>
                {selectedPost.mediaUrls && (
                  <img
                    src={selectedPost.mediaUrls.split(",")[0]}
                    alt="Media preview"
                    className="mt-3 rounded-lg w-full object-cover max-h-48"
                  />
                )}
              </div>

              {/* Status */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Status
                </p>
                <Badge
                  className={`border text-xs ${STATUS_BADGE[selectedPost.status] ?? ""}`}
                >
                  {selectedPost.status}
                </Badge>
              </div>

              {/* Platforms */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Platforms
                </p>
                <div className="flex flex-col gap-2">
                  {selectedPost.targets.map((target) => {
                    const config = getPlatform(target.account.platform);
                    return (
                      <div
                        key={target.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs ${config.bg}`}
                          >
                            {config.icon}
                          </span>
                          <div>
                            <p className="text-sm font-medium">
                              {target.account.accountName ?? config.label}
                            </p>
                            <p className="text-xs text-zinc-500 capitalize">{target.account.platform}</p>
                          </div>
                        </div>
                        <Badge
                          className={`border text-xs ${STATUS_BADGE[target.status] ?? ""}`}
                        >
                          {target.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scheduled time */}
              {selectedPost.scheduledFor && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
                  <Clock className="w-4 h-4" />
                  Scheduled for{" "}
                  <strong className="text-zinc-700 dark:text-zinc-300">
                    {format(parseISO(selectedPost.scheduledFor), "h:mm a")}
                  </strong>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => {
                    router.push(`/dashboard/create?edit=${selectedPost.id}`);
                    setSelectedPost(null);
                  }}
                >
                  <Edit className="w-4 h-4" />
                  Edit Post
                </Button>
                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => {
                    router.push(`/dashboard/create?duplicate=${selectedPost.id}`);
                    setSelectedPost(null);
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Duplicate Post
                </Button>
                <Button
                  className="w-full justify-start gap-2 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20"
                  variant="outline"
                  onClick={() => handleDelete(selectedPost.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Post
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

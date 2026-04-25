"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  RefreshCcw, 
  Globe, 
  Camera, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  TrendingUp, 
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface AnalyticsSummary {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
}

interface PlatformPost {
  id: string;
  accountId: string;
  platformPostId: string;
  platform: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string;
  permalink: string | null;
  publishedAt: string;
  analytics: any[];
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [expandedComments, setExpandedComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchInitialData();
  }, [selectedAccount, selectedPlatform]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary
      const summaryRes = await fetch(`/api/analytics/summary${selectedAccount !== 'all' ? `?accountId=${selectedAccount}` : ''}`);
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // 2. Fetch Posts
      let postsUrl = `/api/analytics/posts?`;
      if (selectedAccount !== 'all') postsUrl += `accountId=${selectedAccount}&`;
      if (selectedPlatform !== 'all') postsUrl += `platform=${selectedPlatform}`;
      
      const postsRes = await fetch(postsUrl);
      const postsData = await postsRes.json();
      
      if (Array.isArray(postsData)) {
        setPosts(postsData);
      } else {
        console.error("API returned non-array for posts:", postsData);
        setPosts([]);
        if (postsData.error) {
          toast.error(`API Error: ${postsData.error}`);
        }
      }

      // 3. Fetch Accounts
      const accountsRes = await fetch('/api/accounts');
      const accountsData = await accountsRes.json();
      setAccounts(accountsData);
    } catch (error) {
      console.error("Failed to fetch analytics data", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/analytics/sync', { method: 'POST' });
      if (res.ok) {
        toast.success("Sync triggered! Data will update in a few moments.");
        // Refresh after a delay to let Inngest work
        setTimeout(fetchInitialData, 5000);
      } else {
        throw new Error("Failed to trigger sync");
      }
    } catch (error) {
      toast.error("Sync failed to start");
    } finally {
      setSyncing(false);
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments[postId]) {
      const newExpanded = { ...expandedComments };
      delete newExpanded[postId];
      setExpandedComments(newExpanded);
      return;
    }

    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/analytics/posts/${postId}/comments`);
      const data = await res.json();
      setExpandedComments(prev => ({ ...prev, [postId]: data }));
    } catch (error) {
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Social Analytics
          </h1>
          <p className="text-slate-500 mt-1">Track your performance across all connected platforms.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Filter By:</span>
        </div>
        
        <select 
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="all">All Accounts</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.platform} - {acc.accountName}</option>
          ))}
        </select>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setSelectedPlatform('all')}
            className={`px-4 py-1 text-sm rounded-md transition-all ${selectedPlatform === 'all' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500'}`}
          >
            All
          </button>
          <button 
            onClick={() => setSelectedPlatform('facebook')}
            className={`px-4 py-1 text-sm rounded-md transition-all flex items-center gap-1.5 ${selectedPlatform === 'facebook' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            <Globe className="w-3.5 h-3.5" />
            Facebook
          </button>
          <button 
            onClick={() => setSelectedPlatform('instagram')}
            className={`px-4 py-1 text-sm rounded-md transition-all flex items-center gap-1.5 ${selectedPlatform === 'instagram' ? 'bg-white shadow-sm text-pink-600 font-bold' : 'text-slate-500'}`}
          >
            <Camera className="w-3.5 h-3.5" />
            Instagram
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Posts" value={summary?.totalPosts || 0} icon={<TrendingUp className="text-indigo-600" />} />
        <KPICard title="Total Likes" value={summary?.totalLikes || 0} icon={<Heart className="text-pink-600" />} />
        <KPICard title="Comments" value={summary?.totalComments || 0} icon={<MessageCircle className="text-blue-600" />} />
        <KPICard title="Shares" value={summary?.totalShares || 0} icon={<Share2 className="text-emerald-600" />} />
        <KPICard title="Reach" value={summary?.totalReach || 0} icon={<Users className="text-amber-600" />} />
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Recent Performance</h2>
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No data found</h3>
            <p className="text-slate-400">Try refreshing your data or connecting more accounts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                isExpanded={!!expandedComments[post.platformPostId]}
                comments={expandedComments[post.platformPostId] || []}
                loadingComments={loadingComments[post.platformPostId]}
                onToggleComments={() => toggleComments(post.platformPostId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function PostCard({ 
  post, 
  isExpanded, 
  comments, 
  loadingComments, 
  onToggleComments 
}: { 
  post: PlatformPost; 
  isExpanded: boolean;
  comments: any[];
  loadingComments: boolean;
  onToggleComments: () => void;
}) {
  const analytics = post.analytics?.[0] || {};
  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:border-indigo-200 transition-colors">
      <div className="flex flex-col md:flex-row">
        {/* Media Preview */}
        <div className="w-full md:w-48 h-48 bg-slate-100 relative">
          {post.mediaUrl ? (
            <Image 
              src={post.mediaUrl} 
              alt="Post preview" 
              fill 
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-slate-300" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            {post.platform === 'facebook' ? (
              <div className="bg-blue-600 text-white p-1 rounded-md shadow-lg"><Globe className="w-4 h-4" /></div>
            ) : (
              <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white p-1 rounded-md shadow-lg"><Camera className="w-4 h-4" /></div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-slate-400">{formattedDate}</span>
              {post.permalink && (
                <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-slate-700 line-clamp-3 text-sm leading-relaxed mb-4">
              {post.content || <span className="italic text-slate-400">No caption</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Metric icon={<Heart className="w-4 h-4 text-pink-500" />} label="Likes" value={analytics.likesCount || 0} />
            <Metric icon={<MessageCircle className="w-4 h-4 text-blue-500" />} label="Comments" value={analytics.commentsCount || 0} />
            {post.platform === 'facebook' && (
              <Metric icon={<Share2 className="w-4 h-4 text-emerald-500" />} label="Shares" value={analytics.sharesCount || 0} />
            )}
            <Metric icon={<Eye className="w-4 h-4 text-slate-500" />} label="Reach" value={analytics.reach || 0} />
          </div>
        </div>
      </div>

      {/* Expandable Comments */}
      <div className="border-t border-slate-50">
        <button 
          onClick={onToggleComments}
          className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            {isExpanded ? 'Hide Comments' : 'View Detailed Comments'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="p-5 bg-slate-50 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-b-2 border-indigo-600 rounded-full"></div>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-2">No comments to display.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-indigo-600">{comment.authorName?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">{comment.authorName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(comment.commentedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{label}</span>
        <span className="text-sm font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      </div>
    </div>
  );
}

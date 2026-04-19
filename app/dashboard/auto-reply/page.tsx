"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Share2,
  Sparkles,
  MessageSquare,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Account = {
  id: string;
  platform: string;
  accountName: string | null;
  avatarUrl: string | null;
};

type Log = {
  id: string;
  appliedAt: string;
  targetCommentId: string;
  commentText: string | null;
  replyText: string | null;
  platform: string | null;
};

type Rule = {
  id: string;
  accountId: string;
  triggerType: string;
  triggerKeywords: string | null;
  useAi: boolean;
  aiPrompt: string | null;
  replyTemplate: string | null;
  isActive: boolean;
  createdAt: string;
  account: Account;
  logs: Log[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500",
  instagram: "bg-pink-500",
  facebook: "bg-blue-600",
};

function PlatformDot({ platform }: { platform: string }) {
  return (
    <span
      className={`w-2 h-2 rounded-full inline-block ${PLATFORM_COLORS[platform] ?? "bg-zinc-400"}`}
    />
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = ["Select Account", "Set Trigger", "Set Reply", "Review & Save"];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutoReplyPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [triggerType, setTriggerType] = useState<"keyword" | "any">("keyword");
  const [keywords, setKeywords] = useState("");
  const [replyMode, setReplyMode] = useState<"template" | "ai">("template");
  const [replyTemplate, setReplyTemplate] = useState("Thanks for your comment, @{username}! 🙌");
  const [aiPrompt, setAiPrompt] = useState("Reply in a friendly, helpful tone.");
  const [aiPreview, setAiPreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch rules and accounts
  useEffect(() => {
    Promise.all([
      fetch("/api/auto-reply").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ])
      .then(([rulesData, accountsData]) => {
        setRules(Array.isArray(rulesData) ? rulesData : []);
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
      })
      .catch((err) => {
        console.error("Auto-reply page: Failed to fetch data", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const resetDialog = () => {
    setStep(0);
    setSelectedAccountId("");
    setTriggerType("keyword");
    setKeywords("");
    setReplyMode("template");
    setReplyTemplate("Thanks for your comment, @{username}! 🙌");
    setAiPrompt("Reply in a friendly, helpful tone.");
    setAiPreview("");
  };

  const openDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const handleToggleRule = async (rule: Rule) => {
    const updated = { ...rule, isActive: !rule.isActive };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    await fetch(`/api/auto-reply/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Delete this auto-reply rule and all its logs?")) return;
    await fetch(`/api/auto-reply/${ruleId}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    toast.success("Rule deleted");
  };

  const handlePreviewAI = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: "This is awesome, keep it up!",
          username: "testuser",
          prompt: aiPrompt,
        }),
      });
      const data = await res.json();
      setAiPreview(data.text || "Failed to generate preview");
    } catch {
      setAiPreview("Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auto-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          triggerType,
          triggerKeywords: triggerType === "keyword" ? keywords : null,
          useAi: replyMode === "ai",
          aiPrompt: replyMode === "ai" ? aiPrompt : null,
          replyTemplate: replyMode === "template" ? replyTemplate : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create rule");
        return;
      }

      const newRule = await res.json();
      // Re-fetch to get with relations
      const updated = await fetch("/api/auto-reply").then((r) => r.json());
      setRules(Array.isArray(updated) ? updated : []);
      setDialogOpen(false);
      toast.success("Auto-reply rule created!");
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Auto-Reply</h2>
          <p className="text-zinc-500 text-sm">
            Automatically reply to comments using templates or AI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {rules.length} / {1} rules (Free plan)
          </span>
          <Button
            onClick={openDialog}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-purple-500" />
          </div>
          <p className="text-zinc-500 text-sm max-w-xs">
            No auto-reply rules yet. Create your first rule to start automatically engaging with comments.
          </p>
          <Button onClick={openDialog} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Create your first rule
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111118] overflow-hidden"
            >
              {/* Rule header */}
              <div className="flex items-center gap-4 p-4">
                {/* Platform dot + account */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PlatformDot platform={rule.account?.platform ?? ""} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {rule.account?.accountName ?? "Unknown Account"}
                    </p>
                    <p className="text-xs text-zinc-500 capitalize">{rule.account?.platform}</p>
                  </div>
                </div>

                {/* Trigger badge */}
                <Badge className="border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 text-xs capitalize shrink-0">
                  {rule.triggerType === "any" ? "Any comment" : `Keywords: ${rule.triggerKeywords}`}
                </Badge>

                {/* Mode badge */}
                <Badge
                  className={`border text-xs shrink-0 ${
                    rule.useAi
                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700"
                  }`}
                >
                  {rule.useAi ? (
                    <><Sparkles className="w-3 h-3 mr-1" />AI</>
                  ) : (
                    <><MessageSquare className="w-3 h-3 mr-1" />Template</>
                  )}
                </Badge>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleRule(rule)}
                  className="shrink-0"
                  title={rule.isActive ? "Disable rule" : "Enable rule"}
                >
                  {rule.isActive ? (
                    <ToggleRight className="w-8 h-8 text-purple-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-zinc-400" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="shrink-0 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Expand logs */}
                <button
                  onClick={() =>
                    setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)
                  }
                  className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  {expandedRuleId === rule.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Activity Log (expanded) */}
              {expandedRuleId === rule.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                    Activity Log ({rule.logs.length} replies)
                  </p>
                  {rule.logs.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No replies sent yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {rule.logs.slice(0, 20).map((log) => (
                        <div
                          key={log.id}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-400">
                              {log.appliedAt
                                ? format(parseISO(log.appliedAt), "MMM d, h:mm a")
                                : "—"}
                            </span>
                          </div>
                          {log.commentText && (
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs italic mb-1">
                              💬 "{log.commentText}"
                            </p>
                          )}
                          {log.replyText && (
                            <p className="text-zinc-700 dark:text-zinc-200 text-xs">
                              ↩ {log.replyText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create Rule Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetDialog(); setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Auto-Reply Rule</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-4">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= step
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded transition-colors ${
                      i < step ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 -mt-2 mb-4">{STEPS[step]}</p>

          {/* ── Step 0: Select Account ── */}
          {step === 0 && (
            <div className="flex flex-col gap-2">
              {accounts.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No connected accounts. Go to Connected Accounts and link a platform first.
                </p>
              ) : (
                accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedAccountId === account.id
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <PlatformDot platform={account.platform} />
                    <div>
                      <p className="text-sm font-medium">{account.accountName}</p>
                      <p className="text-xs text-zinc-400 capitalize">{account.platform}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Step 1: Trigger ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTriggerType("keyword")}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    triggerType === "keyword"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  Keyword Match
                </button>
                <button
                  onClick={() => setTriggerType("any")}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    triggerType === "any"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  Any Comment
                </button>
              </div>
              {triggerType === "keyword" && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="price, discount, help, buy"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    Will trigger if ANY of these words appear in a comment.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Reply mode ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setReplyMode("template")}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    replyMode === "template"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mx-auto mb-1" />
                  Template
                </button>
                <button
                  onClick={() => setReplyMode("ai")}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    replyMode === "ai"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <Sparkles className="w-4 h-4 mx-auto mb-1" />
                  AI Generated
                </button>
              </div>

              {replyMode === "template" && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">
                    Reply template — use <code className="text-purple-500">{"{username}"}</code> and <code className="text-purple-500">{"{comment}"}</code>
                  </label>
                  <textarea
                    rows={4}
                    value={replyTemplate}
                    onChange={(e) => setReplyTemplate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              )}

              {replyMode === "ai" && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">
                      AI Instructions / Tone
                    </label>
                    <textarea
                      rows={3}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Reply in a professional and helpful manner. Offer assistance and direct to support if needed."
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewAI}
                    disabled={previewLoading}
                    className="gap-2 self-start"
                  >
                    {previewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Preview AI reply
                  </Button>
                  {aiPreview && (
                    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 text-sm text-zinc-700 dark:text-zinc-200">
                      {aiPreview}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Account</span>
                  <span className="font-medium">
                    {selectedAccount?.accountName} ({selectedAccount?.platform})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Trigger</span>
                  <span className="font-medium capitalize">
                    {triggerType === "keyword" ? `Keywords: ${keywords}` : "Any comment"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reply mode</span>
                  <span className="font-medium">{replyMode === "ai" ? "AI Generated" : "Template"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">Reply</span>
                  <span className="text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-2 whitespace-pre-wrap">
                    {replyMode === "template" ? replyTemplate : aiPrompt}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 0 && !selectedAccountId) ||
                  (step === 1 && triggerType === "keyword" && !keywords.trim())
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Rule
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

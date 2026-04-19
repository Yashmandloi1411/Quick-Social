"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DisconnectButton({ accountId }: { accountId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/disconnect`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Account disconnected");
        router.refresh();
      } else {
        toast.error("Failed to disconnect account");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-7 text-[10px] text-destructive hover:text-destructive"
      onClick={handleDisconnect}
      disabled={isDeleting}
    >
      {isDeleting ? "..." : "Disconnect"}
    </Button>
  );
}

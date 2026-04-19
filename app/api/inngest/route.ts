import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { publishPost, refreshToken, monitorComments, sendAutoReply } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [publishPost, refreshToken, monitorComments, sendAutoReply],
});

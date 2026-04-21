import { PlatformClient } from "./types";
import { TwitterClient } from "./twitter";
import { InstagramClient } from "./instagram";
import { LinkedInClient } from "./linkedin";
import { facebookClient } from "./facebook";
import { PlaceholderClient } from "./placeholder";

export function getPlatformClient(platform: string): PlatformClient {
  switch (platform.toLowerCase()) {
    case "twitter":
    case "x":
      return new TwitterClient();
    case "instagram":
      return new InstagramClient();
    case "linkedin":
      return new LinkedInClient();
    case "facebook":
      return facebookClient;
    case "youtube":
      return new PlaceholderClient("YouTube");
    case "tiktok":
      return new PlaceholderClient("TikTok");
    case "pinterest":
      return new PlaceholderClient("Pinterest");
    case "discord":
      return new PlaceholderClient("Discord");
    case "slack":
      return new PlaceholderClient("Slack");
    default:
      throw new Error(`Platform ${platform} not supported`);
  }
}
import { UAParser } from "ua-parser-js";

const PLATFORMS = {
  X: ["t.co", "twitter.com", "x.com"],
  YouTube: ["youtube.com", "youtu.be"],
  Instagram: ["instagram.com", "l.instagram.com"],
  TikTok: ["tiktok.com"],
  Facebook: ["facebook.com", "l.facebook.com"],
  LinkedIn: ["linkedin.com", "lnkd.in"],
  Reddit: ["reddit.com"],
};

const BOT_PATTERN = /bot|crawler|spider|preview|curl|wget/i;

export function isBot(userAgent = "") {
  return BOT_PATTERN.test(userAgent);
}

function detectPlatform(referrer, src) {
  if (src) return src; // ?src=newsletter wins over the referrer
  if (!referrer) return "direct";

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    for (const [platform, domains] of Object.entries(PLATFORMS)) {
      if (domains.some((d) => host === d || host.endsWith("." + d))) {
        return platform;
      }
    }
    return "other";
  } catch {
    return "direct";
  }
}

export function buildClickData(req) {
  const userAgent = req.get("user-agent") || "";
  const referrer = req.get("referer") || null;
  const ua = new UAParser(userAgent).getResult();

  return {
    referrer,
    platform: detectPlatform(referrer, req.query.src),
    deviceType: ua.device.type || "desktop",
    browser: ua.browser.name || "unknown",
    os: ua.os.name || "unknown",
    country: null, // filled in later when we add geolocation
  };
}
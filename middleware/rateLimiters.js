import rateLimit from "express-rate-limit";

const shared = {
  standardHeaders: "draft-7", // sends RateLimit-* headers so clients know their limit
  legacyHeaders: false,
};

// Brute-force protection for register and login: 5 requests per 10 minutes per IP
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: "Too many attempts. Try again in 10 minutes." },
});

// General protection for the link API: 300 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { error: "Too many requests. Slow down." },
});

// Link creation: 5 per hour per user (keyed by user id, not IP)
export const createLinkLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user.id),
  message: { error: "Link creation limit reached. Try again later." },
});

// Public redirects: 120 per minute per IP. Generous, since real visitors share IPs
export const redirectLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 120,
  message: { error: "Too many requests." },
});
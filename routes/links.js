import express from "express";
import QRCode from "qrcode";
import {
  addLink,
  findByCode,
  updateLink,
  deleteLink,
  getLinksByUser,
  getClicksByLinkId,
} from "../utils/db.js";
import { generateCode } from "../utils/code.js";
import { buildStats } from "../utils/stats.js";
import authenticate from "../middleware/authenticate.js";
import { createLinkLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

//makes sure that the slug must be initiated from these characters
const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,30}$/;

//makes sure no values here are used when creating the slug
const RESERVED_SLUGS = new Set(["api", "admin", "login", "register", "stats", "health"]);

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
//prevents a user from submitting an empty label or a label containing only spaces
function isValidLabel(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 50;
}

// Returns the link only if it exists AND belongs to this user.
// Someone else's link looks exactly like a missing one (404, not 403),
// so people can't discover which codes exist.
async function findOwnedLink(code, userId) {
  const link = await findByCode(code);
  return link && link.userId === userId ? link : null;
}

// Every route in this file requires a valid token
router.use(authenticate);

//This route handles a POST request to create a new shortened URL
router.post("/", createLinkLimiter, async (req, res) => {
  const { url, slug, label } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "A valid http or https URL is required." });
  }

  //if the client provided a label title because label optional
  if (label !== undefined && !isValidLabel(label)) {
    return res.status(400).json({ error: "Label must be 1-50 characters." });
  }

  let code;

  if (slug !== undefined) {
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
      return res.status(400).json({
        error: "Slug must be 3-30 characters: letters, digits, - and _ only.",
      });
    }
    if (RESERVED_SLUGS.has(slug.toLowerCase())) {
      return res.status(400).json({ error: "That slug is reserved." });
    }
    if (await findByCode(slug)) {
      return res.status(409).json({ error: "That slug is unavailable." });
    }
    code = slug;
  } else {
    code = generateCode();
    while (await findByCode(code)) {
      code = generateCode();
    }
  }

  const link = await addLink(req.user.id, code, url, label ? label.trim() : null);

  res.status(201).json({
    ...link,
    shortUrl: `${req.protocol}://${req.get("host")}/${link.code}`,
  });
});

//This route allows an authenticated user to delete a link they own.
router.delete("/:code", async (req, res) => {
  const link = await findOwnedLink(req.params.code, req.user.id);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }

  await deleteLink(link.code);
  res.status(201).json({message: "link deleted"});
});

//This route retrieves all the links belonging to the currently authenticated user and adds two extra properties to each link
router.get("/", async (req, res) => {
  const links = await getLinksByUser(req.user.id);
  const mine = links.map((link) => ({
    ...link,
    shortUrl: `${req.protocol}://${req.get("host")}/${link.code}`,
    totalClicks: getClicksByLinkId(link.id).length,
  }));
  res.status(200).json(mine);
});

//This route allows an authenticated user to update the destination URL or label of a link they own.
router.put("/:code", (req, res) => {
  const link = findOwnedLink(req.params.code, req.user.id);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }

  const { url, label } = req.body;

  if (url === undefined && label === undefined) {
    return res.status(400).json({ error: "Provide a url or a label to update." });
  }

  const updates = {};

  if (url !== undefined) {
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "A valid http or https URL is required." });
    }
    updates.originalUrl = url;
  }

  if (label !== undefined) {
    if (!isValidLabel(label)) {
      return res.status(400).json({ error: "Label must be 1-50 characters." });
    }
    updates.label = label.trim();
  }

  res.json(updateLink(link.code, updates));
});

//This route returns statistics for a specific shortened link owned by the authenticated user.
router.get("/:code/stats", async (req, res) => {
  const link = await findOwnedLink(req.params.code, req.user.id);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }
  const clicks = await getClicksByLinkId(link.id)
  res.json({
    code: link.code,
    originalUrl: link.originalUrl,
    label: link.label,
    ...buildStats(clicks),
  });
});

//This endpoint generates a QR code that contains that URL.
router.get("/:code/qr", async (req, res) => {
  const link = await findOwnedLink(req.params.code, req.user.id);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }

  const shortUrl = `${req.protocol}://${req.get("host")}/${link.code}`;

  if (req.query.format === "svg") {
    const svg = await QRCode.toString(shortUrl, { type: "svg", margin: 2 });
    return res.type("image/svg+xml").send(svg);
  }

  const png = await QRCode.toBuffer(shortUrl, { width: 400, margin: 2 });
  res.type("image/png").send(png);
});

export default router;
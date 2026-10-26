import express from "express";
import { addLink, findByCode, updateLink, getClicksByLinkId } from "../utils/db.js";
import { generateCode } from "../utils/code.js";
import { buildStats } from "../utils/stats.js";

const router = express.Router();

const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,30}$/;
const RESERVED_SLUGS = new Set(["api", "admin", "login", "register", "stats", "health"]);

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidLabel(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 50;
}

router.post("/", (req, res) => {
  const { url, slug, label } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "A valid http or https URL is required." });
  }

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
    if (findByCode(slug)) {
      return res.status(409).json({ error: "That slug is already taken." });
    }
    code = slug;
  } else {
    code = generateCode();
    while (findByCode(code)) {
      code = generateCode();
    }
  }

  const link = addLink(code, url, label ? label.trim() : null);

  res.status(201).json({
    ...link,
    shortUrl: `${req.protocol}://${req.get("host")}/${link.code}`,
  });
});

router.put("/:code", (req, res) => {
  const link = findByCode(req.params.code);
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

router.get("/:code/stats", (req, res) => {
  const link = findByCode(req.params.code);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }
  res.json({
    code: link.code,
    originalUrl: link.originalUrl,
    label: link.label,
    ...buildStats(getClicksByLinkId(link.id)),
  });
});

export default router;
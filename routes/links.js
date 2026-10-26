import express from "express";

import { buildStats } from "../utils/stats.js";
import { addLink, findByCode, getClicksByLinkId } from "../utils/db.js";
import { generateCode } from "../utils/code.js";

const router = express.Router();

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

router.post("/", (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res
      .status(400)
      .json({ error: "A valid http or https URL is required." });
  }

  let code = generateCode();
  while (findByCode(code)) {
    code = generateCode();
  }

  const link = addLink(code, url);

  res.status(201).json({
    ...link,
    shortUrl: `${req.protocol}://${req.get("host")}/${link.code}`,
  });
});

router.get("/:code/stats", (req, res) => {
  const link = findByCode(req.params.code);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }
  res.json({
    code: link.code,
    originalUrl: link.originalUrl,
    ...buildStats(getClicksByLinkId(link.id)),
  });
});

export default router;
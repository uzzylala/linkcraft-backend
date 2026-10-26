import express from "express";
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

// temporary: replaced by the real stats endpoint (with auth) later
router.get("/:code/clicks", (req, res) => {
  const link = findByCode(req.params.code);
  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }
  res.json(getClicksByLinkId(link.id));
});

export default router;
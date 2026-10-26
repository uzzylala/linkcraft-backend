import express from "express";
import { findByCode, addClick } from "../utils/db.js";
import { buildClickData, isBot } from "../utils/analytics.js";

const router = express.Router();

router.get("/:code", (req, res) => {
  const link = findByCode(req.params.code);

  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }

  if (!isBot(req.get("user-agent") || "")) {
    addClick(link.id, buildClickData(req));
  }

  res.redirect(302, link.originalUrl);
});

export default router;
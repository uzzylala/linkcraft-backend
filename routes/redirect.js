import express from "express";
import { findByCode } from "../utils/db.js";

const router = express.Router();

router.get("/:code", (req, res) => {
  const link = findByCode(req.params.code);

  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }

  res.redirect(302, link.originalUrl);
});

export default router;
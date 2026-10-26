import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, addUser } from "../utils/db.js";

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (findUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: "Email already in use." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = addUser(normalizedEmail, passwordHash);

  res.status(201).json({ token: signToken(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = findUserByEmail(email.trim().toLowerCase());
  const match = user && (await bcrypt.compare(password, user.passwordHash));

  if (!match) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  res.json({ token: signToken(user) });
});

export default router;
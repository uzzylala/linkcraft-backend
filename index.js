import "dotenv/config";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import linkRoutes from "./routes/links.js";
import redirectRoutes from "./routes/redirect.js";
import {
  authLimiter,
  apiLimiter,
  redirectLimiter,
} from "./middleware/rateLimiters.js";

const PORT = process.env.PORT || 3000;
const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // hosts like Render sit behind a proxy
}

app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  console.log(res);
  res.json({ message: "URL shortener API" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/links", apiLimiter, linkRoutes);
app.use(redirectLimiter, redirectRoutes); // keep last: /:code matches almost any path

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
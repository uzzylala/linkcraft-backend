import "dotenv/config";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import linkRoutes from "./routes/links.js";
import redirectRoutes from "./routes/redirect.js";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "URL shortener API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/links", linkRoutes);
app.use(redirectRoutes); // keep last: /:code matches almost any path

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
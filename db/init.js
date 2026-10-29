import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const sql = fs.readFileSync(
  path.join(import.meta.dirname, "schema.sql"),
  "utf-8",
);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(sql);
console.log("Schema applied.");
await pool.end();
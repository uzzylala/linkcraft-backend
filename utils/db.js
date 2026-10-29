// const users = [];
// const links = [];
// const clicks = [];

// // ---------- users ----------
// export function findUserByEmail(email) {
//   return users.find((u) => u.email === email) || null;
// }

// export function addUser(email, passwordHash) {
//   const user = {
//     id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
//     email,
//     passwordHash,
//     createdAt: new Date().toISOString(),
//   };
//   users.push(user);
//   return user;
// }

// // ---------- links ----------
// export function findByCode(code) {
//   return links.find((l) => l.code === code) || null;
// }

// export function getLinksByUser(userId) {
//   return links.filter((l) => l.userId === userId);
// }

// export function addLink(userId, code, originalUrl, label = null) {
//   const link = {
//     id: links.length > 0 ? Math.max(...links.map((l) => l.id)) + 1 : 1,
//     userId,
//     code,
//     originalUrl,
//     label,
//     createdAt: new Date().toISOString(),
//   };
//   links.push(link);
//   return link;
// }

// export function updateLink(code, updates) {
//   const link = findByCode(code);
//   if (!link) return null;
//   Object.assign(link, updates);
//   return link;
// }

// // ---------- clicks ----------
// export function addClick(linkId, data) {
//   const click = {
//     id: clicks.length + 1,
//     linkId,
//     clickedAt: new Date().toISOString(),
//     ...data,
//   };
//   clicks.push(click);
//   return click;
// }

// export function getClicksByLinkId(linkId) {
//   return clicks.filter((c) => c.linkId === linkId);
// }

import "dotenv/config";
import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ---- row mappers: Postgres snake_case -> the camelCase your routes already use ----
function toUser(r) {
  return r && { id: r.id, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at };
}

function toLink(r) {
  return (
    r && {
      id: r.id,
      userId: r.user_id,
      code: r.code,
      originalUrl: r.original_url,
      label: r.label,
      createdAt: r.created_at,
      ...(r.total_clicks !== undefined && { totalClicks: r.total_clicks }),
    }
  );
}

function toClick(r) {
  return {
    id: r.id,
    linkId: r.link_id,
    clickedAt: r.clicked_at.toISOString(), // stats.js uses .slice(0, 10) on this
    referrer: r.referrer,
    platform: r.platform,
    deviceType: r.device_type,
    browser: r.browser,
    os: r.os,
    country: r.country,
  };
}

// ---------- users ----------
export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return toUser(rows[0]) || null;
}

export async function addUser(email, passwordHash) {
  const { rows } = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *",
    [email, passwordHash]
  );
  return toUser(rows[0]);
}

// ---------- links ----------
export async function findByCode(code) {
  const { rows } = await pool.query("SELECT * FROM links WHERE code = $1", [code]);
  return toLink(rows[0]) || null;
}

// Includes totalClicks in one query (no extra query per link)
// export async function getLinksByUser(userId) {
//   const { rows } = await pool.query(
//     `SELECT l.*, COUNT(c.id)::int AS total_clicks
//      FROM links l
//      LEFT JOIN clicks c ON c.link_id = l.id
//      WHERE l.user_id = $1
//      GROUP BY l.id
//      ORDER BY l.created_at DESC`,
//     [userId]
//   );
//   return rows.map(toLink);
// }
export async function getLinksByUser(userId, limit = 10, offset = 0) {
  const { rows } = await pool.query(
    `SELECT l.*, COUNT(c.id)::int AS total_clicks
     FROM links l
     LEFT JOIN clicks c ON c.link_id = l.id
     WHERE l.user_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows.map(toLink);
}

export async function countLinksByUser(userId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM links WHERE user_id = $1",
    [userId]
  );
  return rows[0].count;
}

export async function addLink(userId, code, originalUrl, label = null) {
  const { rows } = await pool.query(
    `INSERT INTO links (user_id, code, original_url, label)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, code, originalUrl, label]
  );
  return toLink(rows[0]);
}

// updates: { originalUrl?, label? }. Only provided fields change.
export async function updateLink(code, updates) {
  const { rows } = await pool.query(
    `UPDATE links
     SET original_url = COALESCE($2, original_url),
         label        = COALESCE($3, label)
     WHERE code = $1
     RETURNING *`,
    [code, updates.originalUrl ?? null, updates.label ?? null]
  );
  return toLink(rows[0]) || null;
}

// ---------- clicks ----------
export async function addClick(linkId, data) {
  const { rows } = await pool.query(
    `INSERT INTO clicks (link_id, referrer, platform, device_type, browser, os, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      linkId,
      data.referrer,
      data.platform,
      data.deviceType,
      data.browser,
      data.os,
      data.country,
    ]
  );
  return toClick(rows[0]);
}

export async function getClicksByLinkId(linkId) {
  const { rows } = await pool.query(
    "SELECT * FROM clicks WHERE link_id = $1 ORDER BY clicked_at",
    [linkId]
  );
  return rows.map(toClick);
}

export async function deleteLink(code) {
  const { rowCount } = await pool.query("DELETE FROM links WHERE code = $1", [code]);
  return rowCount > 0;
}
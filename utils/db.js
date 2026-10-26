const users = [];
const links = [];
const clicks = [];

// ---------- users ----------
export function findUserByEmail(email) {
  return users.find((u) => u.email === email) || null;
}

export function addUser(email, passwordHash) {
  const user = {
    id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

// ---------- links ----------
export function findByCode(code) {
  return links.find((l) => l.code === code) || null;
}

export function getLinksByUser(userId) {
  return links.filter((l) => l.userId === userId);
}

export function addLink(userId, code, originalUrl, label = null) {
  const link = {
    id: links.length > 0 ? Math.max(...links.map((l) => l.id)) + 1 : 1,
    userId,
    code,
    originalUrl,
    label,
    createdAt: new Date().toISOString(),
  };
  links.push(link);
  return link;
}

export function updateLink(code, updates) {
  const link = findByCode(code);
  if (!link) return null;
  Object.assign(link, updates);
  return link;
}

// ---------- clicks ----------
export function addClick(linkId, data) {
  const click = {
    id: clicks.length + 1,
    linkId,
    clickedAt: new Date().toISOString(),
    ...data,
  };
  clicks.push(click);
  return click;
}

export function getClicksByLinkId(linkId) {
  return clicks.filter((c) => c.linkId === linkId);
}
const links = [];
const clicks = [];

export function findByCode(code) {
  return links.find((l) => l.code === code) || null;
}

export function addLink(code, originalUrl) {
  const link = {
    id: links.length > 0 ? Math.max(...links.map((l) => l.id)) + 1 : 1,
    code,
    originalUrl,
    createdAt: new Date().toISOString(),
  };
  links.push(link);
  return link;
}

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
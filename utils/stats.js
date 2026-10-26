function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, clicks]) => ({ name, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

function clicksPerDay(clicks) {
  const days = {};
  for (const click of clicks) {
    const day = click.clickedAt.slice(0, 10); // "2026-10-26"
    days[day] = (days[day] || 0) + 1;
  }
  return Object.entries(days)
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildStats(clicks) {
  return {
    totalClicks: clicks.length,
    clicksPerDay: clicksPerDay(clicks),
    topPlatforms: countBy(clicks, "platform"),
    devices: countBy(clicks, "deviceType"),
    browsers: countBy(clicks, "browser"),
    operatingSystems: countBy(clicks, "os"),
  };
}
import domains from "@/data/blocklist.json";

const blocklist = new Set(domains.filter(d => d.trim() !== "")); // 空文字除外

export function isBlocked(domain: string): boolean {
  const target = domain.toLowerCase();

  return [...blocklist].some(d => {
    const normalized = d.toLowerCase().trim();
    if (!normalized) return false;
    return target === normalized || target.endsWith(`.${normalized}`);
  });
}

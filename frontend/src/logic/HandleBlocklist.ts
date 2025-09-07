import domains from "@/data/blocklist.json";

const blocklist = new Set(domains.filter(d => d.trim() !== "")); // 空文字除外

export function isBlocked(domain: string): boolean {
  return blocklist.has(domain) || [...blocklist].some(d => domain.endsWith("." + d));
}
import domains from "@/data/blocklist.json";

const blocklist = new Set(domains);

export function isBlocked(domain: string): boolean {
  return blocklist.has(domain) || [...blocklist].some(d => domain.endsWith("." + d));
}
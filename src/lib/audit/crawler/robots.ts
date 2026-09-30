export interface AgentGroup {
  disallow: string[];
  allow: string[];
}

export interface RobotsInfo {
  found: boolean;
  content: string | null;
  disallowedPaths: string[]; // wildcard (*) group — used for crawl-scoping
  allowedPaths: string[];
  sitemaps: string[];
  agentGroups: Record<string, AgentGroup>; // lowercase agent name -> its own rules (does not include wildcard fallback)
}

const FETCH_TIMEOUT_MS = 8000;

export async function fetchRobotsTxt(origin: string): Promise<RobotsInfo> {
  const url = new URL("/robots.txt", origin).toString();
  const empty: RobotsInfo = { found: false, content: null, disallowedPaths: [], allowedPaths: [], sitemaps: [], agentGroups: {} };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);

    if (!res.ok) return empty;
    const content = await res.text();
    return { found: true, content, ...parseRobotsTxt(content) };
  } catch {
    return empty;
  }
}

/** Parses robots.txt into per-user-agent groups (consecutive `User-agent:` lines
 * share the directives that follow, per the de-facto spec) plus a convenience
 * wildcard (*) group for crawl-scoping. Not a full spec-compliant parser, but
 * enough to answer "is agent X allowed to fetch path Y". */
export function parseRobotsTxt(content: string): Omit<RobotsInfo, "found" | "content"> {
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const sitemaps: string[] = [];
  const agentGroups: Record<string, AgentGroup> = {};

  let pendingAgents: string[] = [];
  let groupClosed = true;

  const ensureGroup = (agent: string): AgentGroup => {
    if (!agentGroups[agent]) agentGroups[agent] = { disallow: [], allow: [] };
    return agentGroups[agent];
  };

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent" && value) {
      const agent = value.toLowerCase();
      if (groupClosed) {
        pendingAgents = [agent];
        groupClosed = false;
      } else {
        pendingAgents.push(agent);
      }
      ensureGroup(agent);
    } else if (key === "sitemap" && value) {
      sitemaps.push(value);
    } else if (key === "disallow" && value && pendingAgents.length > 0) {
      groupClosed = true;
      for (const agent of pendingAgents) ensureGroup(agent).disallow.push(value);
    } else if (key === "allow" && value && pendingAgents.length > 0) {
      groupClosed = true;
      for (const agent of pendingAgents) ensureGroup(agent).allow.push(value);
    } else if ((key === "disallow" || key === "allow") && pendingAgents.length > 0) {
      // empty Disallow: means "allow everything" for that agent — still closes the group
      groupClosed = true;
    }
  }

  const wildcard = agentGroups["*"] ?? { disallow: [], allow: [] };
  return { disallowedPaths: wildcard.disallow, allowedPaths: wildcard.allow, sitemaps, agentGroups };
}

function pathMatchesPattern(pathname: string, pattern: string): boolean {
  if (!pattern) return false;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\$$/, "$");
  return new RegExp(`^${escaped}`).test(pathname);
}

export function isPathAllowed(pathname: string, robots: RobotsInfo): boolean {
  if (!robots.found) return true;

  const disallowMatch = robots.disallowedPaths.find((p) => pathMatchesPattern(pathname, p));
  if (!disallowMatch) return true;

  const allowMatch = robots.allowedPaths.find((p) => pathMatchesPattern(pathname, p));
  return !!(allowMatch && allowMatch.length >= disallowMatch.length);
}

/** Checks whether a specific named crawler (e.g. "GPTBot") is allowed to fetch
 * `pathname`, using that agent's own group if robots.txt names it explicitly,
 * falling back to the wildcard (*) group otherwise — matching how real crawlers
 * interpret robots.txt. */
export function isAgentAllowed(agentName: string, pathname: string, robots: RobotsInfo): boolean {
  if (!robots.found) return true;
  const group = robots.agentGroups[agentName.toLowerCase()];
  const effective = group ?? { disallow: robots.disallowedPaths, allow: robots.allowedPaths };

  const disallowMatch = effective.disallow.find((p) => pathMatchesPattern(pathname, p));
  if (!disallowMatch) return true;
  const allowMatch = effective.allow.find((p) => pathMatchesPattern(pathname, p));
  return !!(allowMatch && allowMatch.length >= disallowMatch.length);
}

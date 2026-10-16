type Rule = Readonly<{ allow: boolean; pattern: string }>;
type Group = Readonly<{ agents: readonly string[]; rules: readonly Rule[] }>;

function parseGroups(text: string): Group[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | undefined;
  let rulesStarted = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || rulesStarted) {
        current = { agents: [], rules: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current) {
      rulesStarted = true;
      if (value) current.rules.push({ allow: field === "allow", pattern: value });
    }
  }
  return groups;
}

function ruleMatches(path: string, pattern: string): boolean {
  const endAnchored = pattern.endsWith("$");
  const source = (endAnchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${source}${endAnchored ? "$" : ""}`).test(path);
}

export function isRobotsAllowed(text: string, target: URL, productToken = "prizmdev"): boolean {
  const groups = parseGroups(text);
  const token = productToken.toLowerCase();
  const specific = groups.filter((group) => group.agents.some((agent) => agent !== "*" && token.startsWith(agent)));
  const selected = specific.length > 0 ? specific : groups.filter((group) => group.agents.includes("*"));
  const path = `${target.pathname}${target.search}` || "/";
  const matches = selected.flatMap((group) => group.rules).filter((rule) => ruleMatches(path, rule.pattern));
  if (matches.length === 0) return true;
  matches.sort((left, right) => right.pattern.length - left.pattern.length || Number(right.allow) - Number(left.allow));
  return matches[0]?.allow ?? true;
}

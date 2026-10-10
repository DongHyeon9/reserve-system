// CI guard: fails when local-only documents, env files, or obvious secrets are tracked in Git.
// Project rule: plans, reports, AI settings and other non-code docs are excluded locally and must never be pushed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);

const forbiddenPaths = [
  [/^(plans|ai-settings|todo|reports|docs|documents|notes|design\/previews)\//, "local-only document folder"],
  [/(^|\/)(AGENTS|CLAUDE)\.md$/, "AI rule file"],
  [/\.(md|mdx|adoc|rst|txt|rtf|docx?|pdf|pptx?|xlsx?)$/i, "non-code document"],
  [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, "environment file (only .env.example may be tracked)"],
];
const secretPatterns = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "literal JWT"],
  [/postgres(ql)?:\/\/[^:\s]+:[^@\s<]{6,}@/, "database URL with password"],
];

const problems = [];
for (const file of files) {
  for (const [pattern, reason] of forbiddenPaths) if (pattern.test(file)) problems.push(`${file}: ${reason}`);
  if (/\.(png|jpe?g|gif|ico|jar|woff2?)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const [pattern, reason] of secretPatterns) if (pattern.test(text)) problems.push(`${file}: possible ${reason}`);
}

if (problems.length) {
  console.error("Tracked files violate the repository policy:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`Checked ${files.length} tracked files: no local-only documents or secrets.`);

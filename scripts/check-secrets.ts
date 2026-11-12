import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Finding = { file: string; line: number; rule: string };

const secretPatterns: Array<[string, RegExp]> = [
  ["private-key", /-----BEGIN (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----/i],
  ["anthropic-token", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["bearer-token", /\bBearer\s+[A-Za-z0-9._~+/-]{24,}={0,2}/i],
  [
    "credential-assignment",
    /\b(?:ANTHROPIC_API_KEY|UPSTASH_REDIS_REST_TOKEN|IP_HASH_SECRET|VERCEL_TOKEN|GITHUB_TOKEN)\b[ \t]*[:=][ \t]*["'`]?([A-Za-z0-9+/_=-]{24,})/i,
  ],
  ["redis-url-password", /\brediss?:\/\/[^\s/:@]+:[^\s@]{12,}@/i],
];

const textExtensions = new Set([
  ".cjs", ".css", ".html", ".js", ".json", ".lock", ".map", ".md", ".mjs",
  ".sh", ".svg", ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);
const privateDocumentExtensions = new Set([
  ".doc", ".docx", ".odt", ".ods", ".pdf", ".ppt", ".pptx", ".rtf", ".xls", ".xlsx",
]);

export function isPrivateDocumentPath(file: string): boolean {
  return privateDocumentExtensions.has(path.extname(file).toLowerCase());
}

export function scanText(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  for (const [rule, pattern] of secretPatterns) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ file, line, rule });
    }
  }
  return findings;
}

function isTextFile(file: string): boolean {
  return path.basename(file).startsWith(".env") || textExtensions.has(path.extname(file).toLowerCase());
}

function collectBundleFiles(directory: string, root: string, files: Set<string>): void {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectBundleFiles(absolutePath, root, files);
    } else if (entry.isFile()) {
      const relativePath = path.relative(root, absolutePath);
      if (isTextFile(relativePath)) files.add(relativePath);
    }
  }
}

function repositoryFiles(root: string): string[] {
  const listed = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  );
  const files = new Set(listed.split("\0").filter(isTextFile));
  collectBundleFiles(path.join(root, ".next", "static"), root, files);
  collectBundleFiles(path.join(root, ".next", "server"), root, files);
  return [...files].sort();
}

function scanRepository(): { checked: number; findings: Finding[] } {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const files = repositoryFiles(root);
  const findings: Finding[] = [];

  for (const file of files) {
    const normalizedPath = file.split(path.sep).join("/");
    if (isPrivateDocumentPath(file)) {
      findings.push({ file: normalizedPath, line: 1, rule: "private-document" });
      continue;
    }

    const content = readFileSync(path.join(root, file));
    if (content.includes(0)) continue;
    findings.push(...scanText(normalizedPath, content.toString("utf8")));
  }

  return { checked: files.length, findings };
}

function main(): void {
  const result = scanRepository();
  if (result.findings.length > 0) {
    for (const finding of result.findings) {
      console.error(`${finding.file}:${finding.line}: ${finding.rule}`);
    }
    console.error(`Secret/private-document scan failed (${result.findings.length} finding(s)).`);
    process.exitCode = 1;
  } else {
    console.log(`Secret/private-document scan passed (${result.checked} files checked).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

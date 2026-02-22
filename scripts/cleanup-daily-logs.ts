/**
 * Consolidate collab run dirs for a given day into one set of markdown files per type,
 * then delete the original run dirs. Re-running merges new runs into existing day files.
 *
 * Usage:
 *   bun run scripts/cleanup-daily-logs.ts <YYYY-MM-DD> --dry-run   # show plan only
 *   bun run scripts/cleanup-daily-logs.ts <YYYY-MM-DD> --confirm   # write and delete
 */

import { readdir, readFile, writeFile, rm, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";

const RUNS_DIR = "docs/collab/runs";

const ARTIFACT_TYPES: Record<string, string[]> = {
  research: ["research.md"],
  prd: ["prd.md"],
  "implementation-log": ["implementation-log.md"],
  review: ["review.md", "review-report.md"],
  "reconciliation-check": ["reconciliation-check.md"],
};

function parseArgs(): { date: string; confirm: boolean } {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const flags = process.argv.slice(2).filter((a) => a.startsWith("-"));
  const date = args[0];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("Usage: bun run scripts/cleanup-daily-logs.ts <YYYY-MM-DD> --dry-run | --confirm");
    process.exit(1);
  }
  const confirm = flags.includes("--confirm");
  if (!confirm && !flags.includes("--dry-run")) {
    console.error("Supply either --dry-run or --confirm");
    process.exit(1);
  }
  return { date, confirm };
}

async function findRunDirsForDate(runsPath: string, date: string): Promise<{ parent: string; slug: string }[]> {
  const entries = await readdir(runsPath, { withFileTypes: true });
  const runDirs: { parent: string; slug: string }[] = [];
  const allArtifactFiles = [...new Set(Object.values(ARTIFACT_TYPES).flat())];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const parent = e.name;
    const isDay = parent === date || parent.startsWith(`${date}_`);
    if (!isDay) continue;

    const parentPath = join(runsPath, parent);
    const children = await readdir(parentPath, { withFileTypes: true });
    for (const c of children) {
      if (!c.isDirectory()) continue;
      const slug = c.name;
      const runPath = join(parentPath, slug);
      let hasArtifact = false;
      for (const f of allArtifactFiles) {
        try {
          await stat(join(runPath, f));
          hasArtifact = true;
          break;
        } catch {
          // continue
        }
      }
      if (hasArtifact) runDirs.push({ parent, slug });
    }
  }

  runDirs.sort((a, b) => a.parent.localeCompare(b.parent) || a.slug.localeCompare(b.slug));
  return runDirs;
}

async function readRunFile(
  runsPath: string,
  parent: string,
  slug: string,
  typeKey: string
): Promise<string | null> {
  const runPath = join(runsPath, parent, slug);
  const candidates = ARTIFACT_TYPES[typeKey];
  for (const f of candidates) {
    try {
      const content = await readFile(join(runPath, f), "utf-8");
      return content;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function buildConsolidated(
  runsPath: string,
  date: string,
  runDirs: { parent: string; slug: string }[],
  typeKey: string
): Promise<string> {
  const dayPath = join(runsPath, date);
  const outputFile = join(dayPath, `${typeKey}.md`);
  let existing = "";
  try {
    existing = await readFile(outputFile, "utf-8");
    if (existing.length > 0 && !existing.endsWith("\n")) existing += "\n";
  } catch {
    // no existing file
  }

  const sections: string[] = [];
  for (const { parent, slug } of runDirs) {
    const content = await readRunFile(runsPath, parent, slug, typeKey);
    if (!content) continue;
    const header = parent === date ? slug : `${parent} ${slug}`;
    sections.push(`## ${header}\n\n${content.trim()}\n`);
  }

  return existing + sections.join("\n");
}

async function main() {
  const { date, confirm } = parseArgs();
  const runsPath = join(process.cwd(), RUNS_DIR);

  const runDirs = await findRunDirsForDate(runsPath, date);
  if (runDirs.length === 0) {
    console.log(`No run dirs found for ${date}. Nothing to consolidate.`);
    return;
  }

  const dayPath = join(runsPath, date);
  const dirsToDelete = runDirs.map(({ parent, slug }) => join(runsPath, parent, slug));

  console.log(`Date: ${date}`);
  console.log(`Run dirs to merge (${runDirs.length}):`);
  runDirs.forEach(({ parent, slug }) => console.log(`  - ${parent}/${slug}`));
  console.log(`Files to write/update: ${dayPath}/`);
  Object.keys(ARTIFACT_TYPES).forEach((k) => console.log(`  - ${k}.md`));
  console.log(`Dirs to delete: ${dirsToDelete.length}`);

  if (!confirm) {
    console.log("\n[DRY-RUN] Run with --confirm to apply.");
    return;
  }

  await mkdir(dayPath, { recursive: true });

  for (const typeKey of Object.keys(ARTIFACT_TYPES)) {
    const content = await buildConsolidated(runsPath, date, runDirs, typeKey);
    if (content.trim()) {
      await writeFile(join(dayPath, `${typeKey}.md`), content, "utf-8");
      console.log(`Wrote ${date}/${typeKey}.md`);
    }
  }

  for (const dir of dirsToDelete) {
    await rm(dir, { recursive: true });
    console.log(`Deleted ${dir.replace(process.cwd(), "").replace(/\\/g, "/")}`);
  }

  const parents = [...new Set(runDirs.map((r) => r.parent))];
  for (const parent of parents) {
    if (parent === date) continue;
    const parentPath = join(runsPath, parent);
    const remaining = await readdir(parentPath).catch(() => []);
    if (remaining.length === 0) {
      await rm(parentPath, { recursive: true });
      console.log(`Removed empty parent ${parent}`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

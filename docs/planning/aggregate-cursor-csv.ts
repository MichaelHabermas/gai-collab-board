/**
 * One-off: aggregate Cursor usage CSV for AI cost analysis.
 * Usage: bun run docs/planning/aggregate-cursor-csv.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

const path = join(import.meta.dir, "cursor-usage-events-2026-02-23.csv");
const text = readFileSync(path, "utf8");
const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
const rows = lines.slice(1);

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let s = "";
      while (i < line.length && line[i] !== '"') {
        s += line[i];
        i++;
      }
      i++;
      out.push(s);
      if (line[i] === ",") i++;
    } else {
      let s = "";
      while (i < line.length && line[i] !== ",") {
        s += line[i];
        i++;
      }
      out.push(s);
      i++;
    }
  }
  return out;
}

let totalCost = 0;
let inputNoCache = 0;
let cacheRead = 0;
let outputTokens = 0;
let totalTokens = 0;
let includedCount = 0;

for (const line of rows) {
  const p = parseCsvLine(line);
  if (p.length < 10) continue;
  const kind = p[1];
  if (kind !== "Included") continue;
  includedCount++;
  totalCost += parseFloat(p[9]) || 0;
  inputNoCache += parseInt(p[5], 10) || 0;
  cacheRead += parseInt(p[6], 10) || 0;
  outputTokens += parseInt(p[7], 10) || 0;
  totalTokens += parseInt(p[8], 10) || 0;
}

const inputEquivalent = inputNoCache + cacheRead;
console.log("includedCount", includedCount);
console.log("totalCost", totalCost.toFixed(2));
console.log("inputNoCache", inputNoCache);
console.log("cacheRead", cacheRead);
console.log("inputEquivalent", inputEquivalent);
console.log("outputTokens", outputTokens);
console.log("totalTokens", totalTokens);

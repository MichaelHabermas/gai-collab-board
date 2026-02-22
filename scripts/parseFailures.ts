import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface TestFailure {
  file: string;
  testName: string;
  error: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_PATH = path.resolve(__dirname, '../.artifacts/vitest-results.json');

export function parseFailures(): TestFailure[] {
  if (!fs.existsSync(RESULTS_PATH)) {
    throw new Error('Vitest results not found.');
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

  if (!results.testResults) {
    throw new Error('Invalid Vitest JSON format.');
  }

  const failures: TestFailure[] = [];

  for (const file of results.testResults) {
    for (const test of file.assertionResults ?? []) {
      if (test.status === 'failed') {
        failures.push({
          file: file.name,
          testName: test.fullName,
          error: (test.failureMessages ?? []).join('\n'),
        });
      }
    }
  }

  return failures;
}

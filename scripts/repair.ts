// scripts/repair.ts

import { execSync } from 'child_process';
import { parseFailures, TestFailure } from './parseFailures.js';

const MAX_ITERATIONS = 5;

function runTests(): void {
  execSync('npm run test:run', { stdio: 'inherit' });
}

async function main(): Promise<void> {
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n--- Repair Iteration ${i + 1} ---`);

    try {
      runTests();
    } catch {
      // Expected if tests fail
    }

    const failures: TestFailure[] = parseFailures();

    if (failures.length === 0) {
      console.log('\n✅ All tests pass. Repair complete.');
      return;
    }

    console.log('\n❌ Failing Tests:');
    console.log(JSON.stringify(failures, null, 2));

    console.log('\n⚠️  Repair agent not yet implemented.');
    return;
  }

  console.log('\n⛔ Max iterations reached.');
}

main();

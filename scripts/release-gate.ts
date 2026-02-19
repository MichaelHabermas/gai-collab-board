import { spawnSync } from 'child_process';

interface ICommandStep {
  label: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

const runStep = (step: ICommandStep): void => {
  process.stdout.write(`\n[release-gate] ${step.label}\n`);
  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...(step.env ?? {}) },
  });

  if (result.status !== 0) {
    process.stderr.write(`[release-gate] Failed at step: ${step.label}\n`);
    process.exit(result.status ?? 1);
  }
};

const includesArg = (flag: string): boolean => {
  return process.argv.slice(2).includes(flag);
};

const run = (): void => {
  const includeE2EBenchmarks = !includesArg('--skip-e2e-benchmarks');
  const skipProxySmoke = includesArg('--skip-proxy-smoke');

  const steps: ICommandStep[] = [
    { label: 'preflight release configuration', command: 'bun', args: ['run', 'preflight:release'] },
    { label: 'build', command: 'bun', args: ['run', 'build'] },
    { label: 'typecheck', command: 'bun', args: ['run', 'typecheck'] },
    { label: 'lint', command: 'bun', args: ['run', 'lint'] },
    { label: 'unit/integration tests', command: 'bun', args: ['run', 'test:run'] },
    {
      label: 'strict sync latency benchmarks',
      command: 'bun',
      args: ['run', 'test:run', 'tests/integration/sync.latency.test.ts'],
      env: { BENCHMARK_STRICT: '1' },
    },
  ];

  if (includeE2EBenchmarks) {
    steps.push({
      label: 'strict e2e benchmark suite',
      command: 'bunx',
      args: ['playwright', 'test', 'tests/e2e/benchmark.spec.ts', '--project=chromium', '--workers=1'],
      env: { BENCHMARK_STRICT: '1' },
    });
  }

  if (!skipProxySmoke) {
    steps.push({ label: 'ai proxy smoke test', command: 'bun', args: ['run', 'smoke:ai-proxy'] });
  }

  for (const step of steps) {
    runStep(step);
  }

  process.stdout.write('\n[release-gate] All checks passed.\n');
};

run();

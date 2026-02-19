import { spawnSync } from 'child_process';

const getProjectId = (): string => {
  const projectId = (process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  return projectId;
};

const run = (): void => {
  const projectId = getProjectId();
  if (projectId === '') {
    process.stderr.write('Missing FIREBASE_PROJECT_ID (or VITE_FIREBASE_PROJECT_ID).\n');
    process.exit(1);
  }

  const args = [
    'firebase-tools',
    'deploy',
    '--only',
    'firestore:rules,database',
    '--project',
    projectId,
  ];
  const result = spawnSync('bunx', args, { stdio: 'inherit', shell: true });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  process.stdout.write('Firebase rules deployed successfully.\n');
};

run();

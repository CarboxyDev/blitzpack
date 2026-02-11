import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  FEATURE_EXCLUSIONS,
  type FeatureKey,
  type FeatureOptions,
  PROJECT_PROFILES,
} from '../src/constants.js';
import { prepareTemplateFromLocalSource } from '../src/template.js';
import { transformFiles } from '../src/transform.js';

interface MatrixCase {
  id: string;
  features: FeatureOptions;
  verifyTypecheck: boolean;
}

const ENV_FILES = [
  { from: 'apps/web/.env.example', to: 'apps/web/.env.local' },
  { from: 'apps/api/.env.example', to: 'apps/api/.env.local' },
];

const ALWAYS_EXCLUDED_PATHS = [
  'create-blitzpack',
  'apps/marketing',
  'CONTRIBUTING.md',
  'docs/create-blitzpack-scaffolding-maintenance-plan.md',
];

const FEATURE_SENTINEL_PATHS: Record<FeatureKey, string> = {
  testing: 'vitest.workspace.ts',
  admin: 'apps/web/src/app/(admin)',
  uploads: 'apps/api/src/routes/uploads.ts',
  dockerDeploy: 'deploy/docker/docker-compose.prod.yml',
  ciCd: '.github/workflows/cd.yml',
};

function profileFeatures(
  key: 'recommended' | 'platformAgnostic'
): FeatureOptions {
  const profile = PROJECT_PROFILES.find((item) => item.key === key);
  if (!profile) {
    throw new Error(`Unknown profile: ${key}`);
  }
  return profile.defaultFeatures;
}

const QUICK_MATRIX: MatrixCase[] = [
  {
    id: 'recommended',
    features: profileFeatures('recommended'),
    verifyTypecheck: true,
  },
  {
    id: 'platform-agnostic',
    features: profileFeatures('platformAgnostic'),
    verifyTypecheck: false,
  },
  {
    id: 'modular-minimal',
    features: {
      testing: false,
      admin: false,
      uploads: false,
      dockerDeploy: false,
      ciCd: false,
    },
    verifyTypecheck: true,
  },
];

const FULL_MATRIX: MatrixCase[] = [
  ...QUICK_MATRIX,
  {
    id: 'modular-admin-uploads',
    features: {
      testing: true,
      admin: true,
      uploads: true,
      dockerDeploy: false,
      ciCd: false,
    },
    verifyTypecheck: false,
  },
  {
    id: 'modular-deploy-ci',
    features: {
      testing: false,
      admin: false,
      uploads: false,
      dockerDeploy: true,
      ciCd: true,
    },
    verifyTypecheck: false,
  },
];

function isWindows(): boolean {
  return process.platform === 'win32';
}

function runCommand(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf-8',
    stdio: 'pipe',
    env: {
      ...process.env,
      CI: '1',
    },
  });

  if (result.status === 0) {
    return;
  }

  const renderedCommand = `${command} ${args.join(' ')}`.trim();
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  throw new Error(
    `Command failed (${renderedCommand}) in ${cwd}\n${output || 'No output'}`
  );
}

async function copyEnvFiles(targetDir: string): Promise<void> {
  for (const { from, to } of ENV_FILES) {
    const source = path.join(targetDir, from);
    const destination = path.join(targetDir, to);
    if (await fs.pathExists(source)) {
      await fs.copy(source, destination);
    }
  }
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileSha256(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function validateStructure(
  targetDir: string,
  matrixCase: MatrixCase
): Promise<void> {
  for (const relativePath of ALWAYS_EXCLUDED_PATHS) {
    assertCondition(
      !(await fs.pathExists(path.join(targetDir, relativePath))),
      `Unexpected path present: ${relativePath}`
    );
  }

  const lockPath = path.join(targetDir, 'pnpm-lock.yaml');
  assertCondition(
    !(await fs.pathExists(lockPath)),
    'Scaffold should not copy source pnpm-lock.yaml before install'
  );

  const readmePath = path.join(targetDir, 'README.md');
  const readme = await fs.readFile(readmePath, 'utf-8');
  assertCondition(
    !readme.includes('pnpm init:project'),
    'Generated README still references removed init:project command'
  );

  const packageJsonPath = path.join(targetDir, 'package.json');
  const rootPkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as {
    scripts?: Record<string, string>;
  };
  assertCondition(
    !rootPkg.scripts || !('init:project' in rootPkg.scripts),
    'Generated package.json contains removed init:project script'
  );
  assertCondition(
    !rootPkg.scripts || !('smoke:create-blitzpack' in rootPkg.scripts),
    'Generated package.json leaked internal smoke:create-blitzpack script'
  );
  assertCondition(
    !rootPkg.scripts || !('smoke:create-blitzpack:ci' in rootPkg.scripts),
    'Generated package.json leaked internal smoke:create-blitzpack:ci script'
  );
  assertCondition(
    !rootPkg.scripts || !('smoke:create-blitzpack:full' in rootPkg.scripts),
    'Generated package.json leaked internal smoke:create-blitzpack:full script'
  );

  const featureEntries = Object.entries(matrixCase.features) as [
    FeatureKey,
    boolean,
  ][];
  for (const [featureKey, enabled] of featureEntries) {
    const sentinelPath = FEATURE_SENTINEL_PATHS[featureKey];
    const sentinelExists = await fs.pathExists(
      path.join(targetDir, sentinelPath)
    );

    if (enabled) {
      assertCondition(
        sentinelExists,
        `Expected feature sentinel missing for ${featureKey}: ${sentinelPath}`
      );
      continue;
    }

    assertCondition(
      !sentinelExists,
      `Disabled feature sentinel still present for ${featureKey}: ${sentinelPath}`
    );

    for (const excludedPath of FEATURE_EXCLUSIONS[featureKey]) {
      assertCondition(
        !(await fs.pathExists(path.join(targetDir, excludedPath))),
        `Disabled feature path still present for ${featureKey}: ${excludedPath}`
      );
    }
  }
}

async function validateInstallStability(targetDir: string): Promise<void> {
  const pnpmCommand = isWindows() ? 'pnpm.cmd' : 'pnpm';
  runCommand(pnpmCommand, ['install', '--no-frozen-lockfile'], targetDir);

  const lockPath = path.join(targetDir, 'pnpm-lock.yaml');
  assertCondition(
    await fs.pathExists(lockPath),
    'Install did not generate pnpm-lock.yaml'
  );
  const firstHash = await fileSha256(lockPath);

  runCommand(pnpmCommand, ['install', '--no-frozen-lockfile'], targetDir);
  const secondHash = await fileSha256(lockPath);

  assertCondition(
    firstHash === secondHash,
    'pnpm-lock.yaml changed between consecutive installs'
  );
}

async function runTypecheck(targetDir: string): Promise<void> {
  const pnpmCommand = isWindows() ? 'pnpm.cmd' : 'pnpm';
  runCommand(pnpmCommand, ['typecheck'], targetDir);
}

function parseArgs(argv: string[]): {
  full: boolean;
  keepTemp: boolean;
  skipInstall: boolean;
  skipTypecheck: boolean;
} {
  return {
    full: argv.includes('--full'),
    keepTemp: argv.includes('--keep-temp'),
    skipInstall: argv.includes('--skip-install'),
    skipTypecheck: argv.includes('--skip-typecheck'),
  };
}

async function runMatrixCase(
  repoRoot: string,
  workspaceDir: string,
  matrixCase: MatrixCase,
  options: { skipInstall: boolean; skipTypecheck: boolean }
): Promise<void> {
  const targetDir = path.join(workspaceDir, matrixCase.id);
  const projectName = `smoke-${matrixCase.id}`;

  await prepareTemplateFromLocalSource(
    repoRoot,
    targetDir,
    matrixCase.features
  );
  await transformFiles(
    targetDir,
    {
      projectName,
      projectSlug: projectName,
      projectDescription: `Smoke test scaffold for ${matrixCase.id}`,
    },
    matrixCase.features
  );
  await copyEnvFiles(targetDir);
  await validateStructure(targetDir, matrixCase);

  if (!options.skipInstall) {
    await validateInstallStability(targetDir);
  }

  if (!options.skipTypecheck && matrixCase.verifyTypecheck) {
    await runTypecheck(targetDir);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const matrix = args.full ? FULL_MATRIX : QUICK_MATRIX;

  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const workspaceDir = path.join(
    os.tmpdir(),
    `blitzpack-scaffold-smoke-${Date.now()}`
  );

  await fs.ensureDir(workspaceDir);

  const failures: string[] = [];
  console.log(`Running scaffold smoke matrix (${matrix.length} cases)`);
  console.log(`Workspace: ${workspaceDir}`);

  for (const matrixCase of matrix) {
    const start = Date.now();
    process.stdout.write(`\n[${matrixCase.id}] start\n`);
    try {
      await runMatrixCase(repoRoot, workspaceDir, matrixCase, {
        skipInstall: args.skipInstall,
        skipTypecheck: args.skipTypecheck,
      });
      const duration = Date.now() - start;
      process.stdout.write(`[${matrixCase.id}] pass (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - start;
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${matrixCase.id}: ${reason}`);
      process.stdout.write(`[${matrixCase.id}] fail (${duration}ms)\n`);
    }
  }

  if (!args.keepTemp) {
    await fs.remove(workspaceDir);
  } else {
    console.log(`\nKept workspace: ${workspaceDir}`);
  }

  if (failures.length > 0) {
    console.error('\nScaffold matrix smoke checks failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nScaffold matrix smoke checks passed');
}

await main();

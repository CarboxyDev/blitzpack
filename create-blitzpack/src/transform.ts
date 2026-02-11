import fs from 'fs-extra';
import path from 'path';

import { AGENT_DOC_TEMPLATE } from './agent-doc-template.js';
import {
  type FeatureKey,
  type FeatureOptions,
  REPLACEABLE_FILES,
  type TemplateVariables,
} from './constants.js';

const TESTING_SCRIPTS = [
  'test',
  'test:unit',
  'test:integration',
  'test:watch',
  'test:coverage',
  'test:parallel',
];

const TESTING_ROOT_DEVDEPS = [
  '@testing-library/jest-dom',
  '@testing-library/react',
  '@testing-library/user-event',
  '@vitest/coverage-v8',
  'jsdom',
  'vitest',
];

const TESTING_APP_DEVDEPS = ['vitest', 'vite-tsconfig-paths'];

const UPLOADS_API_DEPS = ['@aws-sdk/client-s3', 'sharp'];

const TESTING_DIR_NAMES = new Set(['__tests__', 'test', 'tests']);
const TESTING_FILE_PATTERNS = [
  /\.test\.[^/]+$/i,
  /\.spec\.[^/]+$/i,
  /^vitest(?:\.[^.]+)*\.(?:[cm]?[jt]sx?)$/i,
  /^test-config\.(?:[cm]?[jt]sx?)$/i,
];
const TS_CONFIG_FILE_PATTERN = /^tsconfig(?:\.[^.]+)?\.json$/;
const AGENT_DOC_TARGETS = ['CLAUDE.md', 'AGENTS.md'];

const MARKER_FILES = [
  'apps/api/src/app.ts',
  'apps/api/src/plugins/services.ts',
  'apps/api/prisma/schema.prisma',
];

function stripFeatureBlocks(
  content: string,
  disabledFeatures: FeatureKey[]
): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let skipUntilEnd = false;

  for (const line of lines) {
    const featureStart = line.match(
      /^\s*(?:\/\/|<!--)\s*@feature\s+(\w+)\s*(?:-->)?\s*$/
    );
    const featureEnd = line.match(
      /^\s*(?:\/\/|<!--)\s*@endfeature\s*(?:-->)?\s*$/
    );

    if (featureStart) {
      const feature = featureStart[1] as FeatureKey;
      if (disabledFeatures.includes(feature)) {
        skipUntilEnd = true;
      }
      continue;
    }

    if (featureEnd) {
      if (skipUntilEnd) {
        skipUntilEnd = false;
      }
      continue;
    }

    if (!skipUntilEnd) {
      result.push(line);
    }
  }

  return result.join('\n');
}

function cleanEmptyLines(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n');
}

function transformPackageJson(
  content: string,
  vars: TemplateVariables,
  filePath: string,
  features: FeatureOptions
): string {
  const pkg = JSON.parse(content);

  if (filePath === 'package.json') {
    pkg.name = vars.projectSlug;
    pkg.description = vars.projectDescription;
    delete pkg.repository;
    delete pkg.homepage;
    delete pkg.scripts?.['init:project'];
    pkg.version = '0.1.0';

    if (!features.testing) {
      for (const script of TESTING_SCRIPTS) {
        delete pkg.scripts?.[script];
      }
      for (const dep of TESTING_ROOT_DEVDEPS) {
        delete pkg.devDependencies?.[dep];
      }
    }
  }

  if (
    filePath === 'apps/api/package.json' ||
    filePath === 'apps/web/package.json'
  ) {
    if (!features.testing) {
      for (const script of TESTING_SCRIPTS) {
        delete pkg.scripts?.[script];
      }
      for (const dep of TESTING_APP_DEVDEPS) {
        delete pkg.devDependencies?.[dep];
      }
    }
  }

  if (filePath === 'apps/api/package.json') {
    if (!features.uploads) {
      for (const dep of UPLOADS_API_DEPS) {
        delete pkg.dependencies?.[dep];
      }
    }
  }

  return JSON.stringify(pkg, null, 2) + '\n';
}

function transformSiteConfig(content: string, vars: TemplateVariables): string {
  return content
    .replace(/name: ['"].*['"]/, `name: '${vars.projectName}'`)
    .replace(
      /description: ['"].*['"]/,
      `description: '${vars.projectDescription}'`
    );
}

function transformLayout(content: string, vars: TemplateVariables): string {
  return content
    .replace(/title: ['"].*['"]/, `title: '${vars.projectName}'`)
    .replace(
      /description: ['"].*['"]/,
      `description: '${vars.projectDescription}'`
    );
}

function transformSwagger(content: string, vars: TemplateVariables): string {
  return content
    .replace(/title: ['"].*['"]/, `title: '${vars.projectName} API'`)
    .replace(
      /description: ['"]Production-ready TypeScript API built with Fastify['"]/,
      `description: '${vars.projectDescription}'`
    );
}

function generateReadme(vars: TemplateVariables): string {
  return `# ${vars.projectName}

${vars.projectDescription}

## Quick Start

\`\`\`bash
pnpm install
pnpm init:project
pnpm dev
\`\`\`

## What's Running

- **Web:** http://localhost:3000
- **API:** http://localhost:8080
- **API Docs:** http://localhost:8080/docs

## Project Structure

\`\`\`
${vars.projectSlug}/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend
└── packages/
    ├── types/        # Shared Zod schemas
    ├── utils/        # Shared utilities
    └── ui/           # Shared UI components
\`\`\`

## Database

\`\`\`bash
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
\`\`\`

---

Built with [Blitzpack](https://github.com/CarboxyDev/blitzpack)
`;
}

export async function transformFiles(
  targetDir: string,
  vars: TemplateVariables,
  features: FeatureOptions
): Promise<void> {
  const filesToTransform = [
    ...REPLACEABLE_FILES,
    'apps/api/package.json',
    'apps/web/package.json',
  ];

  for (const relativePath of filesToTransform) {
    const filePath = path.join(targetDir, relativePath);

    if (!(await fs.pathExists(filePath))) {
      continue;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    let transformed: string;

    if (relativePath === 'README.md') {
      transformed = generateReadme(vars);
    } else if (relativePath.endsWith('package.json')) {
      transformed = transformPackageJson(content, vars, relativePath, features);
    } else if (relativePath.includes('site.ts')) {
      transformed = transformSiteConfig(content, vars);
    } else if (relativePath.includes('layout.tsx')) {
      transformed = transformLayout(content, vars);
    } else if (relativePath.includes('swagger.ts')) {
      transformed = transformSwagger(content, vars);
    } else {
      transformed = content;
    }

    await fs.writeFile(filePath, transformed, 'utf-8');
  }

  await applyFeatureTransforms(targetDir, features);
}

async function applyFeatureTransforms(
  targetDir: string,
  features: FeatureOptions
): Promise<void> {
  const disabledFeatures: FeatureKey[] = [];
  if (!features.testing) disabledFeatures.push('testing');
  if (!features.admin) disabledFeatures.push('admin');
  if (!features.uploads) disabledFeatures.push('uploads');
  if (!features.dockerDeploy) disabledFeatures.push('dockerDeploy');
  if (!features.ciCd) disabledFeatures.push('ciCd');

  for (const relativePath of MARKER_FILES) {
    const filePath = path.join(targetDir, relativePath);
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8');
      content = stripFeatureBlocks(content, disabledFeatures);
      content = cleanEmptyLines(content);
      await fs.writeFile(filePath, content);
    }
  }

  if (!features.testing) {
    await transformForNoTesting(targetDir);
  }

  await transformAgentDocs(targetDir, disabledFeatures);
}

async function transformForNoTesting(targetDir: string): Promise<void> {
  await removeTestingArtifacts(targetDir);
  await stripTestingFromWorkspacePackageJson(targetDir);
  await stripTestingFromTsConfigs(targetDir);

  const turboPath = path.join(targetDir, 'turbo.json');
  if (await fs.pathExists(turboPath)) {
    const content = await fs.readFile(turboPath, 'utf-8');
    const turbo = JSON.parse(content);
    delete turbo.tasks?.test;
    delete turbo.tasks?.['test:unit'];
    delete turbo.tasks?.['test:integration'];
    delete turbo.tasks?.['test:watch'];
    delete turbo.tasks?.['test:coverage'];
    delete turbo.tasks?.['test:parallel'];
    await fs.writeFile(turboPath, JSON.stringify(turbo, null, 2) + '\n');
  }

  const huskyPath = path.join(targetDir, '.husky/pre-push');
  if (await fs.pathExists(huskyPath)) {
    await fs.writeFile(huskyPath, 'pnpm typecheck\n');
  }
}

function isTestingDependency(name: string): boolean {
  return (
    name === 'vitest' ||
    name.startsWith('@vitest/') ||
    name.startsWith('@testing-library/') ||
    name === 'jsdom' ||
    name === 'vite-tsconfig-paths'
  );
}

function isTestingIncludeEntry(value: string): boolean {
  return (
    value.includes('__tests__') ||
    value.includes('/test') ||
    value.includes('test/') ||
    value.includes('tests/') ||
    value.includes('.test.') ||
    value.includes('.spec.')
  );
}

async function removeTestingArtifacts(currentDir: string): Promise<void> {
  const entries = await fs.readdir(currentDir);

  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules') {
      continue;
    }

    const fullPath = path.join(currentDir, entry);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (TESTING_DIR_NAMES.has(entry)) {
        await fs.remove(fullPath);
        continue;
      }
      await removeTestingArtifacts(fullPath);
      continue;
    }

    if (TESTING_FILE_PATTERNS.some((pattern) => pattern.test(entry))) {
      await fs.remove(fullPath);
    }
  }
}

async function stripTestingFromWorkspacePackageJson(
  currentDir: string
): Promise<void> {
  const entries = await fs.readdir(currentDir);

  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules') {
      continue;
    }

    const fullPath = path.join(currentDir, entry);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await stripTestingFromWorkspacePackageJson(fullPath);
      continue;
    }

    if (entry !== 'package.json') {
      continue;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const pkg = JSON.parse(content);
    let changed = false;

    if (pkg.scripts && typeof pkg.scripts === 'object') {
      for (const scriptName of Object.keys(pkg.scripts)) {
        if (scriptName === 'test' || scriptName.startsWith('test:')) {
          delete pkg.scripts[scriptName];
          changed = true;
        }
      }
    }

    const dependencySections = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ] as const;
    for (const section of dependencySections) {
      if (!pkg[section] || typeof pkg[section] !== 'object') {
        continue;
      }
      for (const depName of Object.keys(pkg[section])) {
        if (isTestingDependency(depName)) {
          delete pkg[section][depName];
          changed = true;
        }
      }
    }

    if ('vitest' in pkg) {
      delete pkg.vitest;
      changed = true;
    }

    if (changed) {
      await fs.writeFile(fullPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  }
}

async function stripTestingFromTsConfigs(currentDir: string): Promise<void> {
  const entries = await fs.readdir(currentDir);

  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules') {
      continue;
    }

    const fullPath = path.join(currentDir, entry);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await stripTestingFromTsConfigs(fullPath);
      continue;
    }

    if (!TS_CONFIG_FILE_PATTERN.test(entry)) {
      continue;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const tsconfig = JSON.parse(content);
    let changed = false;

    const compilerOptions = tsconfig.compilerOptions;
    if (compilerOptions && typeof compilerOptions === 'object') {
      if (Array.isArray(compilerOptions.types)) {
        const nextTypes = compilerOptions.types.filter(
          (value: unknown) =>
            typeof value === 'string' &&
            !value.includes('vitest') &&
            !value.includes('@testing-library')
        );
        if (nextTypes.length !== compilerOptions.types.length) {
          compilerOptions.types = nextTypes;
          changed = true;
        }
      }

      if (compilerOptions.paths && typeof compilerOptions.paths === 'object') {
        if ('@test/*' in compilerOptions.paths) {
          delete compilerOptions.paths['@test/*'];
          changed = true;
        }
        if ('@tests/*' in compilerOptions.paths) {
          delete compilerOptions.paths['@tests/*'];
          changed = true;
        }
      }
    }

    if (Array.isArray(tsconfig.include)) {
      const nextInclude = tsconfig.include.filter(
        (value: unknown) =>
          typeof value === 'string' && !isTestingIncludeEntry(value)
      );
      if (nextInclude.length !== tsconfig.include.length) {
        tsconfig.include = nextInclude;
        changed = true;
      }
    }

    if (changed) {
      await fs.writeFile(fullPath, JSON.stringify(tsconfig, null, 2) + '\n');
    }
  }
}

async function transformAgentDocs(
  targetDir: string,
  disabledFeatures: FeatureKey[]
): Promise<void> {
  let content = stripFeatureBlocks(AGENT_DOC_TEMPLATE, disabledFeatures);
  content = cleanEmptyLines(content).trimEnd() + '\n';

  for (const fileName of AGENT_DOC_TARGETS) {
    const filePath = path.join(targetDir, fileName);
    const heading = fileName === 'AGENTS.md' ? '# AGENTS.md' : '# CLAUDE.md';
    const fileContent = content.replace(/^#\s+CLAUDE\.md/m, heading);
    await fs.writeFile(filePath, fileContent, 'utf-8');
  }
}

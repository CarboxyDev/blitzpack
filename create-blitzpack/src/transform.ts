import fs from 'fs-extra';
import path from 'path';

import {
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
  if (!features.testing) {
    await transformForNoTesting(targetDir);
  }
  if (!features.admin) {
    await transformForNoAdmin(targetDir);
  }
  if (!features.uploads) {
    await transformForNoUploads(targetDir);
  }
}

async function transformForNoTesting(targetDir: string): Promise<void> {
  const turboPath = path.join(targetDir, 'turbo.json');
  if (await fs.pathExists(turboPath)) {
    const content = await fs.readFile(turboPath, 'utf-8');
    const turbo = JSON.parse(content);
    delete turbo.tasks?.test;
    delete turbo.tasks?.['test:unit'];
    delete turbo.tasks?.['test:integration'];
    delete turbo.tasks?.['test:watch'];
    delete turbo.tasks?.['test:coverage'];
    await fs.writeFile(turboPath, JSON.stringify(turbo, null, 2) + '\n');
  }

  const huskyPath = path.join(targetDir, '.husky/pre-push');
  if (await fs.pathExists(huskyPath)) {
    await fs.writeFile(huskyPath, 'pnpm typecheck\n');
  }
}

async function transformForNoAdmin(targetDir: string): Promise<void> {
  const appPath = path.join(targetDir, 'apps/api/src/app.ts');
  if (await fs.pathExists(appPath)) {
    let content = await fs.readFile(appPath, 'utf-8');

    content = content.replace(
      /import { metricsService } from '@\/services\/metrics\.service';\n/,
      ''
    );
    content = content.replace(
      /const { default: statsRoutes } = await import\('@\/routes\/stats\.js'\);\n/,
      ''
    );
    content = content.replace(
      /const { default: metricsRoutes } = await import\('@\/routes\/metrics\.js'\);\n/,
      ''
    );
    content = content.replace(
      /const { default: adminSessionsRoutes } = await import\(\n\s*'@\/routes\/admin-sessions\.js'\n\s*\);\n/,
      ''
    );
    content = content.replace(/metricsService\.start\(\);\n\n/, '');
    content = content.replace(
      /\s*metricsService\.recordRequest\(responseTime, reply\.statusCode\);\n/,
      ''
    );
    content = content.replace(/\s*await app\.register\(statsRoutes\);/g, '');
    content = content.replace(/\s*await app\.register\(metricsRoutes\);/g, '');
    content = content.replace(
      /\s*await app\.register\(adminSessionsRoutes\);/g,
      ''
    );

    await fs.writeFile(appPath, content);
  }

  const servicesPath = path.join(targetDir, 'apps/api/src/plugins/services.ts');
  if (await fs.pathExists(servicesPath)) {
    let content = await fs.readFile(servicesPath, 'utf-8');

    content = content.replace(
      /import { StatsService } from '@\/services\/stats\.service';\n/,
      ''
    );
    content = content.replace(
      /\s*const statsService = new StatsService\(app\.prisma, app\.logger\);/,
      ''
    );
    content = content.replace(
      /\s*app\.decorate\('statsService', statsService\);/,
      ''
    );
    content = content.replace(/\s*statsService: StatsService;/, '');

    await fs.writeFile(servicesPath, content);
  }
}

async function transformForNoUploads(targetDir: string): Promise<void> {
  const appPath = path.join(targetDir, 'apps/api/src/app.ts');
  if (await fs.pathExists(appPath)) {
    let content = await fs.readFile(appPath, 'utf-8');

    content = content.replace(
      /const { default: uploadsRoutes } = await import\('@\/routes\/uploads\.js'\);\n/,
      ''
    );
    content = content.replace(
      /const { default: uploadsServeRoutes } = await import\(\n\s*'@\/routes\/uploads-serve\.js'\n\s*\);\n/,
      ''
    );
    content = content.replace(
      /await app\.register\(uploadsServeRoutes\);\n\n/,
      ''
    );
    content = content.replace(/\s*await app\.register\(uploadsRoutes\);/g, '');

    await fs.writeFile(appPath, content);
  }

  const servicesPath = path.join(targetDir, 'apps/api/src/plugins/services.ts');
  if (await fs.pathExists(servicesPath)) {
    let content = await fs.readFile(servicesPath, 'utf-8');

    content = content.replace(
      /import { FileStorageService } from '@\/services\/file-storage\.service';\n/,
      ''
    );
    content = content.replace(
      /import { UploadsService } from '@\/services\/uploads\.service';\n/,
      ''
    );
    content = content.replace(
      /\s*const fileStorageService = new FileStorageService\(env, app\.logger\);/,
      ''
    );
    content = content.replace(
      /\s*const uploadsService = new UploadsService\(\n\s*app\.prisma,\n\s*fileStorageService,\n\s*app\.logger\n\s*\);/,
      ''
    );
    content = content.replace(
      /\s*app\.decorate\('fileStorageService', fileStorageService\);/,
      ''
    );
    content = content.replace(
      /\s*app\.decorate\('uploadsService', uploadsService\);/,
      ''
    );
    content = content.replace(/\s*fileStorageService: FileStorageService;/, '');
    content = content.replace(/\s*uploadsService: UploadsService;/, '');

    await fs.writeFile(servicesPath, content);
  }

  const schemaPath = path.join(targetDir, 'apps/api/prisma/schema.prisma');
  if (await fs.pathExists(schemaPath)) {
    let content = await fs.readFile(schemaPath, 'utf-8');

    content = content.replace(/\s*uploads\s+Upload\[\]/, '');
    content = content.replace(
      /\n\nmodel Upload \{[\s\S]*?@@map\("uploads"\)\n\}/,
      ''
    );

    await fs.writeFile(schemaPath, content);
  }
}

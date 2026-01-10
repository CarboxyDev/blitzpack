export const REPLACEABLE_FILES = [
  'package.json',
  'apps/web/src/config/site.ts',
  'apps/web/src/app/layout.tsx',
  'apps/api/src/plugins/swagger.ts',
  'README.md',
];

export interface TemplateVariables {
  projectName: string;
  projectSlug: string;
  projectDescription: string;
}

export const DEFAULT_DESCRIPTION =
  'A full-stack TypeScript monorepo built with Blitzpack';

export type FeatureKey = 'testing' | 'admin' | 'uploads' | 'deployment';

export interface Feature {
  key: FeatureKey;
  name: string;
  description: string;
}

export const OPTIONAL_FEATURES: Feature[] = [
  {
    key: 'testing',
    name: 'Testing',
    description: 'vitest, integration tests, test helpers',
  },
  {
    key: 'admin',
    name: 'Admin Dashboard',
    description: 'user management, stats, sessions admin',
  },
  {
    key: 'uploads',
    name: 'File Uploads',
    description: 'S3 storage, upload routes, file components',
  },
  {
    key: 'deployment',
    name: 'Deployment',
    description: 'Dockerfile, CI/CD workflows, production configs',
  },
];

export const FEATURE_EXCLUSIONS: Record<FeatureKey, string[]> = {
  testing: [
    'vitest.workspace.ts',
    'vitest.shared.ts',
    'apps/api/test',
    'apps/api/vitest.config.ts',
    'apps/web/src/test',
    'apps/web/vitest.config.ts',
    'packages/types/src/__tests__',
    'packages/types/vitest.config.ts',
    'packages/utils/src/__tests__',
    'packages/utils/vitest.config.ts',
    'packages/ui/src/__tests__',
    'packages/ui/vitest.config.ts',
    'packages/ui/vitest.setup.ts',
    'packages/ui/test-config.js',
    'apps/web/src/hooks/api/__tests__',
  ],
  admin: [
    'apps/web/src/app/(admin)',
    'apps/web/src/components/admin',
    'apps/web/src/hooks/api/use-admin-sessions.ts',
    'apps/web/src/hooks/api/use-admin-stats.ts',
    'apps/web/src/hooks/use-realtime-metrics.ts',
    'apps/api/src/routes/admin-sessions.ts',
    'apps/api/src/routes/stats.ts',
    'apps/api/src/routes/metrics.ts',
    'apps/api/src/services/stats.service.ts',
    'apps/api/src/services/metrics.service.ts',
    'packages/types/src/stats.ts',
  ],
  uploads: [
    'apps/api/src/routes/uploads.ts',
    'apps/api/src/routes/uploads-serve.ts',
    'apps/api/src/services/uploads.service.ts',
    'apps/api/src/services/file-storage.service.ts',
    'apps/api/public/uploads',
    'apps/web/src/hooks/api/use-uploads.ts',
    'packages/ui/src/file-upload-input.tsx',
    'packages/types/src/upload.ts',
  ],
  deployment: [
    'Dockerfile',
    'Dockerfile.web',
    'docker-compose.prod.yml',
    '.github',
  ],
};

export interface FeatureOptions {
  testing: boolean;
  admin: boolean;
  uploads: boolean;
  deployment: boolean;
}

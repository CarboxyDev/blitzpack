import fs from 'fs-extra';
import { downloadTemplate } from 'giget';
import type { Ora } from 'ora';
import path from 'path';

import {
  FEATURE_EXCLUSIONS,
  type FeatureKey,
  type FeatureOptions,
} from './constants.js';

const GITHUB_REPO = 'github:CarboxyDev/blitzpack';

const POST_DOWNLOAD_EXCLUDES = [
  'create-blitzpack',
  'apps/marketing',
  'CONTRIBUTING.md',
  'docs/create-blitzpack-scaffolding-maintenance-plan.md',
  'pnpm-lock.yaml',
];
const LOCAL_COPY_EXCLUDES = new Set([
  '.git',
  'node_modules',
  '.pnpm-store',
  '.turbo',
  '.temp',
]);

function getFeatureExclusions(features: FeatureOptions): string[] {
  const exclusions: string[] = [];
  for (const [key, enabled] of Object.entries(features)) {
    if (!enabled) {
      exclusions.push(...FEATURE_EXCLUSIONS[key as FeatureKey]);
    }
  }
  return exclusions;
}

async function cleanupExcludes(
  targetDir: string,
  additionalExcludes: string[] = []
): Promise<void> {
  const allExcludes = [...POST_DOWNLOAD_EXCLUDES, ...additionalExcludes];
  for (const exclude of allExcludes) {
    const fullPath = path.join(targetDir, exclude);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }
}

function shouldCopyFromLocalSource(
  sourceDir: string,
  currentPath: string
): boolean {
  const relativePath = path.relative(sourceDir, currentPath);
  if (!relativePath || relativePath === '.') {
    return true;
  }

  const segments = relativePath.split(path.sep);
  return !segments.some((segment) => LOCAL_COPY_EXCLUDES.has(segment));
}

export async function downloadAndPrepareTemplate(
  targetDir: string,
  spinner: Ora,
  features: FeatureOptions
): Promise<void> {
  spinner.text = 'Fetching template from GitHub...';
  await downloadTemplate(GITHUB_REPO, {
    dir: targetDir,
    force: true,
  });

  spinner.text = 'Extracting files...';
  await new Promise((resolve) => setTimeout(resolve, 100));

  spinner.text = 'Cleaning up template files...';
  const featureExclusions = getFeatureExclusions(features);
  await cleanupExcludes(targetDir, featureExclusions);

  const files = await countFiles(targetDir);
  spinner.succeed(`Downloaded template (${files} files)`);
}

export async function prepareTemplateFromLocalSource(
  sourceDir: string,
  targetDir: string,
  features: FeatureOptions
): Promise<void> {
  await fs.copy(sourceDir, targetDir, {
    filter: (sourcePath) => shouldCopyFromLocalSource(sourceDir, sourcePath),
  });

  const featureExclusions = getFeatureExclusions(features);
  await cleanupExcludes(targetDir, featureExclusions);
}

async function countFiles(dir: string): Promise<number> {
  try {
    let count = 0;
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        count += await countFiles(fullPath);
      } else {
        count++;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

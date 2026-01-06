import chalk from 'chalk';
import prompts from 'prompts';

import {
  DEFAULT_DESCRIPTION,
  type FeatureOptions,
  OPTIONAL_FEATURES,
} from './constants.js';
import { isDockerRunning } from './docker.js';
import { getCurrentDirName, toSlug, validateProjectName } from './utils.js';

export interface ProjectOptions {
  projectName: string;
  projectSlug: string;
  projectDescription: string;
  skipGit: boolean;
  skipInstall: boolean;
  useCurrentDir: boolean;
  features: FeatureOptions;
}

export async function getProjectOptions(
  providedName?: string,
  flags: { skipGit?: boolean; skipInstall?: boolean } = {}
): Promise<ProjectOptions | null> {
  const questions: prompts.PromptObject[] = [];

  if (!providedName) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-app',
      validate: (value: string) => {
        const result = validateProjectName(value);
        if (!result.valid) {
          return result.problems?.[0] || 'Invalid project name';
        }
        return true;
      },
    });
  }

  questions.push({
    type: 'text',
    name: 'projectDescription',
    message: 'Project description:',
    initial: DEFAULT_DESCRIPTION,
  });

  let cancelled = false;
  const response = await prompts(questions, {
    onCancel: () => {
      cancelled = true;
    },
  });

  if (cancelled) {
    return null;
  }

  const projectName = providedName || response.projectName;
  const validation = validateProjectName(projectName);

  if (!validation.valid) {
    console.log(`Invalid project name: ${validation.problems?.[0]}`);
    return null;
  }

  const features = await promptFeatureSelection();
  if (!features) {
    return null;
  }

  const useCurrentDir = projectName === '.';
  const actualProjectName = useCurrentDir ? getCurrentDirName() : projectName;

  return {
    projectName: actualProjectName,
    projectSlug: toSlug(actualProjectName),
    projectDescription: response.projectDescription || DEFAULT_DESCRIPTION,
    skipGit: flags.skipGit || false,
    skipInstall: flags.skipInstall || false,
    useCurrentDir,
    features,
  };
}

async function promptFeatureSelection(): Promise<FeatureOptions | null> {
  const featureChoices = OPTIONAL_FEATURES.map((feature) => ({
    title: `${feature.name} ${chalk.dim(`(${feature.description})`)}`,
    value: feature.key,
    selected: true,
  }));

  let cancelled = false;
  const { selectedFeatures } = await prompts(
    {
      type: 'multiselect',
      name: 'selectedFeatures',
      message: 'Include optional features:',
      choices: featureChoices,
      hint: '- Space to toggle, Enter to confirm',
      instructions: false,
    },
    {
      onCancel: () => {
        cancelled = true;
      },
    }
  );

  if (cancelled) {
    return null;
  }

  const selected = selectedFeatures || [];
  return {
    testing: selected.includes('testing'),
    admin: selected.includes('admin'),
    uploads: selected.includes('uploads'),
  };
}

export async function promptAutomaticSetup(): Promise<boolean> {
  const dockerRunning = isDockerRunning();

  if (!dockerRunning) {
    console.log();
    console.log(
      chalk.yellow('  ⚠'),
      'Docker is not running. Skipping automatic setup.'
    );
    console.log(
      chalk.dim('    Start Docker and run setup steps manually (see below).')
    );
    console.log();
    return false;
  }

  console.log();
  const { runSetup } = await prompts({
    type: 'confirm',
    name: 'runSetup',
    message: 'Run initial setup now? (docker compose + database migrations)',
    initial: true,
  });

  return runSetup || false;
}

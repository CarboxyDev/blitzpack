import chalk from 'chalk';
import prompts from 'prompts';

import {
  APP_FEATURES,
  DEFAULT_DESCRIPTION,
  DEPLOYMENT_FEATURES,
  type FeatureOptions,
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
  let cancelled = false;

  const { setupType } = await prompts(
    {
      type: 'select',
      name: 'setupType',
      message: 'Project profile:',
      choices: [
        {
          title: 'Recommended',
          description: 'all app features + Docker deploy assets + CD workflow',
          value: 'recommended',
        },
        {
          title: 'Platform-First',
          description: 'all app features, no deployment assets',
          value: 'platform',
        },
        {
          title: 'Custom',
          description: 'choose app and deployment features',
          value: 'customize',
        },
      ],
      initial: 0,
      hint: '- Use arrow-keys, Enter to submit',
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

  if (setupType === 'recommended') {
    return {
      testing: true,
      admin: true,
      uploads: true,
      dockerDeploy: true,
      ciCd: true,
    };
  }

  if (setupType === 'platform') {
    return {
      testing: true,
      admin: true,
      uploads: true,
      dockerDeploy: false,
      ciCd: false,
    };
  }

  const appFeatureChoices = APP_FEATURES.map((feature) => ({
    title: feature.name,
    description: feature.description,
    value: feature.key,
    selected: true,
  }));

  const { selectedAppFeatures } = await prompts(
    {
      type: 'multiselect',
      name: 'selectedAppFeatures',
      message: 'Select app features:',
      choices: appFeatureChoices,
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

  const deploymentFeatureChoices = DEPLOYMENT_FEATURES.map((feature) => ({
    title: feature.name,
    description: feature.description,
    value: feature.key,
    selected: false,
  }));

  const { selectedDeploymentFeatures } = await prompts(
    {
      type: 'multiselect',
      name: 'selectedDeploymentFeatures',
      message: 'Select deployment options (optional):',
      choices: deploymentFeatureChoices,
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

  const selectedApp = selectedAppFeatures || [];
  const selectedDeployment = selectedDeploymentFeatures || [];
  const includesCiCd = selectedDeployment.includes('ciCd');
  const includesDockerDeploy =
    selectedDeployment.includes('dockerDeploy') || includesCiCd;

  if (includesCiCd && !selectedDeployment.includes('dockerDeploy')) {
    console.log();
    console.log(
      chalk.dim(
        '  ℹ CD workflow requires Docker deployment assets, enabling both.'
      )
    );
  }

  return {
    testing: selectedApp.includes('testing'),
    admin: selectedApp.includes('admin'),
    uploads: selectedApp.includes('uploads'),
    dockerDeploy: includesDockerDeploy,
    ciCd: includesCiCd,
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
    message:
      'Run local setup now? (start PostgreSQL with Docker + run migrations)',
    initial: true,
  });

  return runSetup || false;
}

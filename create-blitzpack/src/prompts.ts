import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  note,
  select,
  text,
} from '@clack/prompts';
import chalk from 'chalk';

import {
  APP_FEATURES,
  DEFAULT_DESCRIPTION,
  DEPLOYMENT_FEATURES,
  type FeatureKey,
  type FeatureOptions,
  PROJECT_PROFILES,
  type ProjectProfileKey,
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

interface WizardState {
  projectNameInput: string;
  projectDescription: string;
  profileKey: ProjectProfileKey;
  selectedFeatures: FeatureKey[];
}

type WizardStage = 'details' | 'profile' | 'features' | 'review';

const FEATURE_LABELS: Record<FeatureKey, string> = {
  testing: 'Testing',
  admin: 'Admin Dashboard',
  uploads: 'File Uploads',
  dockerDeploy: 'Docker deploy assets',
  ciCd: 'CD workflow',
};

const FEATURE_HINTS: Record<FeatureKey, string> = {
  testing: 'Vitest, integration tests, and test helpers',
  admin: 'Admin routes, dashboard views, and management hooks',
  uploads: 'Upload APIs, storage service, and UI upload components',
  dockerDeploy: 'API/Web Dockerfiles and production Docker Compose',
  ciCd: 'GitHub Actions workflow for image build and publish',
};

function handleCancelledPrompt<T>(value: T | symbol): T | null {
  if (isCancel(value)) {
    cancel('Setup cancelled.');
    return null;
  }
  return value as T;
}

function getEnabledFeatureKeys(features: FeatureOptions): FeatureKey[] {
  return (Object.keys(features) as FeatureKey[]).filter((key) => features[key]);
}

function deriveProfileFeatureSelection(
  profileKey: ProjectProfileKey
): FeatureKey[] {
  const profile =
    PROJECT_PROFILES.find((item) => item.key === profileKey) ??
    PROJECT_PROFILES[0];
  return getEnabledFeatureKeys(profile.defaultFeatures);
}

function resolveFeatureSelection(selected: FeatureKey[]): FeatureKey[] {
  const unique = Array.from(new Set(selected));
  const hasCiCd = unique.includes('ciCd');
  const hasDockerDeploy = unique.includes('dockerDeploy');

  if (hasCiCd && !hasDockerDeploy) {
    return [...unique.filter((key) => key !== 'dockerDeploy'), 'dockerDeploy'];
  }

  return unique;
}

function buildFeatureOptions(selectedFeatures: FeatureKey[]): FeatureOptions {
  const normalized = resolveFeatureSelection(selectedFeatures);

  return {
    testing: normalized.includes('testing'),
    admin: normalized.includes('admin'),
    uploads: normalized.includes('uploads'),
    dockerDeploy: normalized.includes('dockerDeploy'),
    ciCd: normalized.includes('ciCd'),
  };
}

function printWizardStep(step: number, total: number, title: string): void {
  console.log();
  console.log(chalk.bold(`  Step ${step}/${total}`), chalk.dim(title));
  console.log();
}

function getStepTotal(profileKey: ProjectProfileKey): number {
  return profileKey === 'modular' ? 4 : 2;
}

function printMultiselectControls(): void {
  console.log(
    chalk.dim('  Controls: ↑/↓ navigate • Space toggle • Enter confirm')
  );
  console.log();
}

function printConfigurationSummary(
  profileName: string,
  features: FeatureOptions
): void {
  const lines = [
    `${chalk.dim('Profile')}: ${profileName}`,
    `${chalk.dim('Testing')}: ${features.testing ? 'yes' : 'no'}`,
    `${chalk.dim('Admin dashboard')}: ${features.admin ? 'yes' : 'no'}`,
    `${chalk.dim('File uploads')}: ${features.uploads ? 'yes' : 'no'}`,
    `${chalk.dim('Docker deploy assets')}: ${features.dockerDeploy ? 'yes' : 'no'}`,
    `${chalk.dim('CD workflow')}: ${features.ciCd ? 'yes' : 'no'}`,
  ];

  note(lines.join('\n'), chalk.cyan('Configuration summary'));
}

function finalizeOptions(
  state: WizardState,
  providedName: string | undefined,
  flags: { skipGit?: boolean; skipInstall?: boolean }
): ProjectOptions | null {
  const projectName = providedName || state.projectNameInput;
  const validation = validateProjectName(projectName);

  if (!validation.valid) {
    console.log();
    console.log(
      chalk.red('  ✖'),
      validation.problems?.[0] ?? 'Invalid project name'
    );
    return null;
  }

  const useCurrentDir = projectName === '.';
  const actualProjectName = useCurrentDir ? getCurrentDirName() : projectName;

  return {
    projectName: actualProjectName,
    projectSlug: toSlug(actualProjectName),
    projectDescription: state.projectDescription || DEFAULT_DESCRIPTION,
    skipGit: flags.skipGit || false,
    skipInstall: flags.skipInstall || false,
    useCurrentDir,
    features: buildFeatureOptions(state.selectedFeatures),
  };
}

export async function getProjectOptions(
  providedName?: string,
  flags: { skipGit?: boolean; skipInstall?: boolean } = {}
): Promise<ProjectOptions | null> {
  const initialProjectName = providedName || 'my-app';
  const initialProfileKey: ProjectProfileKey = 'recommended';

  const state: WizardState = {
    projectNameInput: initialProjectName,
    projectDescription: DEFAULT_DESCRIPTION,
    profileKey: initialProfileKey,
    selectedFeatures: deriveProfileFeatureSelection(initialProfileKey),
  };

  let stage: WizardStage = 'details';

  while (true) {
    if (stage === 'details') {
      printWizardStep(1, getStepTotal(state.profileKey), 'Project details');

      if (!providedName) {
        const projectNameInput = handleCancelledPrompt(
          await text({
            message: chalk.cyan('Project name'),
            initialValue: state.projectNameInput,
            validate: (value) => {
              if (typeof value !== 'string') {
                return 'Project name is required';
              }
              const result = validateProjectName(value);
              return result.valid
                ? undefined
                : (result.problems?.[0] ?? 'Invalid project name');
            },
          })
        );
        if (projectNameInput === null) {
          return null;
        }
        state.projectNameInput = projectNameInput;
      } else {
        console.log(chalk.dim('  Project name:'), chalk.white(providedName));
      }

      const descriptionInput = handleCancelledPrompt(
        await text({
          message: chalk.cyan('Project description'),
          initialValue: state.projectDescription,
        })
      );
      if (descriptionInput === null) {
        return null;
      }
      state.projectDescription = descriptionInput;
      stage = 'profile';
      continue;
    }

    if (stage === 'profile') {
      printWizardStep(
        2,
        getStepTotal(state.profileKey),
        'Choose a setup preset'
      );

      const profileAction = handleCancelledPrompt(
        await select({
          message: chalk.cyan('Setup preset'),
          options: [
            ...PROJECT_PROFILES.map((profile) => ({
              value: profile.key,
              label: profile.name,
              hint: profile.description,
            })),
            {
              value: '__back__',
              label: 'Back',
              hint: 'Return to project details',
            },
          ],
          initialValue: state.profileKey,
        })
      );
      if (profileAction === null) {
        return null;
      }

      if (profileAction === '__back__') {
        stage = 'details';
        continue;
      }

      state.profileKey = profileAction as ProjectProfileKey;
      state.selectedFeatures = deriveProfileFeatureSelection(state.profileKey);

      if (state.profileKey !== 'modular') {
        const result = finalizeOptions(state, providedName, flags);
        if (!result) {
          stage = 'details';
          continue;
        }
        return result;
      }

      stage = 'features';
      continue;
    }

    if (stage === 'features') {
      const isModular = state.profileKey === 'modular';
      printWizardStep(
        3,
        4,
        isModular ? 'Select features' : 'Deployment options'
      );

      if (isModular) {
        printMultiselectControls();

        const selectedFeatures = handleCancelledPrompt(
          await multiselect({
            message: chalk.cyan('Select features'),
            options: [...APP_FEATURES, ...DEPLOYMENT_FEATURES].map(
              (feature) => ({
                value: feature.key,
                label: FEATURE_LABELS[feature.key],
                hint: FEATURE_HINTS[feature.key],
              })
            ),
            initialValues: state.selectedFeatures,
            required: false,
          })
        );
        if (selectedFeatures === null) {
          return null;
        }

        state.selectedFeatures = resolveFeatureSelection(
          selectedFeatures as FeatureKey[]
        );

        if (
          state.selectedFeatures.includes('ciCd') &&
          !selectedFeatures.includes('dockerDeploy')
        ) {
          console.log();
          console.log(
            chalk.dim(
              '  ℹ CD workflow requires Docker deployment assets, enabling both.'
            )
          );
        }
      }

      const nextAction = handleCancelledPrompt(
        await select({
          message: chalk.cyan('Continue'),
          options: [
            {
              value: 'review',
              label: 'Review configuration',
            },
            {
              value: 'profile',
              label: 'Back',
              hint: 'Return to preset selection',
            },
          ],
          initialValue: 'review',
        })
      );
      if (nextAction === null) {
        return null;
      }

      stage = nextAction as WizardStage;
      continue;
    }

    const profile =
      PROJECT_PROFILES.find((item) => item.key === state.profileKey) ??
      PROJECT_PROFILES[0];
    const options = finalizeOptions(state, providedName, flags);

    if (!options) {
      stage = 'details';
      continue;
    }
    const features = options.features;

    const reviewStep = state.profileKey === 'modular' ? 4 : 3;
    printWizardStep(
      reviewStep,
      getStepTotal(state.profileKey),
      'Review and confirm'
    );
    printConfigurationSummary(profile.name, features);

    const reviewOptions = [
      {
        value: 'create',
        label: 'Create project',
      },
      {
        value: 'profile',
        label: 'Edit preset',
      },
      {
        value: 'details',
        label: 'Edit project details',
      },
    ];

    if (state.profileKey === 'modular') {
      reviewOptions.splice(1, 0, {
        value: 'features',
        label: 'Edit features',
      });
    }

    const reviewAction = handleCancelledPrompt(
      await select({
        message: chalk.cyan('Ready to scaffold?'),
        options: reviewOptions,
        initialValue: 'create',
      })
    );
    if (reviewAction === null) {
      return null;
    }

    if (reviewAction !== 'create') {
      stage = reviewAction as WizardStage;
      continue;
    }

    return options;
  }
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
  const runSetup = handleCancelledPrompt(
    await confirm({
      message: 'Run local setup now? (Docker PostgreSQL + database migrations)',
      initialValue: true,
    })
  );

  if (runSetup === null) {
    return false;
  }

  return runSetup;
}

import { confirm, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import ora, { type Ora } from 'ora';
import path from 'path';

import { runPreflightChecks } from '../checks.js';
import type { FeatureOptions } from '../constants.js';
import { runDatabaseMigrations, runDockerCompose } from '../docker.js';
import { initGit, isGitInstalled } from '../git.js';
import { getProjectOptions, promptAutomaticSetup } from '../prompts.js';
import { downloadAndPrepareTemplate } from '../template.js';
import { transformFiles } from '../transform.js';
import { printError, printHeader, printSuccess } from '../utils.js';

const ENV_FILES = [
  { from: 'apps/web/.env.example', to: 'apps/web/.env.local' },
  { from: 'apps/api/.env.example', to: 'apps/api/.env.local' },
];

async function copyEnvFiles(targetDir: string): Promise<void> {
  for (const { from, to } of ENV_FILES) {
    const source = path.join(targetDir, from);
    const dest = path.join(targetDir, to);
    if (await fs.pathExists(source)) {
      await fs.copy(source, dest);
    }
  }
}

function runInstall(cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const child = spawn(isWindows ? 'pnpm.cmd' : 'pnpm', ['install'], {
      cwd,
      stdio: 'ignore',
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function installGitHooks(cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const child = spawn(isWindows ? 'pnpm.cmd' : 'pnpm', ['exec', 'husky'], {
      cwd,
      stdio: 'ignore',
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

interface CreateFlags {
  skipGit?: boolean;
  skipInstall?: boolean;
  dryRun?: boolean;
}

function renderProgressBar(current: number, total: number): string {
  const width = 28;
  const clampedTotal = Math.max(total, 1);
  const ratio = Math.min(Math.max(current / clampedTotal, 0), 1);
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const filledBar = chalk.cyan('█'.repeat(filled));
  const emptyBar = chalk.dim('░'.repeat(empty));
  const percentage = `${Math.round(ratio * 100)}`.padStart(3, ' ');
  return `[${filledBar}${emptyBar}] ${percentage}%`;
}

function renderStepTrack(step: number, total: number): string {
  const segments: string[] = [];

  for (let index = 1; index <= total; index++) {
    if (index < step) {
      segments.push(chalk.green('●'));
    } else if (index === step) {
      segments.push(chalk.cyan('◆'));
    } else {
      segments.push(chalk.dim('◇'));
    }
  }

  return segments.join(chalk.dim('──'));
}

function printStepHeader(step: number, total: number, title: string): void {
  const completed = step - 1;
  console.log();
  console.log(chalk.cyan(`  Step ${step}/${total}`), chalk.bold(title));
  console.log(`  ${renderProgressBar(completed, total)}`);
  console.log(`  ${renderStepTrack(step, total)}`);
}

function printDryRun(options: {
  projectName: string;
  projectSlug: string;
  projectDescription: string;
  targetDir: string;
  skipGit: boolean;
  skipInstall: boolean;
  features: FeatureOptions;
}): void {
  console.log(chalk.yellow('  Dry run mode - no changes will be made'));
  console.log();
  console.log(chalk.bold('  Would create:'));
  console.log();
  console.log(`    ${chalk.cyan('Directory:')}    ${options.targetDir}`);
  console.log(`    ${chalk.cyan('Name:')}         ${options.projectName}`);
  console.log(`    ${chalk.cyan('Slug:')}         ${options.projectSlug}`);
  console.log(
    `    ${chalk.cyan('Description:')}  ${options.projectDescription}`
  );
  console.log();
  console.log(chalk.bold('  Features:'));
  console.log();
  const featureStatus = (enabled: boolean) =>
    enabled ? chalk.green('✓') : chalk.red('✗');
  console.log(
    `    ${featureStatus(options.features.testing)} Testing ${chalk.dim('(vitest, integration tests)')}`
  );
  console.log(
    `    ${featureStatus(options.features.admin)} Admin Dashboard ${chalk.dim('(user management, stats)')}`
  );
  console.log(
    `    ${featureStatus(options.features.uploads)} File Uploads ${chalk.dim('(S3 storage, upload routes)')}`
  );
  console.log(
    `    ${featureStatus(options.features.dockerDeploy)} Docker Deployment ${chalk.dim('(API/Web Dockerfiles, production compose)')}`
  );
  console.log(
    `    ${featureStatus(options.features.ciCd)} CD Workflow ${chalk.dim('(GitHub Actions image build/push)')}`
  );
  console.log();
  console.log(chalk.bold('  Would run:'));
  console.log();
  console.log(`    ${chalk.dim('•')} Download template from GitHub`);
  console.log(`    ${chalk.dim('•')} Transform package.json files`);
  console.log(`    ${chalk.dim('•')} Create .env.local files`);
  if (!options.skipInstall) {
    console.log(`    ${chalk.dim('•')} Install dependencies (pnpm install)`);
  }
  if (!options.skipGit) {
    console.log(`    ${chalk.dim('•')} Initialize git repository`);
  }
  console.log();
}

export async function create(
  projectName: string | undefined,
  flags: CreateFlags
): Promise<void> {
  printHeader();

  // Check requirements (Node.js and pnpm)
  const checksPass = await runPreflightChecks();
  if (!checksPass) {
    process.exit(1);
  }

  const options = await getProjectOptions(projectName, flags);
  if (!options) {
    return;
  }

  const targetDir = options.useCurrentDir
    ? process.cwd()
    : path.resolve(process.cwd(), options.projectName);

  if (flags.dryRun) {
    printDryRun({
      projectName: options.projectName,
      projectSlug: options.projectSlug,
      projectDescription: options.projectDescription,
      targetDir,
      skipGit: options.skipGit,
      skipInstall: options.skipInstall,
      features: options.features,
    });
    return;
  }

  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      if (options.useCurrentDir) {
        const shouldContinue = await confirm({
          message: 'Current directory is not empty. Continue?',
          initialValue: false,
        });

        if (isCancel(shouldContinue) || !shouldContinue) {
          return;
        }
      } else {
        printError(`Directory "${options.projectName}" is not empty`);
        return;
      }
    }
  }

  const shouldRunSetup = await promptAutomaticSetup();
  const totalSteps =
    2 +
    (options.skipGit ? 0 : 1) +
    (options.skipInstall ? 0 : 1) +
    (shouldRunSetup ? 1 : 0);
  let currentStep = 0;
  let spinner: Ora | undefined;
  let installSucceeded = false;

  try {
    currentStep += 1;
    printStepHeader(currentStep, totalSteps, 'Scaffold template');
    spinner = ora('Downloading template from GitHub...').start();
    await downloadAndPrepareTemplate(targetDir, spinner, options.features);

    currentStep += 1;
    printStepHeader(currentStep, totalSteps, 'Configure project files');
    spinner.start('Applying template transforms...');
    await transformFiles(
      targetDir,
      {
        projectName: options.projectName,
        projectSlug: options.projectSlug,
        projectDescription: options.projectDescription,
      },
      options.features
    );
    await copyEnvFiles(targetDir);
    spinner.succeed('Configured project');

    if (!options.skipInstall) {
      currentStep += 1;
      printStepHeader(currentStep, totalSteps, 'Install dependencies');
      spinner.start('Installing dependencies...');
      installSucceeded = await runInstall(targetDir);
      if (installSucceeded) {
        spinner.succeed('Installed dependencies');
      } else {
        spinner.warn(
          'Failed to install dependencies. Run "pnpm install" manually.'
        );
      }
    }

    if (!options.skipGit && isGitInstalled()) {
      currentStep += 1;
      printStepHeader(currentStep, totalSteps, 'Initialize git repository');
      spinner.start('Initializing git repository...');
      const gitSuccess = initGit(targetDir);
      if (gitSuccess) {
        if (installSucceeded) {
          spinner.start('Installing git hooks...');
          const hooksSuccess = await installGitHooks(targetDir);
          if (hooksSuccess) {
            spinner.succeed('Initialized git repository');
          } else {
            spinner.warn(
              'Initialized git repository, but failed to install git hooks'
            );
          }
        } else {
          spinner.succeed('Initialized git repository');
        }
      } else {
        spinner.warn('Failed to initialize git repository');
      }
    } else if (!options.skipGit) {
      currentStep += 1;
      printStepHeader(currentStep, totalSteps, 'Initialize git repository');
      spinner.warn('Skipped git initialization (git not installed)');
    }

    let ranAutomaticSetup = false;

    if (shouldRunSetup) {
      currentStep += 1;
      printStepHeader(currentStep, totalSteps, 'Run local database setup');
      spinner.start('Starting PostgreSQL database...');
      const dockerSuccess = runDockerCompose(targetDir);
      if (dockerSuccess) {
        spinner.succeed('Started PostgreSQL database');

        spinner.start('Running database migrations...');
        const migrationsSuccess = runDatabaseMigrations(targetDir);
        if (migrationsSuccess) {
          spinner.succeed('Database migrations complete');
          ranAutomaticSetup = true;
        } else {
          spinner.warn(
            'Failed to run migrations. Run "pnpm db:migrate" manually.'
          );
        }
      } else {
        spinner.warn(
          'Failed to start Docker. Run "docker compose up -d" manually.'
        );
      }
    }

    printSuccess(
      options.projectName,
      options.useCurrentDir ? '.' : options.projectName,
      ranAutomaticSetup
    );
  } catch (error) {
    spinner?.fail();
    printError(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    process.exit(1);
  }
}

import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';

import { isDockerInstalled } from './docker.js';
import { isGitInstalled } from './git.js';

interface CheckResult {
  passed: boolean;
  name: string;
  required: boolean;
  message: string;
}

function checkNodeVersion(): CheckResult {
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

    if (majorVersion >= 20) {
      return {
        passed: true,
        name: 'Node.js',
        required: true,
        message: nodeVersion,
      };
    }

    return {
      passed: false,
      name: 'Node.js',
      required: true,
      message: `Node.js >= 20.0.0 required (found ${nodeVersion})`,
    };
  } catch {
    return {
      passed: false,
      name: 'Node.js',
      required: true,
      message: 'Failed to check Node.js version',
    };
  }
}

function checkPnpmInstalled(): CheckResult {
  try {
    const version = execSync('pnpm --version', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return {
      passed: true,
      name: 'pnpm',
      required: true,
      message: `v${version}`,
    };
  } catch {
    return {
      passed: false,
      name: 'pnpm',
      required: true,
      message: 'pnpm not found. Install: npm install -g pnpm',
    };
  }
}

function checkGit(): CheckResult {
  const installed = isGitInstalled();
  return {
    passed: installed,
    name: 'git',
    required: false,
    message: installed
      ? 'available (repository initialization supported)'
      : 'not found (git init step will be skipped)',
  };
}

function checkDocker(): CheckResult {
  const installed = isDockerInstalled();
  return {
    passed: installed,
    name: 'Docker',
    required: false,
    message: installed
      ? 'available (automatic local DB setup supported)'
      : 'not found (start PostgreSQL separately)',
  };
}

export async function runPreflightChecks(): Promise<boolean> {
  console.log();
  console.log(chalk.bold('  System readiness'));
  console.log(chalk.dim('  Validating required and optional local tooling...'));
  console.log();

  const checks: CheckResult[] = [
    checkNodeVersion(),
    checkPnpmInstalled(),
    checkGit(),
    checkDocker(),
  ];

  const requiredFailures: CheckResult[] = [];
  const optionalWarnings: CheckResult[] = [];

  for (const check of checks) {
    const spinner = ora(`Checking ${check.name}...`).start();

    if (check.passed) {
      spinner.succeed(chalk.bold(check.name));
    } else {
      if (check.required) {
        requiredFailures.push(check);
        spinner.fail(chalk.bold(check.name));
      } else {
        optionalWarnings.push(check);
        spinner.warn(chalk.bold(check.name));
      }
      console.log(chalk.dim(`    ${check.message}`));
    }
  }

  console.log();

  if (optionalWarnings.length > 0) {
    console.log(chalk.yellow('  Optional tools missing:'));
    for (const warning of optionalWarnings) {
      console.log(chalk.dim(`    • ${warning.name}: ${warning.message}`));
    }
    console.log();
  }

  if (requiredFailures.length > 0) {
    console.log(
      chalk.red('  ✖'),
      'Required dependencies are missing. Fix the items below and try again:'
    );
    for (const failure of requiredFailures) {
      console.log(chalk.dim(`    • ${failure.name}: ${failure.message}`));
    }
    console.log();
    return false;
  }

  return true;
}

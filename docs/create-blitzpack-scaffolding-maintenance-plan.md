# create-blitzpack Scaffolding Maintenance Plan

## Goal

Make feature toggles deterministic and low-maintenance, especially for `testing=false`, by moving from exclusion-heavy cleanup to composition/allowlist generation.

## Current Problem

- Current scaffolding starts from a full repo copy, then removes files with feature exclusions.
- This is brittle:
  - New test files/configs are easy to miss.
  - Config references (scripts, tsconfig, turbo, hooks) can remain after file deletions.
  - Regressions are likely unless exclusions are constantly maintained.

## Long-Term Direction (Recommended)

Adopt an allowlist/composition model:

1. Define `core` template content that always exists.
2. Define per-feature manifests for additive content:
   - `testing`
   - `admin`
   - `uploads`
   - `dockerDeploy`
   - `ciCd`
3. Scaffold by copying only:
   - `core`
   - enabled feature manifests
4. Run deterministic transforms for naming and metadata only (not for broad cleanup).

## Required Work

1. Introduce manifest format

- `create-blitzpack/src/manifests/*.ts` (or JSON)
- Each manifest includes:
  - files/directories to include
  - package mutations (scripts/deps)
  - config mutations (turbo/tsconfig/husky if needed)

2. Restructure template source

- Keep a single canonical source, but annotate ownership clearly:
  - core-owned files
  - feature-owned files
- Split mixed files where possible to reduce complex conditional transforms.

3. Replace exclusion flow

- Replace `FEATURE_EXCLUSIONS`-first pruning with `buildInclusionPlan(features)`.
- Copy only planned files into target dir.

4. Centralize config mutation

- One utility for JSON mutations across:
  - all workspace `package.json` files
  - all `tsconfig*.json`
  - `turbo.json`
  - `.husky/pre-push`
- Feature-specific mutations should be data-driven from manifests.

5. Add scaffold validation matrix

- Add automated checks that scaffold into temp dirs for combinations:
  - Recommended
  - Platform-First
  - Custom (`testing=false`, etc.)
- Assertions should verify:
  - forbidden files absent
  - forbidden script/dependency/config references absent
  - minimal sanity commands pass (`pnpm typecheck` or selected smoke checks)

## Rollout Plan

1. Phase 1: Foundation

- Add manifest schema + inclusion planner + validation harness.

2. Phase 2: Testing feature migration

- Migrate `testing` first (highest churn/risk area).
- Keep existing behavior for other features temporarily.

3. Phase 3: Remaining features

- Migrate `admin`, `uploads`, `dockerDeploy`, `ciCd`.
- Remove legacy exclusion logic.

4. Phase 4: Stabilization

- Enforce matrix checks in CI for `create-blitzpack`.

## Acceptance Criteria

- `testing=false` scaffold contains:
  - no `__tests__`, no `test` directories, no `*.test.*`, no `*.spec.*`
  - no Vitest/testing-library dependencies/scripts/types/config references
- Feature combinations are reproducible and validated by automated checks.
- Adding a new test file/config in the source template cannot leak unless explicitly mapped.

## What We Are Doing Now (Short-Term Safety Patch)

Before full migration, we are hardening the current approach by:

1. Glob-based removal of test artifacts when `testing=false`.
2. Cross-workspace cleanup of test scripts/dependencies/references.
3. Config cleanup (`tsconfig`, `turbo`, husky) for no-testing scaffolds.

This reduces immediate leakage risk while we prepare the long-term composition model.

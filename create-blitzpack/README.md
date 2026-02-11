# create-blitzpack

CLI tool to scaffold a new Blitzpack project - full-stack TypeScript monorepo with Next.js and Fastify.

## Usage

```bash
pnpm create blitzpack
```

## Options

```bash
pnpm create blitzpack [project-name] [options]
```

- `[project-name]` - Name of the project (prompted if not provided)
- `--skip-git` - Skip git initialization
- `--skip-install` - Skip dependency installation
- `--dry-run` - Preview changes without creating files

## What You Get

- **Web**: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui
- **API**: Fastify 5 + Prisma 7 + PostgreSQL + Better Auth
- **Monorepo**: Turborepo + pnpm workspaces
- **Production-ready app stack**: Auth, admin dashboard, logging, validation, testing
- **Optional deployment assets**: Dockerfiles + production compose + CD workflow

## Setup Profiles

The scaffold wizard supports three profiles:

- **Recommended**: Core app with everything included.
- **Platform-Agnostic**: Core app without dockerfiles.
- **Modular**: Core app with features of your choice.

Each profile is a setup path. The **Modular** path opens full feature customization before files are created.

## Requirements

- Node.js ≥20.0.0
- pnpm ≥9.0.0
- Docker (for PostgreSQL)

## Next Steps

After scaffolding:

```bash
cd your-project
docker compose up -d       # Start PostgreSQL
pnpm db:migrate           # Run migrations
pnpm dev                  # Start development
```

## Documentation

Full documentation: [github.com/CarboxyDev/blitzpack](https://github.com/CarboxyDev/blitzpack)

## Scaffold Smoke Checks (Repository Maintenance)

Run from repository root:

```bash
pnpm smoke:create-blitzpack
```

For a wider matrix:

```bash
pnpm smoke:create-blitzpack:full
```

## License

MIT

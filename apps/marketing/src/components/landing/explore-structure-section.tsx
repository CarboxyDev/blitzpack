'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  File,
  FileCode,
  FileJson,
  Folder,
  FolderOpen,
  Settings,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

type FileIconType =
  | 'folder'
  | 'file'
  | 'typescript'
  | 'json'
  | 'config'
  | 'prisma';

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  icon?: FileIconType;
  description?: string;
  children?: TreeNode[];
  highlight?: boolean;
}

const FILE_TREE: TreeNode[] = [
  {
    name: 'apps',
    type: 'folder',
    description: 'Application packages',
    children: [
      {
        name: 'web',
        type: 'folder',
        description: 'Next.js frontend',
        children: [
          {
            name: 'src',
            type: 'folder',
            children: [
              {
                name: 'app',
                type: 'folder',
                description: 'App Router pages',
                highlight: true,
                children: [
                  {
                    name: '(auth)',
                    type: 'folder',
                    description: 'Login, signup, password reset',
                  },
                  {
                    name: '(dashboard)',
                    type: 'folder',
                    description: 'Protected dashboard area',
                  },
                  {
                    name: 'admin',
                    type: 'folder',
                    description: 'Admin panel with user management',
                  },
                  {
                    name: 'layout.tsx',
                    type: 'file',
                    icon: 'typescript',
                  },
                  {
                    name: 'page.tsx',
                    type: 'file',
                    icon: 'typescript',
                  },
                ],
              },
              {
                name: 'components',
                type: 'folder',
                description: 'Reusable React components',
              },
              {
                name: 'hooks',
                type: 'folder',
                description: 'Custom hooks for auth, queries, UI',
              },
              {
                name: 'lib',
                type: 'folder',
                description: 'API client, auth config, utilities',
                children: [
                  {
                    name: 'api.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'Type-safe API client',
                    highlight: true,
                  },
                  {
                    name: 'auth.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'Better Auth client config',
                  },
                  {
                    name: 'queries.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'TanStack Query hooks',
                  },
                ],
              },
              {
                name: 'store',
                type: 'folder',
                description: 'Jotai atoms for global state',
              },
            ],
          },
          {
            name: 'next.config.ts',
            type: 'file',
            icon: 'typescript',
          },
          {
            name: 'tailwind.config.ts',
            type: 'file',
            icon: 'typescript',
          },
        ],
      },
      {
        name: 'api',
        type: 'folder',
        description: 'Fastify backend with Prisma',
        children: [
          {
            name: 'src',
            type: 'folder',
            children: [
              {
                name: 'routes',
                type: 'folder',
                description: 'API endpoints',
                highlight: true,
                children: [
                  {
                    name: 'auth.routes.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'Better Auth integration',
                  },
                  {
                    name: 'users.routes.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'User CRUD with RBAC',
                  },
                  {
                    name: 'admin.routes.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'Admin-only operations',
                  },
                  {
                    name: 'uploads.routes.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'S3 file uploads',
                  },
                ],
              },
              {
                name: 'services',
                type: 'folder',
                description: 'Business logic layer',
                children: [
                  {
                    name: 'auth.service.ts',
                    type: 'file',
                    icon: 'typescript',
                  },
                  {
                    name: 'user.service.ts',
                    type: 'file',
                    icon: 'typescript',
                  },
                  {
                    name: 'email.service.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'Resend integration',
                  },
                  {
                    name: 'upload.service.ts',
                    type: 'file',
                    icon: 'typescript',
                  },
                ],
              },
              {
                name: 'plugins',
                type: 'folder',
                description: 'Fastify plugins',
                children: [
                  {
                    name: 'auth.plugin.ts',
                    type: 'file',
                    icon: 'typescript',
                    description: 'Better Auth setup',
                  },
                  {
                    name: 'cors.plugin.ts',
                    type: 'file',
                    icon: 'typescript',
                  },
                  {
                    name: 'rate-limit.plugin.ts',
                    type: 'file',
                    icon: 'typescript',
                  },
                ],
              },
              {
                name: 'hooks',
                type: 'folder',
                description: 'Request lifecycle hooks',
              },
              {
                name: 'app.ts',
                type: 'file',
                icon: 'typescript',
                description: 'Fastify app factory',
              },
              {
                name: 'server.ts',
                type: 'file',
                icon: 'typescript',
                description: 'Server entry point',
              },
            ],
          },
          {
            name: 'prisma',
            type: 'folder',
            description: 'Database schema and migrations',
            highlight: true,
            children: [
              {
                name: 'schema.prisma',
                type: 'file',
                icon: 'prisma',
                description: 'User, Session, Account models',
                highlight: true,
              },
              {
                name: 'migrations',
                type: 'folder',
                description: 'Version-controlled migrations',
              },
              {
                name: 'seed.ts',
                type: 'file',
                icon: 'typescript',
                description: 'Database seeding script',
              },
            ],
          },
          {
            name: 'emails',
            type: 'folder',
            description: 'React Email templates',
            children: [
              {
                name: 'verification-email.tsx',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'password-reset-email.tsx',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'welcome-email.tsx',
                type: 'file',
                icon: 'typescript',
              },
            ],
          },
          {
            name: 'test',
            type: 'folder',
            description: 'Integration & unit tests',
            children: [
              {
                name: 'integration',
                type: 'folder',
              },
              {
                name: 'helpers',
                type: 'folder',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'packages',
    type: 'folder',
    description: 'Shared code across all apps',
    children: [
      {
        name: 'types',
        type: 'folder',
        description: 'Shared TypeScript types and Zod schemas',
        highlight: true,
        children: [
          {
            name: 'src',
            type: 'folder',
            children: [
              {
                name: 'user.ts',
                type: 'file',
                icon: 'typescript',
                description: 'User types with role definitions',
              },
              {
                name: 'api-response.ts',
                type: 'file',
                icon: 'typescript',
                description: 'Standardized API responses',
              },
              {
                name: 'pagination.ts',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'session.ts',
                type: 'file',
                icon: 'typescript',
              },
            ],
          },
        ],
      },
      {
        name: 'ui',
        type: 'folder',
        description: 'shadcn/ui components',
        children: [
          {
            name: 'src',
            type: 'folder',
            children: [
              {
                name: 'button.tsx',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'form.tsx',
                type: 'file',
                icon: 'typescript',
                description: 'React Hook Form integration',
              },
              {
                name: 'data-table',
                type: 'folder',
                description: 'Feature-rich data table',
              },
              {
                name: 'dialog.tsx',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'sidebar.tsx',
                type: 'file',
                icon: 'typescript',
              },
            ],
          },
        ],
      },
      {
        name: 'utils',
        type: 'folder',
        description: 'Shared utility functions',
        children: [
          {
            name: 'src',
            type: 'folder',
            children: [
              {
                name: 'errors.ts',
                type: 'file',
                icon: 'typescript',
                description: 'Custom error classes',
              },
              {
                name: 'string.ts',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'date.ts',
                type: 'file',
                icon: 'typescript',
              },
              {
                name: 'async.ts',
                type: 'file',
                icon: 'typescript',
              },
            ],
          },
        ],
      },
      {
        name: 'tailwind-config',
        type: 'folder',
        description: 'Shared Tailwind theme',
      },
    ],
  },
  {
    name: 'package.json',
    type: 'file',
    icon: 'json',
    description: 'Root package with workspace scripts',
  },
  {
    name: 'pnpm-workspace.yaml',
    type: 'file',
    icon: 'config',
    description: 'pnpm workspace configuration',
  },
  {
    name: 'turbo.json',
    type: 'file',
    icon: 'json',
    description: 'Turborepo task pipelines',
    highlight: true,
  },
  {
    name: 'docker-compose.yml',
    type: 'file',
    icon: 'config',
    description: 'PostgreSQL dev database',
    highlight: true,
  },
  {
    name: 'tsconfig.base.json',
    type: 'file',
    icon: 'json',
    description: 'Shared TypeScript config',
  },
  {
    name: 'vitest.workspace.ts',
    type: 'file',
    icon: 'typescript',
    description: 'Vitest workspace config',
  },
  {
    name: 'eslint.config.ts',
    type: 'file',
    icon: 'typescript',
    description: 'ESLint flat config',
  },
  {
    name: 'CLAUDE.md',
    type: 'file',
    icon: 'file',
    description: 'AI assistant context',
    highlight: true,
  },
];

function getFileIcon(
  type: 'file' | 'folder',
  icon?: FileIconType,
  isOpen?: boolean
) {
  if (type === 'folder') {
    return isOpen ? (
      <FolderOpen className="h-4 w-4 text-amber-500" />
    ) : (
      <Folder className="h-4 w-4 text-amber-500/80" />
    );
  }

  switch (icon) {
    case 'typescript':
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-500" />;
    case 'config':
      return <Settings className="h-4 w-4 text-slate-400" />;
    case 'prisma':
      return <FileCode className="text-primary h-4 w-4" />;
    default:
      return <File className="text-muted-foreground h-4 w-4" />;
  }
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  hoveredPath: string | null;
  setHoveredPath: (path: string | null) => void;
  path: string;
}

function TreeItem({
  node,
  depth,
  expandedPaths,
  toggleExpand,
  hoveredPath,
  setHoveredPath,
  path,
}: TreeItemProps) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedPaths.has(path);
  const isHovered = hoveredPath === path;
  const hasChildren = isFolder && node.children && node.children.length > 0;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
          isHovered && 'bg-primary/10',
          node.highlight && !isHovered && 'bg-primary/5'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => isFolder && toggleExpand(path)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isFolder) toggleExpand(path);
          }
        }}
        onMouseEnter={() => setHoveredPath(path)}
        onMouseLeave={() => setHoveredPath(null)}
      >
        {hasChildren && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="shrink-0"
          >
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          </motion.div>
        )}
        {!hasChildren && isFolder && <div className="w-3.5" />}

        <span className="shrink-0">
          {getFileIcon(node.type, node.icon, isExpanded)}
        </span>

        <span
          className={cn(
            'text-sm transition-colors',
            isHovered ? 'text-foreground' : 'text-foreground/80',
            node.highlight && 'text-primary font-medium'
          )}
        >
          {node.name}
        </span>

        {node.description && isHovered && (
          <span className="text-muted-foreground ml-2 hidden truncate text-xs lg:block">
            — {node.description}
          </span>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children!.map((child) => (
              <TreeItem
                key={`${path}/${child.name}`}
                node={child}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
                hoveredPath={hoveredPath}
                setHoveredPath={setHoveredPath}
                path={`${path}/${child.name}`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExploreStructureSection() {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['apps', 'apps/web', 'apps/api', 'packages'])
  );
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allPaths = new Set<string>();
    const collectPaths = (nodes: TreeNode[], parentPath = '') => {
      for (const node of nodes) {
        const path = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.type === 'folder') {
          allPaths.add(path);
          if (node.children) {
            collectPaths(node.children, path);
          }
        }
      }
    };
    collectPaths(FILE_TREE);
    setExpandedPaths(allPaths);
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-foreground mb-4 text-3xl font-semibold tracking-tight lg:text-5xl">
          Explore the Structure
        </h2>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
          See exactly what you get. A thoughtfully organized monorepo with clear
          boundaries and shared packages.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-card border-border relative overflow-hidden rounded-xl border"
        style={{
          filter: 'drop-shadow(0 0 40px hsl(var(--primary) / 0.08))',
        }}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="text-muted-foreground ml-3 font-mono text-xs">
              ~/blitzpack
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded px-2 py-1 text-xs transition-colors"
            >
              Expand all
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={collapseAll}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded px-2 py-1 text-xs transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto p-4 font-mono lg:max-h-[560px]">
          {FILE_TREE.map((node) => (
            <TreeItem
              key={node.name}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              hoveredPath={hoveredPath}
              setHoveredPath={setHoveredPath}
              path={node.name}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

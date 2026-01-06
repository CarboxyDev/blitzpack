'use client';

import { motion } from 'framer-motion';
import {
  Check,
  Database,
  type LucideIcon,
  Mail,
  Server,
  ShieldCheck,
  UserCog,
  Wrench,
} from 'lucide-react';
import React from 'react';

interface Feature {
  icon: LucideIcon;
  title: string;
  highlights: string[];
}

const FEATURES: Feature[] = [
  {
    icon: ShieldCheck,
    title: 'Authentication',
    highlights: [
      'Login & Signup flows',
      'Email verification & password reset',
      'Google and GitHub OAuth',
      'Session management with refresh',
      'Role-based access control',
    ],
  },
  {
    icon: Server,
    title: 'API Infrastructure',
    highlights: [
      'Zod validation everywhere',
      'Structured logging with Pino',
      'Rate limiting built-in',
      'Auto-generated API docs',
      'Testing infrastructure',
    ],
  },
  {
    icon: Database,
    title: 'Database',
    highlights: [
      'Prisma ORM with PostgreSQL',
      'Migration system',
      'Database seeding',
      'Docker Compose setup',
    ],
  },
  {
    icon: UserCog,
    title: 'Admin Dashboard',
    highlights: [
      'Live metrics & analytics',
      'User CRUD operations',
      'Session management',
      'Easily extendable',
    ],
  },
  {
    icon: Mail,
    title: 'Email System',
    highlights: [
      'React Email templates',
      'Verification & reset emails',
      'Welcome emails',
      'Resend integration',
    ],
  },
  {
    icon: Wrench,
    title: 'Developer Tooling',
    highlights: [
      'CLI setup wizard',
      'Vitest testing suite',
      'Git hooks & CI/CD',
      'ESLint & Prettier',
    ],
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

function FeatureCard({ feature }: { feature: Feature }) {
  const { icon: Icon, title, highlights } = feature;

  return (
    <motion.div
      variants={item}
      className="border-border bg-card hover:border-primary/30 group relative flex h-full flex-col rounded-xl border p-6 transition-colors duration-200"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-foreground text-lg font-semibold">{title}</h3>
      </div>

      <ul className="flex flex-col gap-2.5">
        {highlights.map((text) => (
          <li key={text} className="flex items-center gap-2.5">
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="h-2.5 w-2.5 text-emerald-500" strokeWidth={3} />
            </div>
            <span className="text-muted-foreground text-sm">{text}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function IncludedSection() {
  return (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-foreground mb-3 text-3xl font-semibold tracking-tight lg:text-4xl">
          What's Included
        </h2>
        <p className="text-muted-foreground text-base lg:text-lg">
          Production-ready features, configured and working out of the box.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </motion.div>
    </div>
  );
}

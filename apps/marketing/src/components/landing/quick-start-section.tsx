'use client';

import { motion } from 'framer-motion';
import { Check, Copy, Terminal } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

const COMMAND = 'pnpm create blitzpack';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

export function QuickStartSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (copied) return;

    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [copied]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-100px' }}
      className="relative space-y-12"
    >
      {/* Grid background - extended further down */}
      <div className="pointer-events-none absolute -inset-x-20 -bottom-32 -top-16 z-0 overflow-hidden rounded-2xl">
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundPosition: ['0px 0px', '40px 40px'],
          }}
          transition={{
            duration: 12,
            ease: 'linear',
            repeat: Infinity,
          }}
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(156 163 175 / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(156 163 175 / 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="from-background/80 to-background/80 absolute inset-0 bg-gradient-to-r via-transparent" />
        <div className="from-background/80 to-background/80 absolute inset-0 bg-gradient-to-b via-transparent" />
      </div>

      <motion.div variants={item} className="relative z-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <Terminal className="text-primary h-7 w-7 lg:h-8 lg:w-8" />
          <h2 className="text-foreground text-3xl font-semibold tracking-tight lg:text-5xl">
            Quick Start
          </h2>
        </div>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
          Get up and running in seconds. One command is all you need.
        </p>
      </motion.div>

      <motion.div variants={item} className="relative z-10 flex justify-center">
        <div className="group relative w-full max-w-3xl">
          <div className="bg-card border-border relative rounded-xl border shadow-lg">
            {/* Terminal header */}
            <div className="border-border bg-muted/50 flex h-10 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">
                terminal
              </span>
              <div className="w-[52px]" />
            </div>

            {/* Terminal content */}
            <div className="relative flex flex-col items-center gap-6 p-6 sm:p-8 lg:flex-row lg:justify-between lg:p-8">
              {/* Command display */}
              <div className="flex items-center gap-3 font-mono text-base sm:gap-4 sm:text-lg lg:text-xl">
                <span className="text-primary font-bold">$</span>
                <span className="text-foreground break-all font-medium tracking-wide sm:break-normal">
                  {COMMAND}
                </span>
              </div>

              {/* Copy button */}
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold shadow-md transition-all duration-300',
                  copied
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/40'
                )}
              >
                <motion.div
                  initial={false}
                  animate={
                    copied
                      ? {
                          scale: [1, 1.3, 1],
                          rotate: [0, -15, 15, 0],
                        }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                  {copied ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </motion.div>
                <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
              </motion.button>
            </div>

            {/* Bottom accent line */}
            <div className="from-primary/0 via-primary/50 to-primary/0 h-px bg-gradient-to-r" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

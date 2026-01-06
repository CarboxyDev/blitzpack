import React from 'react';

import { cn } from '@/lib/utils';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SectionContainer({
  children,
  className,
  id,
}: SectionContainerProps): React.ReactElement {
  return (
    <section id={id} className={cn('w-full py-20 lg:py-28', className)}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">{children}</div>
    </section>
  );
}

import { ThemeToggle } from '@repo/packages-ui/theme-toggle';
import React from 'react';

import { GitHubStarButton } from '@/components/github-star-button';
import { ExploreStructureSection } from '@/components/landing/explore-structure-section';
import { FAQSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { Footer } from '@/components/landing/footer';
import { HeroSection } from '@/components/landing/hero-section';
import { IncludedSection } from '@/components/landing/included-section';
import { QuickStartSection } from '@/components/landing/quick-start-section';
import { SectionContainer } from '@/components/landing/section-container';
import { TechStackSection } from '@/components/landing/tech-stack-section';
import { WhySection } from '@/components/landing/why-section';
import { StructuredData } from '@/components/structured-data';

export default function Home() {
  return (
    <main className="bg-background relative flex min-h-screen flex-col">
      <StructuredData type="software" />
      <StructuredData type="organization" />
      <StructuredData type="website" />
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6 md:right-8 md:top-8 lg:fixed">
        <GitHubStarButton />
        <ThemeToggle />
      </div>

      <SectionContainer className="pt-28">
        <HeroSection />
      </SectionContainer>

      <SectionContainer>
        <WhySection />
      </SectionContainer>

      <SectionContainer>
        <FeaturesSection />
      </SectionContainer>

      <SectionContainer>
        <IncludedSection />
      </SectionContainer>

      <SectionContainer>
        <ExploreStructureSection />
      </SectionContainer>

      <SectionContainer id="quick-start">
        <QuickStartSection />
      </SectionContainer>

      <SectionContainer>
        <TechStackSection />
      </SectionContainer>

      <SectionContainer>
        <FAQSection />
      </SectionContainer>

      <Footer />
    </main>
  );
}

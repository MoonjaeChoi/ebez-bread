'use client';

import React from 'react';
import { Header } from './header';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  withHeader?: boolean;
}

export function PageLayout({ children, className, withHeader = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {withHeader && <Header />}
      
      <main className={cn(
        'flex-1',
        withHeader ? 'pt-0' : 'pt-16',
        className
      )}>
        {children}
      </main>
    </div>
  );
}
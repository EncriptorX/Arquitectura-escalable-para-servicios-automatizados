import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-gray-900 border border-gray-800 rounded-2xl", className)}>
      {children}
    </div>
  );
}

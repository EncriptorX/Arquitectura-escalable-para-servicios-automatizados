import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  children: ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export function Alert({ children, variant = 'default', className }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variant === 'destructive' && "border-red-500 bg-red-50 text-red-900",
        variant === 'default' && "border-gray-800 bg-gray-900 text-white",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ children }: { children: ReactNode }) {
  return <h5 className="mb-1 font-medium leading-none tracking-tight">{children}</h5>;
}

export function AlertDescription({ children }: { children: ReactNode }) {
  return <div className="text-sm opacity-90">{children}</div>;
}

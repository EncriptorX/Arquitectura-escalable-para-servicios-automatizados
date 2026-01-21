import { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed w-full top-0 z-40 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-cyan-400" size={32} />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SecurePerimeter
            </span>
          </div>
        </div>
      </header>
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

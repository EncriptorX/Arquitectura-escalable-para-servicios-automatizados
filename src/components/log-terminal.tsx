import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LogTerminalProps {
  logs: string[];
  className?: string;
}

export function LogTerminal({ logs, className }: LogTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={terminalRef}
      className={cn(
        "bg-black border border-gray-800 rounded-xl p-4 overflow-y-auto font-mono text-sm text-gray-200",
        className
      )}
    >
      {logs.length === 0 ? (
        <div className="text-gray-500 italic">Waiting for logs...</div>
      ) : (
        logs.map((log, idx) => (
          <div key={idx} className="mb-1">
            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>{' '}
            <span>{log}</span>
          </div>
        ))
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Task } from './use-tasks';

interface TaskStreamData {
  progress: number;
  logs: string[];
  status: string;
  nameservers?: string[];
  requiredActions?: string[];
}

export function useTaskStream(taskId: string, initialTask: Task | null): TaskStreamData {
  const [progress, setProgress] = useState(initialTask?.progress || 0);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState(initialTask?.status || 'pending');
  const [nameservers, setNameservers] = useState<string[]>([]);
  const [requiredActions, setRequiredActions] = useState<string[]>([]);

  useEffect(() => {
    if (!taskId || !initialTask) return;

    // Simulate streaming updates
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 5, 100);
        if (next === 100) {
          setStatus('completed');
        }
        return next;
      });

      setLogs((prev) => [
        ...prev,
        `Processing step ${Math.floor(Math.random() * 100)}...`,
      ]);
    }, 2000);

    // Simulate nameserver assignment
    setTimeout(() => {
      setNameservers([
        'ns1.cloudflare.com',
        'ns2.cloudflare.com',
      ]);
      setStatus('waiting_dns');
      setRequiredActions(['Update nameservers at your domain registrar']);
    }, 3000);

    return () => clearInterval(interval);
  }, [taskId, initialTask]);

  return {
    progress,
    logs,
    status,
    nameservers,
    requiredActions,
  };
}

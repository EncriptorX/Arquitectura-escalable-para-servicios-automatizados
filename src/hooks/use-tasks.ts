import { useState, useEffect } from 'react';

export interface Task {
  id: string;
  targetUrls: string[];
  serviceTier: string;
  status: string;
  progress: number;
  createdAt: string;
}

export function useTask(taskId: string) {
  const [data, setData] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }

    // Simulate API call
    const fetchTask = async () => {
      try {
        setIsLoading(true);
        // Mock data - replace with actual API call
        const mockTask: Task = {
          id: taskId,
          targetUrls: ['example.com'],
          serviceTier: 'premium',
          status: 'processing',
          progress: 50,
          createdAt: new Date().toISOString(),
        };
        
        setTimeout(() => {
          setData(mockTask);
          setIsLoading(false);
        }, 500);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  return { data, isLoading, error };
}

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { User, AppConfig } from '../types';

export const useAdminData = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, configRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/app-config'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    users,
    setUsers,
    config,
    setConfig,
    loading,
    fetchData,
  };
};

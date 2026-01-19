import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FiltersProps {
  filterProject: string;
  setFilterProject: (value: string) => void;
  filterUser: string;
  setFilterUser: (value: string) => void;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}

export const Filters = ({
  filterProject,
  setFilterProject,
  filterUser,
  setFilterUser,
  projects,
  users,
  t,
}: FiltersProps) => {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />
      <Select value={filterProject} onValueChange={setFilterProject}>
        <SelectTrigger className="w-40 bg-white/5 border-white/10">
          <SelectValue placeholder={t('allProjects')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allProjects')}</SelectItem>
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterUser} onValueChange={setFilterUser}>
        <SelectTrigger className="w-40 bg-white/5 border-white/10">
          <SelectValue placeholder={t('allUsers')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allUsers')}</SelectItem>
          {users.map(u => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

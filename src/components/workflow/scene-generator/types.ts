import type { Project, ImageProvider, Scene } from '@/types/project';
import type { RegenerationRequest, ProjectPermissions, ProjectRole } from '@/types/collaboration';

export interface Step3Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export interface UserApiKeys {
  hasKieKey: boolean;
  kieImageModel: string;
}

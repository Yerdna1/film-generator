import type { StateCreator } from '../types';
import { debounceSync } from '../utils';

export interface NavigationSlice {
  setCurrentStep: (projectId: string, step: number) => void;
  nextStep: (projectId: string) => void;
  previousStep: (projectId: string) => void;
}

export const createNavigationSlice: StateCreator<NavigationSlice> = (set, get) => ({
  setCurrentStep: (projectId, step) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, currentStep: step, updatedAt: new Date().toISOString() } : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, currentStep: step, updatedAt: new Date().toISOString() }
          : state.currentProject,
    }));

    debounceSync(async () => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStep: step }),
        });
      } catch (error) {
        console.error('Error syncing current step to DB:', error);
      }
    });
  },

  nextStep: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (project && project.currentStep < 6) {
      get().setCurrentStep(projectId, project.currentStep + 1);
    }
  },

  previousStep: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (project && project.currentStep > 1) {
      get().setCurrentStep(projectId, project.currentStep - 1);
    }
  },
});

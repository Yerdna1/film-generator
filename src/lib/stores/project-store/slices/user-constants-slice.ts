import type { StateCreator, UserConstants } from '../types';

export interface UserConstantsSlice {
  loadUserConstants: () => Promise<void>;
  updateUserConstants: (constants: Partial<UserConstants>) => Promise<void>;
}

export const createUserConstantsSlice: StateCreator<UserConstantsSlice> = (set, get) => ({
  loadUserConstants: async () => {
    try {
      const response = await fetch('/api/user/constants');
      if (response.ok) {
        const data = await response.json();
        set({ userConstants: data });
      }
    } catch (error) {
      console.error('Error loading user constants:', error);
      // Set defaults if fetch fails
      set({
        userConstants: {
          characterImageProvider: 'gemini',
          characterAspectRatio: '1:1',
          sceneImageProvider: 'gemini',
          sceneImageResolution: '2k',
          sceneAspectRatio: '16:9',
          videoResolution: 'hd',
        },
      });
    }
  },

  updateUserConstants: async (constants: Partial<UserConstants>) => {
    try {
      const response = await fetch('/api/user/constants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(constants),
      });

      if (response.ok) {
        const data = await response.json();
        set({ userConstants: data });
      }
    } catch (error) {
      console.error('Error updating user constants:', error);
    }
  },
});

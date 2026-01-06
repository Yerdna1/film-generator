import type { CameraShot, DialogueLine } from '@/types/project';

// Data for editing an existing scene (includes all dialogue fields with IDs)
export interface EditSceneData {
  title: string;
  description: string;
  cameraShot: CameraShot;
  textToImagePrompt: string;
  imageToVideoPrompt: string;
  dialogue: DialogueLine[];
}

// Data for creating a new scene (dialogue without IDs - IDs are generated on save)
export type NewSceneDialogueLine = Omit<DialogueLine, 'id' | 'audioUrl'>;

export interface NewSceneData {
  title: string;
  description: string;
  cameraShot: CameraShot;
  dialogue: NewSceneDialogueLine[];
}

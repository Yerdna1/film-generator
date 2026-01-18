// Export base class
export { BaseMusicProvider } from './base-music-provider';

// Export all music providers
export { ModalMusicProvider } from './modal-provider';
export { KieMusicProvider } from './kie-provider';
export { PiapiMusicProvider } from './piapi-provider';
export { SunoMusicProvider } from './suno-provider';

// Import to ensure they are registered
import './modal-provider';
import './kie-provider';
import './piapi-provider';
import './suno-provider';
// Export base class
export { BaseImageProvider } from './base-image-provider';

// Export all image providers
export { GeminiImageProvider } from './gemini-provider';
export { ModalImageProvider, ModalEditImageProvider } from './modal-provider';
export { KieImageProvider } from './kie-provider';

// Import to ensure they are registered
import './gemini-provider';
import './modal-provider';
import './kie-provider';
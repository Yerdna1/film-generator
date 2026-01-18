import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { BaseImageProvider } from './base-image-provider';
import { ProviderAuthError, ProviderValidationError, ProviderRateLimitError } from '../types';
import { RegisterProvider } from '../provider-factory';

@RegisterProvider('image', 'gemini', {
  description: 'Google Gemini image generation with Imagen 3',
  features: [
    'High-quality image generation',
    'Multiple aspect ratios',
    'Character consistency with reference images',
    'Fast generation',
    '2k and 4k resolution support'
  ],
  costPerUnit: 0.02,
  isAsync: false,
})
export class GeminiImageProvider extends BaseImageProvider {
  name = 'gemini';

  async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ProviderValidationError('Gemini API key is required', this.name);
    }

    // Test API key validity
    try {
      const google = createGoogleGenerativeAI({ apiKey: this.config.apiKey });
      // Simple test to validate API key
      await generateText({
        model: google('gemini-3-pro-image-preview'),
        messages: [{ role: 'user', content: 'test' }],
        maxRetries: 0,
      }).catch(() => {
        // Expected to fail, we just want to check if auth fails
      });
    } catch (error: any) {
      if (error?.message?.includes('API key') || error?.message?.includes('authentication')) {
        throw new ProviderAuthError('Invalid Gemini API key', this.name);
      }
    }
  }

  async generateImage(
    prompt: string,
    aspectRatio: string,
    resolution: string,
    referenceImages?: Array<{ name: string; imageUrl: string }>
  ): Promise<{ base64: string; mimeType: string }> {
    const google = createGoogleGenerativeAI({ apiKey: this.config.apiKey });

    // Build message content with optional reference images
    const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> = [];

    // Process reference images
    if (referenceImages && referenceImages.length > 0) {
      const processedImages = await this.processReferenceImages(referenceImages);

      for (const img of processedImages) {
        messageContent.push({
          type: 'image',
          image: img.base64Data,
          mimeType: img.mimeType
        });
        messageContent.push({
          type: 'text',
          text: `(Above: ${img.name} - use this EXACT character appearance)`
        });
      }
    }

    messageContent.push({ type: 'text', text: prompt });

    try {
      const result = await generateText({
        model: google('gemini-3-pro-image-preview'),
        messages: [{ role: 'user', content: messageContent }],
        providerOptions: {
          google: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio },
          },
        },
      });

      const generatedImage = result.files?.[0];
      if (!generatedImage?.base64) {
        throw new Error('No image was generated');
      }

      const mimeType = (generatedImage as any).mimeType ||
                      (generatedImage as any).mediaType ||
                      'image/png';

      return {
        base64: generatedImage.base64,
        mimeType
      };
    } catch (error: any) {
      if (error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
        throw new ProviderRateLimitError(
          'Gemini rate limit exceeded',
          this.name,
          60000 // Retry after 1 minute
        );
      }
      throw error;
    }
  }
}
import type { StylePreset, StylePresetConfig } from '@/types/project';

export const stylePresets: Record<StylePreset, StylePresetConfig> = {
  'disney-pixar': {
    id: 'disney-pixar',
    nameKey: 'styles.disneyPixar',
    descriptionKey: 'styles.disneyPixarDesc',
    promptPrefix:
      'High-quality Disney/Pixar 3D animation style, polished render, expressive characters, ',
    promptSuffix:
      '. Soft cinematic lighting, detailed textures, smooth stylized proportions, shallow depth of field, Pixar-quality render.',
    defaultCharacterStyle:
      'in a high-quality Disney/Pixar 3D animation style, with a cute expressive face and large emotional eyes, smooth stylized proportions, detailed skin textures, realistic fabric folds',
    defaultSceneStyle:
      'in high-quality Disney/Pixar 3D animation style, cinematic lighting, detailed environment, polished render',
  },
  realistic: {
    id: 'realistic',
    nameKey: 'styles.realistic',
    descriptionKey: 'styles.realisticDesc',
    promptPrefix: 'Photorealistic cinematic film style, high-end production quality, ',
    promptSuffix:
      '. Professional cinematography, natural lighting, 8K resolution, film grain, shallow depth of field, cinematic color grading.',
    defaultCharacterStyle:
      'photorealistic, highly detailed, natural skin texture, realistic proportions, professional photography lighting, cinematic quality',
    defaultSceneStyle:
      'photorealistic, cinematic, professional film production, natural lighting, 8K quality, film grain',
  },
  anime: {
    id: 'anime',
    nameKey: 'styles.anime',
    descriptionKey: 'styles.animeDesc',
    promptPrefix: 'High-quality Japanese anime style, vibrant colors, ',
    promptSuffix:
      '. Clean line art, cel shading, expressive anime eyes, dynamic poses, Studio Ghibli/Makoto Shinkai quality.',
    defaultCharacterStyle:
      'in beautiful anime style, expressive large eyes, clean line art, cel shading, vibrant colors, detailed hair rendering',
    defaultSceneStyle:
      'beautiful anime background, Makoto Shinkai style, vibrant colors, detailed environment, atmospheric lighting',
  },
  custom: {
    id: 'custom',
    nameKey: 'styles.custom',
    descriptionKey: 'styles.customDesc',
    promptPrefix: '',
    promptSuffix: '',
    defaultCharacterStyle: '',
    defaultSceneStyle: '',
  },
};

export const getStylePreset = (style: StylePreset): StylePresetConfig => {
  return stylePresets[style] || stylePresets['disney-pixar'];
};

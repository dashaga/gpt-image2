/**
 * imageModels.ts
 *
 * Metadata config for the 4 unified image generation models.
 * Used by both the frontend switcher and backend API routes.
 */

export type ImageModelMeta = {
  slug:          string;
  kieModelT2I:   string;
  kieModelI2I?:  string;
  supportsI2I:   boolean;
  supportsCount: boolean;
  supportsPrompt: boolean;
  aspectRatios:  string[];
  /** Allowed `resolution` values sent to API */
  resolutions:   { value: string; labelEn: string; labelZh: string; subEn?: string; subZh?: string }[];
  defaultResolution: string;
  maxImages:     number;
  hasNsfwChecker: boolean;
  isUpscaler:    boolean;
};

export const IMAGE_MODEL_META: Record<string, ImageModelMeta> = {
  'gpt-image-2': {
    slug:            'gpt-image-2',
    kieModelT2I:     'gpt-image-2-text-to-image',
    kieModelI2I:     'gpt-image-2-image-to-image',
    supportsI2I:     true,
    supportsCount:   true,
    supportsPrompt:  true,
    aspectRatios:    ['1:1', '9:16', '16:9', '4:3', '3:4'],
    resolutions: [
      { value: 'sd',    labelEn: 'Standard HD', labelZh: '标准高清', subEn: '1024×1024 · general', subZh: '1024×1024·通用' },
      { value: 'hd2k',  labelEn: 'HD 2K',       labelZh: '高清 2K' },
      { value: 'uhd4k', labelEn: 'Ultra HD 4K',  labelZh: '超清 4K' },
    ],
    defaultResolution: 'sd',
    maxImages:       8,
    hasNsfwChecker:  false,
    isUpscaler:      false,
  },

  'nano-banana-pro': {
    slug:            'nano-banana-pro',
    kieModelT2I:     'nano-banana-2',
    supportsI2I:     true,
    supportsCount:   false,
    supportsPrompt:  true,
    aspectRatios:    ['1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9'],
    resolutions: [
      { value: 'sd',    labelEn: 'Standard HD', labelZh: '标准高清', subEn: '1024×1024 · general', subZh: '1024×1024·通用' },
      { value: 'hd2k',  labelEn: 'HD 2K',       labelZh: '高清 2K' },
      { value: 'uhd4k', labelEn: 'Ultra HD 4K',  labelZh: '超清 4K' },
    ],
    defaultResolution: 'sd',
    maxImages:       8,
    hasNsfwChecker:  false,
    isUpscaler:      false,
  },

  'seedream5': {
    slug:            'seedream5',
    kieModelT2I:     'seedream/5-lite-text-to-image',
    kieModelI2I:     'seedream/5-lite-image-to-image',
    supportsI2I:     true,
    supportsCount:   false,
    supportsPrompt:  true,
    aspectRatios:    ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'],
    resolutions: [
      { value: 'basic', labelEn: 'Basic 2K', labelZh: 'Basic 2K', subEn: '2048px output', subZh: '2048px 出图' },
      { value: 'high',  labelEn: 'High 4K',  labelZh: 'High 4K',  subEn: '4096px output', subZh: '4096px 出图' },
    ],
    defaultResolution: 'basic',
    maxImages:       8,
    hasNsfwChecker:  true,
    isUpscaler:      false,
  },

  'ai-image-upscaler': {
    slug:            'ai-image-upscaler',
    kieModelT2I:     'topaz/image-upscale',
    supportsI2I:     false,
    supportsCount:   false,
    supportsPrompt:  false,
    aspectRatios:    [],
    resolutions: [
      { value: '2', labelEn: '2×', labelZh: '2×', subEn: 'Double resolution', subZh: '分辨率翻倍' },
      { value: '4', labelEn: '4×', labelZh: '4×', subEn: '4× resolution',     subZh: '4 倍分辨率'  },
    ],
    defaultResolution: '2',
    maxImages:       1,
    hasNsfwChecker:  false,
    isUpscaler:      true,
  },
};

export const IMAGE_MODEL_SLUGS = Object.keys(IMAGE_MODEL_META);

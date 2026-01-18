// Video Composition API - Type Definitions

export interface CaptionStyle {
  fontSize: 'small' | 'medium' | 'large';
  fontColor: string;
  bgColor: string;
  bgAlpha: number;
  position: 'top' | 'center' | 'bottom';
  shadow: boolean;
}

export interface AudioSettings {
  musicVolume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface ComposeRequest {
  projectId: string;
  outputFormat: 'mp4' | 'draft' | 'both';
  resolution: 'sd' | 'hd' | '4k';
  includeCaptions: boolean;
  includeMusic: boolean;
  includeVoiceovers?: boolean;
  replaceVideoAudio?: boolean;
  aiTransitions?: boolean;
  captionStyle?: CaptionStyle;
  transitionStyle?: 'fade' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'zoomOut' | 'wipe' | 'none';
  transitionDuration?: number;
  audioSettings?: AudioSettings;
  kenBurnsEffect?: boolean;
}

export interface SceneData {
  id: string;
  video_url?: string;
  image_url?: string;
  duration: number;
  transition_to_next?: string;
  voiceovers?: VoiceoverData[];
  strip_original_audio?: boolean;
}

export interface VoiceoverData {
  audio_url: string;
  start_time: number;
  duration: number;
  volume: number;
  character_name?: string;
}

export interface CaptionData {
  text: string;
  start_time: number;
  end_time: number;
  font_size: number;
  font_color: string;
  background_color?: string;
  position: 'top' | 'center' | 'bottom';
}

export interface MusicData {
  audio_url: string;
  volume: number;
  start_offset: number;
  fade_in: number;
  fade_out: number;
}

export interface CompositionCost {
  credits: number;
  realCost: number;
}

export interface ModalRequest {
  project_id: string;
  project_name: string;
  scenes: SceneData[];
  captions: CaptionData[];
  music: MusicData | null;
  output_format: 'mp4' | 'draft' | 'both';
  resolution: 'sd' | 'hd' | '4k';
  fps: number;
  include_srt: boolean;
  caption_style?: {
    font_size: 'small' | 'medium' | 'large';
    font_color: string;
    bg_color: string;
    bg_alpha: number;
    position: 'top' | 'center' | 'bottom';
    shadow: boolean;
  };
  transition_style: string;
  transition_duration: number;
  audio_settings?: {
    music_volume: number;
    fade_in: number;
    fade_out: number;
  };
  ken_burns_effect: boolean;
  s3_bucket?: string | null;
  s3_region?: string | null;
  s3_access_key?: string | null;
  s3_secret_key?: string | null;
}

export interface ModalResponse {
  status: 'complete' | 'error' | 'processing';
  video_url?: string;
  video_base64?: string;
  draft_url?: string;
  draft_base64?: string;
  srt_content?: string;
  duration?: number;
  file_size?: number;
  error?: string;
}

export interface CompositionResult {
  jobId: string;
  status: 'complete' | 'error';
  videoUrl?: string;
  videoBase64?: string;
  draftUrl?: string;
  draftBase64?: string;
  srtContent?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
  cost?: CompositionCost;
}

// Inference API types

export type ServerStatus = 'unknown' | 'sleeping' | 'waking' | 'warm' | 'active';

export interface InferenceRequest {
  image_b64: string;
  prompt: string;
  adapter?: string;  // 'ocr' | 'segment' | adapter name
  expert?: number;   // Expert label for routing
  box?: [number, number, number, number];  // SAM box prompt in RU coords
}

// MoE inference response
export interface MoEResponse {
  output: string;
  adapter: string;
  expert: number | null;
  routed: boolean;
  timings: Record<string, number>;
  error: string | null;
}

// OCR response
export interface OCRResponse {
  text: string;
  raw: string;
  timings: Record<string, number>;
  error: string | null;
}

// SAM response
export interface SAMResponse {
  masks: string[];  // base64 encoded masks
  timings: Record<string, number>;
  error: string | null;
}

// Union type - just store raw response and display it
export type InferenceResponse = Record<string, unknown>;

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

// Expert adapters - maintained in frontend
export const EXPERT_ADAPTERS = [
  { label: 0, name: 'account-screen', description: 'Account/profile screens' },
  { label: 1, name: 'appointment', description: 'Appointment scheduling' },
  { label: 2, name: 'calendar', description: 'Calendar views' },
  { label: 3, name: 'chart-screen', description: 'Patient charts' },
  { label: 4, name: 'claim-window', description: 'Insurance claims' },
  { label: 5, name: 'desktop', description: 'Desktop/home screens' },
  { label: 6, name: 'login-window', description: 'Login/auth screens' },
] as const;

// 'segment' type kept for future SAM integration (needs fine-tuning)
export type ModelType = 'auto' | 'ocr' | 'segment' | 'expert';

export const MODEL_TYPES: { value: ModelType; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Router selects expert' },
  { value: 'ocr', label: 'OCR', description: 'Text extraction' },
  // SAM disabled until fine-tuned - code preserved in ImageDropzone/InferencePanel
  // { value: 'segment', label: 'Segment', description: 'SAM3 segmentation' },
  { value: 'expert', label: 'Expert', description: 'Select LoRA adapter' },
];

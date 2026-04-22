export type CreativeProfile = {
  lyrics: string;
  style: string;
  length: string;
  direction: string;
  aesthetic: string;
  characters: string;
  energy: string;
  camera: string;
  lighting: string;
  promptType: string;
  videoDuration: string;
  model: string | null;
  imageModel?: string | null;
  videoModel?: string | null;
};

export type Shot = {
  shotNumber: number;
  description: string;
  camera: string;
  lighting: string;
  mode: string;
  duration: string;
  imagePrompt?: string;
  videoPrompt?: string;
};

export type ProtocolOutput = {
  t2i?: string;
  i2i?: string;
  i2v?: string[];
};

export type V2CResponse = {
  shots: Shot[];
  protocol: ProtocolOutput;
};

export type Step = 
  | 'lyricsWizard'
  | 'input' 
  | 'direction' 
  | 'aesthetic' 
  | 'characters' 
  | 'energy' 
  | 'camera' 
  | 'lighting' 
  | 'promptCapabilities'
  | 'summary' 
  | 'modelSelection' 
  | 'generation' 
  | 'output';

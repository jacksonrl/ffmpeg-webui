import { ToolType, ToolDefinition } from './types';

export const TOOLS: ToolDefinition[] = [
  {
    id: ToolType.CONVERTER,
    title: "Video Converter",
    description: "Convert video and audio files between formats like MP4, MP3, AVI, MKV, and WEBM with quality controls.",
    icon: "RefreshCw",
    color: "bg-blue-500"
  },
  {
    id: ToolType.REMOVE_AUDIO,
    title: "Remove Audio",
    description: "Strip the audio track from any video file without re-encoding the video stream for instant results.",
    icon: "VolumeX",
    color: "bg-red-500"
  },
  {
    id: ToolType.CLIP_VIDEO,
    title: "Clip & Trim",
    description: "Extract specific segments from your media by specifying start and end timestamps.",
    icon: "Scissors",
    color: "bg-amber-500"
  },
  {
    id: ToolType.IMAGE_CONVERTER,
    title: "Image Converter",
    description: "Convert images to next-gen formats like JXL, AVIF, and WebP using local Wasm.",
    icon: "Image",
    color: "bg-purple-500"
  }
];

export const SUPPORTED_OUTPUT_FORMATS = [
  { value: 'mp4', label: 'MP4 (H.264)' },
  { value: 'webm', label: 'WebM (VP9)' },
  { value: 'avi', label: 'AVI' },
  { value: 'mp3', label: 'MP3 (Audio Only)' },
  { value: 'wav', label: 'WAV (Audio Only)' },
  { value: 'gif', label: 'GIF (Animated)' },
];
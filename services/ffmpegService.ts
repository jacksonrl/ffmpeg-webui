import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  const baseURL = '/lib/core';

  try {
    console.log(`Loading FFmpeg MT from ${baseURL}...`);
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      // ADD: Load the worker for Multi-threading support
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    
    console.log("FFmpeg MT loaded successfully");
  } catch (error) {
    console.error("Failed to load FFmpeg:", error);
    ffmpeg = null;
    throw error;
  }

  return ffmpeg;
};
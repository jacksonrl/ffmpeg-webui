import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  const base = import.meta.env.BASE_URL;

  try {
    console.log(`Loading FFmpeg MT from base: ${base}`);
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}lib/core/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}lib/core/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${base}lib/core/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    
    console.log("FFmpeg MT loaded successfully");
  } catch (error) {
    console.error("Failed to load FFmpeg:", error);
    ffmpeg = null;
    throw error;
  }

  return ffmpeg;
};
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/ffmpeg-webui/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      },
      worker: {
        format: "es"
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        // ADD @jsquash packages here to prevent Vite from breaking them
        exclude: [
            '@ffmpeg/ffmpeg', 
            '@ffmpeg/util',
            '@jsquash/jpeg',
            '@jsquash/png',
            '@jsquash/webp',
            '@jsquash/avif',
            '@jsquash/jxl'
        ],
      },
    };
});
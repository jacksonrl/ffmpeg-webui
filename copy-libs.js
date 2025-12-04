import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. FFmpeg Libraries
const ffmpegLibs = [
    { src: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js', dest: 'public/lib/core/ffmpeg-core.js' },
    { src: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm', dest: 'public/lib/core/ffmpeg-core.wasm' },
    { src: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js', dest: 'public/lib/core/ffmpeg-core.worker.js' }
];

// 2. JSquash Image Codecs
const imageLibs = [
    // JPEG
    { src: 'node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm', dest: 'public/lib/image/mozjpeg_enc.wasm' },
    // PNG
    { src: 'node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm', dest: 'public/lib/image/squoosh_png_bg.wasm' },
    // WebP
    { src: 'node_modules/@jsquash/webp/codec/enc/webp_enc_simd.wasm', dest: 'public/lib/image/webp_enc_simd.wasm' },
    
    // AVIF (Multi-file module)
    { src: 'node_modules/@jsquash/avif/codec/enc/avif_enc_mt.js', dest: 'public/lib/image/avif_enc_mt.js' },
    { src: 'node_modules/@jsquash/avif/codec/enc/avif_enc_mt.wasm', dest: 'public/lib/image/avif_enc_mt.wasm' },
    { src: 'node_modules/@jsquash/avif/codec/enc/avif_enc_mt.worker.mjs', dest: 'public/lib/image/avif_enc_mt.worker.mjs' },
    
    // JXL (Multi-file module - ENCODER)
    { src: 'node_modules/@jsquash/jxl/codec/enc/jxl_enc_mt.js', dest: 'public/lib/image/jxl_enc_mt.js' },
    { src: 'node_modules/@jsquash/jxl/codec/enc/jxl_enc_mt.wasm', dest: 'public/lib/image/jxl_enc_mt.wasm' },
    { src: 'node_modules/@jsquash/jxl/codec/enc/jxl_enc_mt.worker.js', dest: 'public/lib/image/jxl_enc_mt.worker.js' },
    
    // JXL (DECODER)
    { src: 'node_modules/@jsquash/jxl/codec/dec/jxl_dec.wasm', dest: 'public/lib/image/jxl_dec.wasm' }
];

fs.ensureDirSync(path.join(__dirname, 'public/lib/core'));
fs.ensureDirSync(path.join(__dirname, 'public/lib/image'));

const copyLibs = (libs) => {
    libs.forEach(lib => {
        try {
            if (fs.existsSync(path.join(__dirname, lib.src))) {
                fs.copySync(path.join(__dirname, lib.src), path.join(__dirname, lib.dest));
                console.log(`Copied ${path.basename(lib.src)}`);
            } else {
                console.warn(`Warning: Source file not found, skipping: ${lib.src}`);
            }
        } catch (e) {
            console.error(`Error copying ${lib.src}:`, e);
        }
    });
};

console.log("--- Copying Libs ---");
copyLibs(ffmpegLibs);
copyLibs(imageLibs);
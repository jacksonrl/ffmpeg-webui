import * as jpegEnc from '@jsquash/jpeg/encode.js';
import * as pngEnc from '@jsquash/png/encode.js';
import * as webpEnc from '@jsquash/webp/encode.js';
import * as avifEnc from '@jsquash/avif/encode.js';
import * as jxlEnc from '@jsquash/jxl/encode.js';

// --- DECODERS ---
import * as jxlDec from '@jsquash/jxl/decode.js';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'jxl';

const WASM_PATHS = {
    jpeg: '/lib/image/mozjpeg_enc.wasm',
    png: '/lib/image/squoosh_png_bg.wasm',
    webp: '/lib/image/webp_enc_simd.wasm',
    avif: '/lib/image/avif_enc_mt.wasm',
    jxl: '/lib/image/jxl_enc_mt.wasm',
    jxl_dec: '/lib/image/jxl_dec.wasm'
};

function getModule(mod: any) {
    return {
        encode: mod.default || mod.encode,
        decode: mod.default || mod.decode,
        init: mod.init
    };
}

const initialized = {
    jpeg: false, png: false, webp: false, avif: false, jxl: false, jxl_dec: false
};

async function initCodec(format: string, initFn: any, wasmUrl: string) {
    if (initialized[format]) return;

    if (format === 'png') {
        // PNG (Rust/wasm-bindgen): Expects the URL string directly.
        await initFn(wasmUrl);
    } else {
        const response = await fetch(wasmUrl);
        if (!response.ok) throw new Error(`Failed to load ${wasmUrl}`);
        const buffer = await response.arrayBuffer();
        await initFn({ wasmBinary: buffer });
    }
    
    initialized[format] = true;
}

export const decodeToImageData = async (file: File): Promise<ImageData> => {
    try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Context null");
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    } catch (e) {
        if (file.name.endsWith('.jxl') || file.type === 'image/jxl') {
             const codec = getModule(jxlDec);
             await initCodec('jxl_dec', codec.init, WASM_PATHS.jxl_dec);
             const buffer = await file.arrayBuffer();
             return await codec.decode(buffer);
        }
        throw e;
    }
};

export const generatePreview = async (file: File): Promise<string> => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        return URL.createObjectURL(file);
    }
    try {
        const imageData = await decodeToImageData(file);
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return "";
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    } catch (e) {
        console.error("Preview failed:", e);
        return "";
    }
};

export const convertImage = async (
    imageData: ImageData, 
    format: ImageFormat, 
    options: { quality: number } // quality is 0-100
): Promise<Blob> => {
    
    let outputBuffer: ArrayBuffer;
    let codec;
    const { quality } = options;

    switch (format) {
        case 'jpeg':
            codec = getModule(jpegEnc);
            await initCodec('jpeg', codec.init, WASM_PATHS.jpeg);
            outputBuffer = await codec.encode(imageData, { quality });
            return new Blob([outputBuffer], { type: 'image/jpeg' });

        case 'png':
            codec = getModule(pngEnc);
            await initCodec('png', codec.init, WASM_PATHS.png);
            outputBuffer = await codec.encode(imageData);
            return new Blob([outputBuffer], { type: 'image/png' });

        case 'webp':
            codec = getModule(webpEnc);
            await initCodec('webp', codec.init, WASM_PATHS.webp);
            outputBuffer = await codec.encode(imageData, { quality });
            return new Blob([outputBuffer], { type: 'image/webp' });

        case 'avif':
            codec = getModule(avifEnc);
            await initCodec('avif', codec.init, WASM_PATHS.avif);
            outputBuffer = await codec.encode(imageData, { quality, speed: 4 });
            return new Blob([outputBuffer], { type: 'image/avif' });

        case 'jxl':
            codec = getModule(jxlEnc);
            await initCodec('jxl', codec.init, WASM_PATHS.jxl);
            outputBuffer = await codec.encode(imageData, { quality });
            return new Blob([outputBuffer], { type: 'image/jxl' });

        default:
            throw new Error(`Unsupported format: ${format}`);
    }
};
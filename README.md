A basic web-ui for https://github.com/ffmpegwasm/ffmpeg.wasm and https://github.com/jamsinclair/jSquash.

Demo: https://jacksonrl.github.io/ffmpeg-webui/

Github pages deployment based on https://dannadori.medium.com/how-to-deploy-ffmpeg-wasm-application-to-github-pages-76d1ca143b17 using https://github.com/gzuidhof/coi-serviceworker

Functionality:

- Convert between video and image types: h.264, h.265, avi, vp8, gif, png, jxl, avif, webp jpeg
- Minify videos and images to a target file size (eg. "make this video under 4MB")
- Easy to use, sinlge purpose tools like "remove audio", "clip video"
- Fully local

Notes:
  
Currenlty Av1 and VP9 do not work. They *should* be supported by ffmpeg.wasm, but vp9 seems to not have enough memory, and av1 is not included by deafult.

The goal is to have a decent general purpose converter, suplimented with several stand alone "one off" tools that usualy require finding a script on stack overflow. If you have such a one off script, consider opening an issue describing what it does and I will add it if feasable and useful.

Another goal is to eventually port this to electron for those that want to take advantage of faster encoding and decoding via native ffmpeg binaries.

Currently the image and video codecs are separate. Long term I would like to use https://github.com/Yahweasel/libav.js/ instead of ffmpeg.wasm and jsquash, building a custom ffmpeg cli that supports all videos and images in one wasm file, this way you can convert from eg. h264 to avif, and this would make a native port easier as well, as it would all use the same ffmpeg cli commands.

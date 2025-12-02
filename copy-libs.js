const fs = require('fs-extra');
const path = require('path');

const libs = [
    { src: 'node_modules/@ffmpeg/core/dist/esm', dest: 'public/lib/core' },
    { src: 'node_modules/@ffmpeg/ffmpeg/dist/esm', dest: 'public/lib/ffmpeg' },
    { src: 'node_modules/@ffmpeg/util/dist/esm', dest: 'public/lib/util' }
];

libs.forEach(lib => {
    fs.copySync(path.join(__dirname, lib.src), path.join(__dirname, lib.dest));
    console.log(`Copied ${lib.src} to ${lib.dest}`);
});
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ToolLayout } from '../components/ToolLayout';
import { FileDropzone } from '../components/FileDropzone';
import { Button } from '../components/Button';
import { LogsViewer } from '../components/LogsViewer';
import { ResultCard } from '../components/ResultCard';
import { getFFmpeg } from '../services/ffmpegService';
import { LogEntry, FileState } from '../types';
import { 
  Settings, 
  FileVideo, 
  Sliders, 
  Monitor, 
  Volume2, 
  Calculator, 
  Gauge, 
  Info, 
  AlertTriangle, 
  Lock,
  Clock,
  Activity,
  FileAudio
} from 'lucide-react';

interface ConvertToolProps {
  onBack: () => void;
}

const FORMAT_OPTIONS = [
  { id: 'mp4-x264', label: 'MP4 (H.264)', ext: 'mp4', type: 'video', codec: 'libx264' },
  { id: 'mp4-x265', label: 'MP4 (H.265)', ext: 'mp4', type: 'video', codec: 'libx265' },
  { id: 'webm-vp8', label: 'WebM (VP8)',  ext: 'webm', type: 'video', codec: 'libvpx' },
  { id: 'webm-vp9', label: 'WebM (VP9)',  ext: 'webm', type: 'video', codec: 'libvpx-vp9' },
  { id: 'mp3',      label: 'MP3 (Audio Only)', ext: 'mp3',  type: 'audio', codec: 'libmp3lame' },
  { id: 'aac',      label: 'AAC (Audio Only)', ext: 'm4a',  type: 'audio', codec: 'aac' },
  { id: 'wav',      label: 'WAV (Audio Only)', ext: 'wav',  type: 'audio', codec: 'pcm_s16le' },
  { id: 'gif',      label: 'GIF (Anim)',  ext: 'gif',  type: 'image', codec: 'gif' },
];

const AUDIO_OPTIONS = [
  { label: 'AAC (Standard)', value: 'aac' },
  { label: 'MP3 (Legacy)', value: 'libmp3lame' },
  { label: 'Opus (Best WebM)', value: 'libopus' },
  { label: 'Vorbis (Old WebM)', value: 'libvorbis' },
  { label: 'None (Mute)', value: 'none' },
];

const RESOLUTION_OPTIONS = [
  { label: 'Original', value: 'original' },
  { label: '1080p', value: '1080' },
  { label: '720p', value: '720' },
  { label: '480p', value: '480' },
];

const PRESET_OPTIONS = [
  { label: 'Ultrafast', value: 'ultrafast' },
  { label: 'Superfast', value: 'superfast' },
  { label: 'Veryfast', value: 'veryfast' },
  { label: 'Faster', value: 'faster' },
  { label: 'Fast', value: 'fast' },
  { label: 'Medium', value: 'medium' },
];

const AUDIO_BITRATES = [32, 64, 96, 128, 160, 192, 256, 320];

interface FileMetadata {
  duration: number;
  totalBitrate: number;
  audioCodec: string;
  audioBitrate: number;
  hasAudio: boolean;
}

export const ConvertTool: React.FC<ConvertToolProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  
  // Consolidate probe metadata
  const [meta, setMeta] = useState<FileMetadata>({
    duration: 0,
    totalBitrate: 0,
    audioCodec: '-',
    audioBitrate: 0,
    hasAudio: false
  });
  
  const [status, setStatus] = useState<FileState>(FileState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCommand, setActiveCommand] = useState<string>(''); // For the terminal header
  const [progress, setProgress] = useState(0);
  const [passInfo, setPassInfo] = useState<string>(''); // For the progress bar text
  
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [resultSize, setResultSize] = useState<number>(0);
  
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  
  // Settings
  const [selectedFormatId, setSelectedFormatId] = useState<string>('mp4-x264');
  const [resolution, setResolution] = useState<string>('original');
  const [audioCodec, setAudioCodec] = useState<string>('aac');
  const [controlMode, setControlMode] = useState<'quality' | 'size'>('quality');
  const [preset, setPreset] = useState<string>('superfast');
  const [crf, setCrf] = useState<number>(23);
  
  // Size Control & Floors
  const [maxSizeMB, setMaxSizeMB] = useState<number>(10);
  const [audioBitrate, setAudioBitrate] = useState<number>(128); // kbps
  const [videoFloorKbps, setVideoFloorKbps] = useState<number>(50); // kbps

  const probedFileRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const ff = await getFFmpeg();
        setFFmpeg(ff);
        ff.on('log', ({ message }) => {
          if (message.includes('Skipping unhandled metadata')) return;
          setLogs(prev => [...prev, { type: 'info', message, timestamp: Date.now() }]);
        });
        ff.on('progress', ({ progress }) => {
           setProgress(Math.round(progress * 100));
        });
      } catch (e: any) {
        setLogs(prev => [...prev, { type: 'error', message: `Init failed: ${e.message}`, timestamp: Date.now() }]);
      }
    };
    load();
  }, []);

  const currentFormat = useMemo(() => 
    FORMAT_OPTIONS.find(f => f.id === selectedFormatId) || FORMAT_OPTIONS[0], 
  [selectedFormatId]);

  const isVideo = currentFormat.type === 'video';
  const isTargetSizeSupported = isVideo && currentFormat.id !== 'gif';

  useEffect(() => {
    if (audioCodec === 'none') return;
    if (currentFormat.ext === 'webm') {
      if (['aac', 'libmp3lame'].includes(audioCodec)) setAudioCodec('libopus');
    } else if (currentFormat.ext === 'mp4') {
      if (['libvorbis', 'libopus'].includes(audioCodec)) setAudioCodec('aac');
    }
  }, [selectedFormatId, currentFormat.ext]); 

  useEffect(() => {
      if (!isTargetSizeSupported && controlMode === 'size') {
          setControlMode('quality');
      }
  }, [selectedFormatId, isTargetSizeSupported]);

  // --- PROBE LOGIC ---
  useEffect(() => {
    const runProbe = async () => {
        if (!file || !ffmpeg || probedFileRef.current === file.name) return;
        try {
            setLogs([]); 
            setMeta({ duration: 0, totalBitrate: 0, audioCodec: '-', audioBitrate: 0, hasAudio: false });
            probedFileRef.current = file.name;
            setLogs(prev => [...prev, { type: 'info', message: 'Analyzing metadata...', timestamp: Date.now() }]);

            // Set command display for probe
            setActiveCommand(`ffprobe -hide_banner "${file.name}"`);

            await ffmpeg.writeFile(file.name, await fetchFile(file));
            
            // Temporary variables
            let tempDuration = 0;
            let tempTotalBitrate = 0;
            let tempAudioCodec = '-';
            let tempAudioBitrate = 0;
            let tempHasAudio = false;

            const parseMeta = ({ message }: { message: string }) => {
                const durMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durMatch) {
                    tempDuration = (parseFloat(durMatch[1]) * 3600) + (parseFloat(durMatch[2]) * 60) + parseFloat(durMatch[3]);
                }
                const bitMatch = message.match(/bitrate: (\d+) kb\/s/);
                if (bitMatch) {
                    tempTotalBitrate = parseInt(bitMatch[1]);
                }

                if (message.includes('Audio:')) {
                  tempHasAudio = true;
                  const audioParts = message.split('Audio: ')[1].split(',');
                  if (audioParts.length > 0) {
                    tempAudioCodec = audioParts[0].split(' ')[0].trim();
                  }
                  const audioBitrateMatch = message.match(/(\d+) kb\/s/);
                  if (audioBitrateMatch && message.includes('Stream') && message.includes('Audio')) {
                    tempAudioBitrate = parseInt(audioBitrateMatch[1]);
                  }
                }
            };

            ffmpeg.on('log', parseMeta);
            await ffmpeg.ffprobe(['-hide_banner', file.name]);
            ffmpeg.off('log', parseMeta);

            setMeta({
              duration: tempDuration,
              totalBitrate: tempTotalBitrate,
              audioCodec: tempAudioCodec,
              audioBitrate: tempAudioBitrate,
              hasAudio: tempHasAudio
            });

        } catch (e: any) {
            console.error(e);
        }
    };
    runProbe();
  }, [file, ffmpeg]);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);

  // --- CALCULATION LOGIC ---
  const calculationStats = useMemo(() => {
      if (meta.duration <= 0) return { videoTarget: 0, minPossibleSize: 0, isImpossible: false };

      const audioK = audioCodec === 'none' ? 0 : audioBitrate;
      const targetKilobits = maxSizeMB * 8192;
      const totalAvailableKbps = targetKilobits / meta.duration;
      const rawVideoTarget = Math.floor((totalAvailableKbps - audioK) * 0.95);
      const actualVideoTarget = Math.max(rawVideoTarget, videoFloorKbps);
      const minTotalKbps = videoFloorKbps + audioK;
      const minPossibleSize = (minTotalKbps * meta.duration) / 8192;
      
      return {
          videoTarget: actualVideoTarget,
          minPossibleSize: minPossibleSize,
          isImpossible: maxSizeMB < minPossibleSize
      };
  }, [maxSizeMB, meta.duration, audioCodec, audioBitrate, videoFloorKbps]);


  // --- COMMAND BUILDER ---
  const getCommonArgs = () => {
      const args: string[] = ['-y', '-i', (file as File).name];
      args.push('-fflags', '+genpts'); 
      args.push('-avoid_negative_ts', 'make_zero');

      if (isVideo && resolution !== 'original') args.push('-vf', `scale=-2:${resolution}`);
      else if (currentFormat.id === 'gif') args.push('-vf', `fps=10,scale=320:-1:flags=lanczos`);

      if (isVideo) args.push('-c:v', currentFormat.codec);
      else if (currentFormat.type === 'audio') args.push('-c:a', currentFormat.codec);

      if (isVideo && ['libx264', 'libx265', 'libvpx', 'libvpx-vp9'].includes(currentFormat.codec)) {
          if (currentFormat.codec.includes('libvpx')) args.push('-deadline', 'realtime', '-cpu-used', '4');
          else args.push('-preset', preset);
      }
      return args;
  };

  const handleConvert = async () => {
    if (!file || !ffmpeg) return;

    setStatus(FileState.PROCESSING);
    setProgress(0);
    setResultUrl(null);
    setResultSize(0);
    setPassInfo('');

    try {
        await ffmpeg.writeFile(file.name, await fetchFile(file));
        const outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_conv.${currentFormat.ext}`;

        if (controlMode === 'quality') {
            setPassInfo('Encoding (CRF Mode)...');
            setLogs(prev => [...prev, { type: 'info', message: `Start: Quality Mode (CRF ${crf})`, timestamp: Date.now() }]);
            
            const args = getCommonArgs();
            
            if (audioCodec === 'none') args.push('-an');
            else args.push('-c:a', audioCodec);

            args.push('-crf', crf.toString());
            if (currentFormat.codec === 'libvpx-vp9') args.push('-b:v', '0'); 
            
            args.push(outputName);
            
            // Set command for display
            setActiveCommand(`ffmpeg ${args.join(' ')}`);
            
            await ffmpeg.exec(args);
        } 
        else {
            const { videoTarget } = calculationStats;
            const audioK = audioCodec === 'none' ? 0 : audioBitrate;

            setLogs(prev => [...prev, { type: 'info', message: `Start: 2-Pass Mode. Target Video: ${videoTarget}k, Audio: ${audioK}k`, timestamp: Date.now() }]);

            if (calculationStats.isImpossible) {
                setLogs(prev => [...prev, { type: 'info', message: `WARNING: Minimum floors exceed target size. Expect output > ${maxSizeMB}MB.`, timestamp: Date.now() }]);
            }

            // PASS 1
            setPassInfo('Pass 1/2: Analysis...');
            const pass1Args = getCommonArgs();
            pass1Args.push('-b:v', `${videoTarget}k`);
            pass1Args.push('-pass', '1'); 
            pass1Args.push('-an');        
            pass1Args.push('pass1_dummy.mp4'); 
            
            // Set active command for Pass 1
            setActiveCommand(`ffmpeg ${pass1Args.join(' ')}`);
            
            await ffmpeg.exec(pass1Args);

            try { await ffmpeg.deleteFile('pass1_dummy.mp4'); } catch(e) {}

            // PASS 2
            setPassInfo('Pass 2/2: Encoding...');
            const pass2Args = getCommonArgs();
            pass2Args.push('-b:v', `${videoTarget}k`);
            pass2Args.push('-pass', '2'); 
            
            if (audioCodec === 'none') {
                pass2Args.push('-an');
            } else {
                pass2Args.push('-c:a', audioCodec);
                pass2Args.push('-b:a', `${audioK}k`); 
            }
            
            pass2Args.push(outputName);

            // Set active command for Pass 2
            setActiveCommand(`ffmpeg ${pass2Args.join(' ')}`);

            await ffmpeg.exec(pass2Args);
        }

        let data: Uint8Array;
        try {
            const fileData = await ffmpeg.readFile(outputName);
            data = fileData as Uint8Array;
        } catch (e) {
            throw new Error("Encoding failed: Output file not created.");
        }

        setResultSize(data.length);
        
        let mimeType = 'video/mp4';
        if (currentFormat.ext === 'webm') mimeType = 'video/webm';
        if (currentFormat.type === 'audio') mimeType = `audio/${currentFormat.ext}`;
        if (currentFormat.id === 'gif') mimeType = 'image/gif';
        
        setResultUrl(URL.createObjectURL(new Blob([data as any], { type: mimeType })));
        setResultName(outputName);
        setStatus(FileState.COMPLETED);
        setPassInfo('Complete');

        try {
            await ffmpeg.deleteFile('ffmpeg2pass-0.log');
            await ffmpeg.deleteFile('ffmpeg2pass-0.log.mbtree'); 
        } catch(e) {}

    } catch (err: any) {
        console.error(err);
        setStatus(FileState.ERROR);
        setLogs(prev => [...prev, { type: 'error', message: err.message || 'Unknown Error', timestamp: Date.now() }]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setLogs([]);
    setStatus(FileState.IDLE);
    setResultUrl(null);
    setProgress(0);
    setPassInfo('');
    setActiveCommand('');
    probedFileRef.current = null;
    setMeta({ duration: 0, totalBitrate: 0, audioCodec: '-', audioBitrate: 0, hasAudio: false });
    setResultSize(0);
  };

  return (
    <ToolLayout 
      title="Video Converter" 
      description="Convert media with control over quality, resolution, and format."
      onBack={onBack}
    >
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* LEFT COLUMN: Preview & Metadata */}
            <div className="w-full lg:flex-1 flex flex-col gap-4">
               {/* 1. Preview Box */}
               <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
                  {!file ? (
                      <div className="p-6">
                          <FileDropzone onFileSelect={setFile} label="Select File to Analyze & Convert" />
                      </div>
                  ) : (
                      <div className="p-4 flex flex-col h-full">
                          <div className="flex justify-between items-center mb-4">
                             <h3 className="text-white font-medium truncate flex items-center gap-2" title={file.name}>
                                 <FileVideo className="w-4 h-4 text-blue-400" />
                                 {file.name}
                             </h3>
                             <Button variant="ghost" onClick={handleReset} className="text-xs h-8 px-2 py-1">Change File</Button>
                          </div>
                          <div className="aspect-video bg-black rounded flex items-center justify-center overflow-hidden border border-slate-800 relative">
                              {file.type.startsWith('image') ? (
                                  <img src={previewUrl || ''} className="max-h-full max-w-full object-contain" alt="preview" />
                              ) : (
                                  <video src={previewUrl || ''} controls className="max-h-full w-full" />
                              )}
                          </div>
                      </div>
                  )}
               </div>

               {/* 2. Metadata Box (Compact) */}
               {file && (
                 <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 animate-fade-in">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Info className="w-3 h-3" /> Input Analysis
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Duration */}
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                Duration
                            </div>
                            <div className="text-white font-mono text-sm font-medium">
                                {/* .substr(11, 12) captures HH:MM:SS.mmm */}
                                {meta.duration > 0 ? new Date(meta.duration * 1000).toISOString().substr(11, 12) : '--:--:--'}
                            </div>
                        </div>

                        {/* Total Bitrate */}
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                Total Bitrate
                            </div>
                            <div className="text-white font-mono text-sm font-medium truncate">
                                {meta.totalBitrate > 0 ? (
                                    <>
                                        {meta.totalBitrate} <span className="text-xs text-slate-500">kbps</span>
                                    </>
                                ) : 'N/A'}
                            </div>
                        </div>

                        {/* Audio Codec */}
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                Audio Type
                            </div>
                            <div className="text-white font-mono text-sm font-medium truncate" title={meta.audioCodec}>
                                {meta.hasAudio ? meta.audioCodec.toUpperCase() : <span className="text-slate-500">None</span>}
                            </div>
                        </div>

                        {/* Audio Bitrate */}
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                Audio Bitrate
                            </div>
                            <div className="text-white font-mono text-sm font-medium truncate">
                                {meta.audioBitrate > 0 ? (
                                    <>
                                        {meta.audioBitrate} <span className="text-xs text-slate-500">kbps</span>
                                    </>
                                ) : (meta.hasAudio ? 'Unknown' : '-')}
                            </div>
                        </div>
                    </div>
                 </div>
               )}
            </div>

            {/* RIGHT COLUMN: Settings */}
            <div className={`w-full lg:w-96 flex flex-col gap-4 ${!file ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700 space-y-5">
                
                {/* 1. Format */}
                <div>
                  <div className="flex items-center gap-2 mb-2 text-slate-200 font-semibold text-sm uppercase tracking-wide">
                    <Settings className="w-4 h-4 text-blue-400" /> Target Format
                  </div>
                  <select 
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 outline-none"
                    value={selectedFormatId} onChange={(e) => setSelectedFormatId(e.target.value)} disabled={status === FileState.PROCESSING}
                  >
                    {FORMAT_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                </div>

                {isVideo && (
                  <>
                    <div className="h-px bg-slate-700" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-200 font-semibold text-sm uppercase tracking-wide">
                                <Monitor className="w-4 h-4 text-blue-400" /> Resolution
                            </div>
                            <select 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 outline-none"
                                value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={status === FileState.PROCESSING}
                            >
                                {RESOLUTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-200 font-semibold text-sm uppercase tracking-wide">
                                <Volume2 className="w-4 h-4 text-blue-400" /> Audio
                            </div>
                            <select 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 outline-none"
                                value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)} disabled={status === FileState.PROCESSING}
                            >
                                {AUDIO_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} disabled={(currentFormat.ext === 'webm' && (opt.value === 'aac' || opt.value === 'libmp3lame')) || (currentFormat.ext === 'mp4' && (opt.value === 'libopus' || opt.value === 'libvorbis'))}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="h-px bg-slate-700" />

                    {/* Controls */}
                    <div className="space-y-4">
                        
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-200 font-semibold text-sm uppercase tracking-wide">
                                <Gauge className="w-4 h-4 text-blue-400" /> Encoder Speed
                            </div>
                            <select 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 outline-none"
                                value={preset} onChange={(e) => setPreset(e.target.value)} disabled={status === FileState.PROCESSING}
                            >
                                {PRESET_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                            <button onClick={() => setControlMode('quality')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${controlMode === 'quality' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                <Sliders className="w-4 h-4" /> Quality
                            </button>
                            <button 
                                onClick={() => isTargetSizeSupported && setControlMode('size')} 
                                className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${controlMode === 'size' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'} ${!isTargetSizeSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!isTargetSizeSupported}
                                title={!isTargetSizeSupported ? "Not supported for this format" : ""}
                            >
                                {isTargetSizeSupported ? <Calculator className="w-4 h-4" /> : <Lock className="w-4 h-4" />} 
                                Max Size
                            </button>
                        </div>

                        {controlMode === 'quality' ? (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">CRF Level (Lower = Higher Quality)</label>
                                    <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{crf}</span>
                                </div>
                                <input type="range" min="18" max="51" step="1" value={crf} onChange={(e) => setCrf(Number(e.target.value))} disabled={status === FileState.PROCESSING} className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Max Size Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-slate-400">Max File Size (MB)</label>
                                        <span className="text-xs text-slate-500 font-mono">
                                            Vid: {calculationStats.videoTarget}k {audioCodec !== 'none' && `+ Aud: ${audioBitrate}k`}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="number" min="0.5" max="500" step="0.5" value={maxSizeMB} onChange={(e) => setMaxSizeMB(parseFloat(e.target.value))} disabled={status === FileState.PROCESSING} className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 outline-none focus:border-blue-500" />
                                        <div className="bg-slate-700 flex items-center px-3 rounded text-slate-300 text-sm">MB</div>
                                    </div>
                                </div>

                                {/* Floor / Constraints Settings */}
                                <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lock className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-300">Bitrate Constraints</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Audio Floor */}
                                        <div>
                                            <label className="block text-[10px] text-slate-400 mb-1">Audio Bitrate</label>
                                            <select 
                                                className="w-full bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-1.5 outline-none disabled:opacity-50"
                                                value={audioBitrate}
                                                onChange={(e) => setAudioBitrate(Number(e.target.value))}
                                                disabled={status === FileState.PROCESSING || audioCodec === 'none'}
                                            >
                                                {AUDIO_BITRATES.map(br => <option key={br} value={br}>{br} kbps</option>)}
                                            </select>
                                        </div>

                                        {/* Video Floor */}
                                        <div>
                                            <label className="block text-[10px] text-slate-400 mb-1">Min Video Floor</label>
                                            <div className="flex items-center bg-slate-800 border border-slate-600 rounded">
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-white text-xs px-2 py-1.5 outline-none"
                                                    value={videoFloorKbps}
                                                    onChange={(e) => setVideoFloorKbps(Number(e.target.value))}
                                                    step="10"
                                                    min="10"
                                                    disabled={status === FileState.PROCESSING}
                                                />
                                                <span className="text-[10px] text-slate-500 pr-2">k</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Info / Warning Box */}
                                <div className={`border rounded-lg p-3 flex items-start gap-2 ${calculationStats.isImpossible ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                    {calculationStats.isImpossible ? (
                                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                    ) : (
                                        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                    )}
                                    <div className="text-[10px]">
                                        {calculationStats.isImpossible ? (
                                            <div className="text-red-200">
                                                <span className="font-bold">Impossible Target.</span> 
                                                <br/>
                                                Based on your floors ({videoFloorKbps}k video + {audioCodec !== 'none' ? audioBitrate : 0}k audio), 
                                                the minimum possible size is 
                                                <span className="font-mono ml-1">{calculationStats.minPossibleSize.toFixed(2)} MB</span>.
                                            </div>
                                        ) : (
                                            <span className="text-blue-200">2-Pass encoding will attempt to hit target size exactly.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  </>
                )}

                <div className="pt-2">
                    <Button className="w-full py-3 text-lg shadow-lg shadow-blue-900/20" onClick={handleConvert} isLoading={status === FileState.PROCESSING} disabled={status === FileState.PROCESSING || !ffmpeg}>
                        {status === FileState.PROCESSING ? 'Processing...' : 'Start Conversion'}
                    </Button>
                </div>
              </div>
            </div>
          </div>

          {status === FileState.PROCESSING && (
             <div className="w-full space-y-2">
                 <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 relative">
                    <div className="bg-blue-600 h-full transition-all duration-300 flex items-center justify-end px-2" style={{ width: `${Math.max(5, progress)}%` }}>
                        <span className="text-[10px] font-bold text-white drop-shadow-md">{progress}%</span>
                    </div>
                 </div>
                 {passInfo && <div className="text-center text-xs text-blue-400 animate-pulse">{passInfo}</div>}
             </div>
          )}

          {status === FileState.COMPLETED && resultUrl && (
             <div className="space-y-2">
               <ResultCard url={resultUrl} filename={resultName} fileSize={resultSize} onClose={handleReset} />
             </div>
           )}

           <LogsViewer logs={logs} command={activeCommand || (status === FileState.PROCESSING ? passInfo : 'Ready')} />
        </div>
    </ToolLayout>
  );
};
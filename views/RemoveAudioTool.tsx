import React, { useState, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ToolLayout } from '../components/ToolLayout';
import { FileDropzone } from '../components/FileDropzone';
import { Button } from '../components/Button';
import { LogsViewer } from '../components/LogsViewer';
import { ResultCard } from '../components/ResultCard';
import { getFFmpeg } from '../services/ffmpegService';
import { LogEntry, FileState } from '../types';
import { VolumeX } from 'lucide-react';

interface RemoveAudioToolProps {
  onBack: () => void;
}

export const RemoveAudioTool: React.FC<RemoveAudioToolProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FileState>(FileState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const ff = await getFFmpeg();
        setFFmpeg(ff);
        ff.on('log', ({ message }) => {
          setLogs(prev => [...prev, { type: 'info', message, timestamp: Date.now() }]);
        });
      } catch (e: any) {
        setLogs(prev => [...prev, { type: 'error', message: `Initialization failed: ${e.message}`, timestamp: Date.now() }]);
      }
    };
    load();
  }, []);

  const handleProcess = async () => {
    if (!file || !ffmpeg) return;

    setStatus(FileState.PROCESSING);
    setLogs([]);
    setResultUrl(null);

    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const nameWithoutExt = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
    
    const inputName = `input${ext}`;
    const outputName = `${nameWithoutExt}_muted${ext}`;

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      
      const args = ['-i', inputName, '-c', 'copy', '-an', outputName];
      setLogs(prev => [...prev, { type: 'info', message: `Executing: ffmpeg ${args.join(' ')}`, timestamp: Date.now() }]);
      
      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const url = URL.createObjectURL(new Blob([(data as Uint8Array).buffer], { type: file.type }));
      
      setResultUrl(url);
      setResultName(outputName);
      setStatus(FileState.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setStatus(FileState.ERROR);
      setLogs(prev => [...prev, { type: 'error', message: err.message, timestamp: Date.now() }]);
    } finally {
        try { await ffmpeg.deleteFile(inputName); } catch(e) {}
    }
  };

  const commandPreview = `ffmpeg -i "${file?.name || 'input'}" -c copy -an output${file && file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.mp4'}`;

  return (
    <ToolLayout 
      title="Remove Audio" 
      description="Strip audio tracks from video files instantly without re-encoding."
      onBack={onBack}
    >
      {!file ? (
        <FileDropzone onFileSelect={setFile} acceptedFormats="video/*" />
      ) : (
        <div className="space-y-6">
           <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <VolumeX className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl text-white font-medium mb-2">{file.name}</h3>
              <p className="text-slate-400 mb-6">Ready to remove audio track</p>
              
              <Button 
                onClick={handleProcess} 
                className="w-full max-w-sm mx-auto"
                isLoading={status === FileState.PROCESSING}
                disabled={status === FileState.PROCESSING || !ffmpeg}
              >
                {!ffmpeg ? 'Loading...' : 'Mute Video'}
              </Button>
           </div>

           {status === FileState.COMPLETED && resultUrl && (
             <ResultCard url={resultUrl} filename={resultName} onClose={() => { setStatus(FileState.IDLE); setFile(null); }} />
           )}

           <LogsViewer logs={logs} command={commandPreview} />
        </div>
      )}
    </ToolLayout>
  );
};
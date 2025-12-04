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
import { Clock, Scissors } from 'lucide-react';

interface ClipToolProps {
  onBack: () => void;
}

export const ClipTool: React.FC<ClipToolProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState('00:00:00');
  const [end, setEnd] = useState('00:00:10');
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

  const handleClip = async () => {
    if (!file || !ffmpeg) return;

    setStatus(FileState.PROCESSING);
    setLogs([]);
    setResultUrl(null);

    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const nameWithoutExt = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
    
    const inputName = `input${ext}`;
    const outputName = `${nameWithoutExt}_clipped${ext}`;

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      
      // -ss before -i is faster seeking, -to is end time
      const args = ['-ss', start, '-i', inputName, '-to', end, '-c', 'copy', outputName];
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

  const commandPreview = `ffmpeg -ss ${start} -i "${file?.name || 'input'}" -to ${end} -c copy output${file && file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.mp4'}`;

  return (
    <ToolLayout 
      title="Clip & Trim Video" 
      description="Cut out specific parts of your video by time."
      onBack={onBack}
    >
      {!file ? (
        <FileDropzone onFileSelect={setFile} acceptedFormats="video/*" />
      ) : (
        <div className="space-y-6">
           <div className="flex flex-col lg:flex-row gap-6">
             <div className="flex-1 bg-black rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center min-h-[300px]">
                <video src={URL.createObjectURL(file)} controls className="max-h-[400px] w-full" />
             </div>
             
             <div className="w-full lg:w-80 space-y-4">
                <div className="bg-slate-700/30 p-5 rounded-lg border border-slate-700">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 
                    Timestamps (HH:MM:SS)
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                      <input 
                        type="text" 
                        value={start}
                        onChange={(e) => setStart((e.target as any).value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 font-mono"
                        placeholder="00:00:00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">End Time</label>
                      <input 
                        type="text" 
                        value={end}
                        onChange={(e) => setEnd((e.target as any).value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 font-mono"
                        placeholder="00:00:10"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full py-3 text-lg" 
                  onClick={handleClip}
                  isLoading={status === FileState.PROCESSING}
                  disabled={status === FileState.PROCESSING || !ffmpeg}
                >
                  {!ffmpeg ? 'Loading...' : (
                    <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Clip Video
                    </>
                  )}
                </Button>
             </div>
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
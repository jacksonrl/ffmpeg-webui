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
import { Clock, Scissors, FileVideo } from 'lucide-react';

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
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: file.type }));
      
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
  
  const handleReset = () => {
    setFile(null);
    setStatus(FileState.IDLE);
    setResultUrl(null);
    setLogs([]);
  };

  const commandPreview = `ffmpeg -ss ${start} -i "${file?.name || 'input'}" -to ${end} -c copy output${file && file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.mp4'}`;

  return (
    <ToolLayout 
      title="Clip & Trim Video" 
      description="Cut out specific parts of your video by time."
      onBack={onBack}
    >
        <div className="space-y-6">
           <div className="flex flex-col lg:flex-row gap-6">
             {/* Left Column: File Input / Preview */}
             <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col min-h-[400px]">
                {!file ? (
                   <div className="p-6 flex-1 flex flex-col">
                     <FileDropzone onFileSelect={setFile} acceptedFormats="video/*" />
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
                       <div className="aspect-video bg-black rounded flex-1 items-center justify-center overflow-hidden border border-slate-800 relative">
                           <video src={URL.createObjectURL(file)} controls className="max-h-full w-full" />
                       </div>
                   </div>
                )}
             </div>
             
             {/* Right Column: Settings */}
             <div className={`w-full lg:w-80 space-y-4 transition-opacity ${!file ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
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
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 font-mono disabled:opacity-70"
                        placeholder="00:00:00"
                        disabled={!file || status === FileState.PROCESSING}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">End Time</label>
                      <input 
                        type="text" 
                        value={end}
                        onChange={(e) => setEnd((e.target as any).value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 font-mono disabled:opacity-70"
                        placeholder="00:00:10"
                        disabled={!file || status === FileState.PROCESSING}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full py-3 text-lg" 
                  onClick={handleClip}
                  isLoading={status === FileState.PROCESSING}
                  disabled={!file || status === FileState.PROCESSING || !ffmpeg}
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
             <ResultCard url={resultUrl} filename={resultName} onClose={handleReset} />
           )}

           <LogsViewer logs={logs} command={commandPreview} />
        </div>
    </ToolLayout>
  );
};
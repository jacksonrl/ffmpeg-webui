import React, { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { FileDropzone } from '../components/FileDropzone';
import { Button } from '../components/Button';
import { ResultCard } from '../components/ResultCard';
import { convertImage, generatePreview, ImageFormat, decodeToImageData } from '../services/imageService';
import { FileState } from '../types';
import { Image as ImageIcon, Settings, Zap, AlertTriangle, Info, HardDrive, Crop } from 'lucide-react';

interface ImageToolProps {
  onBack: () => void;
}

interface ImageMetadata {
  width: number;
  height: number;
}

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jxl', label: 'JPEG XL' },
];

export const ImageTool: React.FC<ImageToolProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<ImageMetadata | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('webp');
  const [quality, setQuality] = useState<number>(0.8);
  const [status, setStatus] = useState<FileState>(FileState.IDLE);
  
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New states for target size mode
  const [controlMode, setControlMode] = useState<'quality' | 'size'>('quality');
  const [targetSizeKB, setTargetSizeKB] = useState<number>(256);
  const [slack, setSlack] = useState<number>(10);
  const [iterations, setIterations] = useState<number>(10);
  const [searchLogs, setSearchLogs] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    if (file) {
      setLoadingPreview(true);
      setPreviewUrl(null);
      setMeta(null);
      setImageData(null);
      setErrorMsg(null);
      
      const processFile = async () => {
        try {
          // Decode image data once for metadata and reuse
          const decodedData = await decodeToImageData(file);
          if (!active) return;
          
          setImageData(decodedData);
          setMeta({ width: decodedData.width, height: decodedData.height });

          // Generate preview separately
          const url = await generatePreview(file);
          if (active) setPreviewUrl(url);

        } catch (err: any) {
          console.error("Error processing image file:", err);
          if (active) setErrorMsg("Could not read image data. This format may not be fully supported for preview or conversion.");
        } finally {
          if (active) setLoadingPreview(false);
        }
      };
      processFile();
    } else {
        setPreviewUrl(null);
        setMeta(null);
        setImageData(null);
    }
    return () => { active = false; };
  }, [file]);
  
  // Disable size control for PNG (lossless)
  useEffect(() => {
    if (targetFormat === 'png' && controlMode === 'size') {
        setControlMode('quality');
    }
  }, [targetFormat, controlMode]);

  const handleConvert = async () => {
    if (!file || !imageData) return;

    setStatus(FileState.PROCESSING);
    setErrorMsg(null);
    setResultUrl(null);
    setSearchLogs([]);

    try {
      let finalBlob: Blob;

      if (controlMode === 'quality' || targetFormat === 'png') {
        setSearchLogs(prev => [...prev, `> Encoding with quality: ${Math.round(quality * 100)}`]);
        finalBlob = await convertImage(imageData, targetFormat, { quality: quality * 100 });
      } else {
        // --- Binary Search Logic ---
        const targetSizeInBytes = targetSizeKB * 1024;
        setSearchLogs(prev => [...prev, `> Starting search for target size: ~${targetSizeKB} KB (slack: ${slack}%)`]);

        let minQ = 0;
        let maxQ = 100;
        let bestBlob: Blob | null = null;
        let bestSize = 0;

        for (let i = 0; i < iterations; i++) {
          const currentQ = Math.round((minQ + maxQ) / 2);
          if (Math.abs(maxQ - minQ) < 1) {
             setSearchLogs(prev => [...prev, `> Converged: Quality range is too small.`]);
             break;
          }

          const blob = await convertImage(imageData, targetFormat, { quality: currentQ });
          const currentSize = blob.size;
          setSearchLogs(prev => [...prev, `> Iteration #${i + 1}: quality=${currentQ}, size=${(currentSize / 1024).toFixed(2)} KB`]);
          
          if (currentSize > targetSizeInBytes) {
              maxQ = currentQ;
          } else {
              if (currentSize > bestSize) {
                  bestBlob = blob;
                  bestSize = currentSize;
              }
              minQ = currentQ;
          }

          const slackBytes = targetSizeInBytes * (slack / 100);
          if (targetSizeInBytes - currentSize >= 0 && targetSizeInBytes - currentSize < slackBytes) {
              setSearchLogs(prev => [...prev, `> Success: Target size reached within ${slack}% slack.`]);
              bestBlob = blob;
              break;
          }
        }
        
        if (!bestBlob) {
            setSearchLogs(prev => [...prev, '> Warning: Could not get under target. Using lowest quality result.']);
            finalBlob = await convertImage(imageData, targetFormat, { quality: 0 });
        } else {
            setSearchLogs(prev => [...prev, `> Finished: Using best result found (${(bestBlob.size/1024).toFixed(1)} KB).`]);
            finalBlob = bestBlob;
        }
      }
      
      const url = URL.createObjectURL(finalBlob);
      setResultUrl(url);
      setResultBlob(finalBlob);
      setStatus(FileState.COMPLETED);
    } catch (e: any)
{
      console.error(e);
      setErrorMsg(e.message || "Conversion failed");
      setStatus(FileState.ERROR);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultUrl(null);
    setStatus(FileState.IDLE);
    setErrorMsg(null);
    setSearchLogs([]);
    // Note: We don't reset quality, targetFormat, etc. to preserve user settings.
  };

  return (
    <ToolLayout 
      title="Image Converter" 
      description="Convert images to next-gen formats like JXL, AVIF, and WebP."
      onBack={onBack}
    >
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Column: Image Preview & Metadata */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center min-h-[57px]">
                    {file ? (
                      <>
                        <span className="text-sm font-medium text-slate-300 truncate max-w-[200px]" title={file.name}>{file.name}</span>
                        <Button variant="ghost" onClick={handleReset} className="text-xs h-7 px-2 py-1">Change File</Button>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">No file selected</span>
                    )}
                  </div>
                  <div className="flex-1 min-h-[300px] bg-[url('https://raw.githubusercontent.com/transparent-textures/patterns/master/patterns/transparent-square-dark.png')] flex items-center justify-center p-4">
                     {!file ? (
                        <FileDropzone onFileSelect={setFile} acceptedFormats="image/*,.jxl,.avif,.webp" label="Drop an image here" />
                     ) : loadingPreview ? (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="text-xs">Decoding Image Data...</span>
                        </div>
                     ) : previewUrl ? (
                       <img src={previewUrl} alt="Preview" className="max-w-full max-h-[400px] object-contain shadow-2xl" />
                     ) : (
                       <div className="text-slate-500 flex flex-col items-center">
                           <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                           <span className="text-xs text-center">Preview unavailable for this format. <br/>Conversion may still work.</span>
                       </div>
                     )}
                  </div>
                </div>

                 <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 animate-fade-in">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Info className="w-3 h-3" /> Image Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5">Dimensions</div>
                            <div className="text-white font-mono text-sm font-medium">
                                {meta ? `${meta.width} x ${meta.height}` : '--'}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5">Original Size</div>
                            <div className="text-white font-mono text-sm font-medium truncate">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : '--'}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50">
                            <div className="text-slate-400 text-[10px] uppercase mb-0.5">Type</div>
                            <div className="text-white font-mono text-sm font-medium truncate" title={file?.type}>
                                {file ? file.name.split('.').pop()?.toUpperCase() || 'N/A' : '--'}
                            </div>
                        </div>
                    </div>
                 </div>
            </div>

            {/* Right Column: Controls */}
            <div className="w-full lg:w-80 space-y-4">
              <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700 space-y-5">
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                     <ImageIcon className="w-3 h-3" /> Target Format
                   </label>
                   <div className="grid grid-cols-3 gap-2">
                     {FORMATS.map(fmt => (
                       <button
                         key={fmt.value} onClick={() => setTargetFormat(fmt.value)}
                         disabled={!file}
                         className={`text-sm py-2 px-3 rounded-md transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                           targetFormat === fmt.value 
                             ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                             : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                         }`}
                       >
                         {fmt.label}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="h-px bg-slate-700/50"></div>
                
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <HardDrive className="w-3 h-3" /> Control Mode
                    </label>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                        <button onClick={() => setControlMode('quality')} disabled={!file} className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${controlMode === 'quality' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <Settings className="w-3 h-3" /> Quality
                        </button>
                        <button
                            onClick={() => targetFormat !== 'png' && setControlMode('size')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${controlMode === 'size' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'} ${targetFormat === 'png' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!file || targetFormat === 'png'}
                            title={targetFormat === 'png' ? "Target size not applicable for lossless PNG" : ""}
                        >
                            <Crop className="w-3 h-3" /> Target Size
                        </button>
                    </div>
                </div>
                
                {controlMode === 'quality' ? (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Settings className="w-3 h-3" /> Quality
                      </label>
                      <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                        {Math.round(quality * 100)}%
                      </span>
                    </div>
                    <input type="range" min="0.1" max="1.0" step="0.05" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} disabled={!imageData} className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"/>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Target Size (KB)</label>
                        <div className="flex items-center bg-slate-900 border border-slate-600 rounded">
                            <input type="number" className="no-spinner w-full bg-transparent text-white text-sm px-2 py-1.5 outline-none" value={targetSizeKB} onChange={(e) => setTargetSizeKB(Number(e.target.value))} min="1" disabled={status === FileState.PROCESSING || !imageData}/>
                            <span className="text-xs text-slate-500 pr-2">KB</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div title="Allows the final file size to be up to this percentage smaller than the target before stopping the search.">
                            <label className="text-xs text-slate-400 mb-1 block">Slack</label>
                            <div className="flex items-center bg-slate-900 border border-slate-600 rounded">
                                <input type="number" className="no-spinner w-full bg-transparent text-white text-sm px-2 py-1.5 outline-none" value={slack} onChange={(e) => setSlack(Number(e.target.value))} min="1" max="50" disabled={status === FileState.PROCESSING || !imageData} />
                                <span className="text-xs text-slate-500 pr-2">%</span>
                            </div>
                        </div>
                        <div title="The maximum number of attempts the search will make. More iterations can yield a more accurate size but take longer.">
                            <label className="text-xs text-slate-400 mb-1 block">Iterations</label>
                            <div className="flex items-center bg-slate-900 border border-slate-600 rounded">
                                <input type="number" className="no-spinner w-full bg-transparent text-white text-sm px-2 py-1.5 outline-none" value={iterations} onChange={(e) => setIterations(Number(e.target.value))} min="5" max="20" disabled={status === FileState.PROCESSING || !imageData}/>
                            </div>
                        </div>
                    </div>
                </div>
                )}


                <Button className="w-full py-3" onClick={handleConvert} isLoading={status === FileState.PROCESSING} disabled={status === FileState.PROCESSING || !imageData}>
                  {!imageData && file ? 'Decoding...' : (status === FileState.PROCESSING ? 'Converting...' : ( <> <Zap className="w-4 h-4 mr-2" /> Convert </> ))}
                </Button>

                {errorMsg && (
                   <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50 break-words">
                     <strong>Error:</strong> {errorMsg}
                   </div>
                )}
              </div>
            </div>
          </div>
          
          {status === FileState.PROCESSING && controlMode === 'size' && (
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 font-mono text-xs animate-fade-in">
                  <div className="text-slate-400 mb-2">$ Running binary search...</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                      {searchLogs.map((log, i) => (
                          <div key={i} className="text-slate-300">{log}</div>
                      ))}
                  </div>
              </div>
          )}

          {status === FileState.COMPLETED && resultUrl && (
             <ResultCard url={resultUrl} filename={`converted.${targetFormat === 'jxl' ? 'jxl' : targetFormat}`} fileSize={resultBlob?.size} onClose={handleReset} />
           )}
        </div>
    </ToolLayout>
  );
};
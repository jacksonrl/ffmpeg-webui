import React from 'react';
import { Download, CheckCircle, FileVideo, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ResultCardProps {
  url: string;
  filename: string;
  fileSize?: number; // Size in bytes
  onClose: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const ResultCard: React.FC<ResultCardProps> = ({ url, filename, fileSize, onClose }) => {
  return (
    <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-scale-in">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-500/20 rounded-full text-green-400">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Processing Complete!</h3>
          <div className="flex flex-col text-slate-400 text-sm mt-1">
             <span className="flex items-center"><FileVideo className="w-3 h-3 mr-1" /> {filename}</span>
             {fileSize && (
               <span className="text-green-400 font-mono text-xs mt-1">
                 Final Size: {formatBytes(fileSize)}
               </span>
             )}
          </div>
        </div>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <Button variant="secondary" onClick={onClose} className="flex-1 md:flex-none">
            <RefreshCw className="w-4 h-4 mr-2" /> New Operation
        </Button>
        <a href={url} download={filename} className="flex-1 md:flex-none">
          <Button className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </a>
      </div>
    </div>
  );
};
import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string; // e.g., "video/*,audio/*"
  label?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ 
  onFileSelect, 
  acceptedFormats = "video/*,audio/*",
  label = "Click or drag file to upload"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as any;
    if (target.files && target.files[0]) {
      onFileSelect(target.files[0]);
    }
  };

  const handleClick = () => {
    (inputRef.current as any)?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer as any;
    if (dt.files && dt.files[0]) {
      onFileSelect(dt.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="w-full border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-slate-800/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group min-h-[200px]"
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept={acceptedFormats} 
        onChange={handleChange}
      />
      <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8 text-blue-400" />
      </div>
      <p className="text-slate-300 font-medium text-lg mb-2">{label}</p>
      <p className="text-slate-500 text-sm">Supported formats: MP4, AVI, MKV, MOV, MP3, etc.</p>
    </div>
  );
};
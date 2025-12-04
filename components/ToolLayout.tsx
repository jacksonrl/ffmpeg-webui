import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ToolLayoutProps {
  title: string;
  description: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({ title, description, onBack, children }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tools
        </Button>
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400 text-lg">{description}</p>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { TOOLS } from './constants';
import { ToolType } from './types';
import * as Icons from 'lucide-react';
import { ConvertTool } from './views/ConvertTool';
import { ClipTool } from './views/ClipTool';
import { RemoveAudioTool } from './views/RemoveAudioTool';
import { ImageTool } from './views/ImageTool';


const App = () => {
  const [currentTool, setCurrentTool] = useState<ToolType | null>(null);

  const renderTool = () => {
    switch (currentTool) {
      case ToolType.CONVERTER:
        return <ConvertTool onBack={() => setCurrentTool(null)} />;
      case ToolType.CLIP_VIDEO:
        return <ClipTool onBack={() => setCurrentTool(null)} />;
      case ToolType.REMOVE_AUDIO:
        return <RemoveAudioTool onBack={() => setCurrentTool(null)} />;
      case ToolType.IMAGE_CONVERTER:
        return <ImageTool onBack={() => setCurrentTool(null)} />;
      default:
        return <Dashboard onSelectTool={setCurrentTool} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      <main className="w-full h-full">
        {renderTool()}
      </main>
    </div>
  );
};

// Dashboard Component
const Dashboard: React.FC<{ onSelectTool: (t: ToolType) => void }> = ({ onSelectTool }) => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 animate-fade-in">
      
      {/* Simplified Branding */}
      <div className="flex flex-col items-center justify-center mb-16 space-y-6">
        <div className="text-center space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Media Tools Offline
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Local video and audio editing powered via ffmpeg/ffmpeg.wasm.
          </p>
        </div>
      </div>

      {/* Tools Grid - Simplified Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = (Icons as any)[tool.icon] || Icons.HelpCircle;
          
          return (
            <div 
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 ${tool.color} rounded-lg flex items-center justify-center shadow-lg shadow-${tool.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                {/* Title */}
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  {tool.title}
                </h3>

                {/* Subtle Arrow Indicator */}
                <div className="ml-auto">
                    <Icons.ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;
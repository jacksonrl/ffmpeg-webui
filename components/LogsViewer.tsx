import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogsViewerProps {
  logs: LogEntry[];
  command?: string;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ logs, command }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track if user wants to stay at the bottom
  const shouldAutoScroll = useRef(true);

  // Check scroll position when user scrolls manually
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // If user is within 50px of the bottom, enable auto-scroll. 
    // Otherwise, assume they are reading history.
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
    shouldAutoScroll.current = isAtBottom;
  };

  // Update scroll position when logs change
  useEffect(() => {
    if (scrollRef.current && shouldAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden font-mono text-xs md:text-sm">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <span className="text-slate-300 font-semibold">Terminal Output</span>
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      
      {command && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 text-blue-400 break-all">
          <span className="text-slate-500 select-none">$ </span>
          {command}
        </div>
      )}

      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="h-64 overflow-y-auto p-4 space-y-1 scrollbar-thin"
      >
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Ready for processing...</div>
        )}
        {logs.map((log, index) => (
          <div key={index} className="flex gap-2">
            <span className="text-slate-600 shrink-0 select-none">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className={`break-all ${
              log.type === 'error' ? 'text-red-400' : 
              log.type === 'progress' ? 'text-blue-300' : 'text-slate-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
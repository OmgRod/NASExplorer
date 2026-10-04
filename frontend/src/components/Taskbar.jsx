import React, { useState, useEffect } from 'react';
import { HardDrive, Monitor, Folder, Lock } from 'lucide-react';

export default function Taskbar({ windows, activeWindowId, onToggleWindow, onLogout }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-lg flex items-center justify-between px-3 z-[9999] select-none">
      {/* Left section: Start / Brand */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-xs">
          <Monitor className="w-4 h-4" />
          <span>NAS OS</span>
        </div>

        {/* Taskbar Window Pins */}
        <div className="h-6 w-px bg-slate-800 mx-1" />

        <div className="flex items-center gap-1">
          {windows.map((win) => {
            const Icon = win.icon;
            const isActive = activeWindowId === win.id && win.isOpen && !win.isMinimized;

            return (
              <button
                key={win.id}
                onClick={() => onToggleWindow(win.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition border ${
                  isActive
                    ? 'bg-slate-800 border-sky-500/50 text-sky-300 shadow-sm'
                    : win.isOpen
                    ? 'bg-slate-900/60 border-slate-700/40 text-slate-300 hover:bg-slate-800/60'
                    : 'hidden'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span className="max-w-[100px] truncate">{win.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right section: System Clock & Auth */}
      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
        <button
          onClick={onLogout}
          title="Change Credentials"
          className="p-1.5 rounded-md hover:bg-slate-800 hover:text-slate-200 transition"
        >
          <Lock className="w-4 h-4" />
        </button>
        <div className="text-right">
          <div>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-[10px] text-slate-500">{time.toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
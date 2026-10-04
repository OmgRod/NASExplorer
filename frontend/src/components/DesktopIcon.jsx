import React from 'react';

export default function DesktopIcon({ title, icon: Icon, onClick }) {
  return (
    <button
      onDoubleClick={onClick}
      className="flex flex-col items-center justify-center w-20 h-20 p-2 rounded-lg hover:bg-slate-800/50 focus:bg-sky-500/20 focus:border focus:border-sky-500/40 border border-transparent text-slate-200 transition group"
    >
      <Icon className="w-10 h-10 text-sky-400 group-hover:scale-105 transition-transform" />
      <span className="mt-1 text-xs text-center font-medium drop-shadow-md truncate w-full">
        {title}
      </span>
    </button>
  );
}
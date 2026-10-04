import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Minus, Square, Copy, X } from 'lucide-react';

export default function Window({
  id,
  title,
  icon: Icon,
  isOpen,
  isMinimized,
  zIndex,
  position,
  size,
  children,
  onClose,
  onMinimize,
  onFocus,
  onUpdateBounds,
}) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen || isMinimized) return null;

  const toggleMaximize = (e) => {
    e.stopPropagation();
    setIsMaximized((prev) => !prev);
  };

  return (
    <Rnd
      size={isMaximized ? { width: '100%', height: 'calc(100vh - 48px)' } : size}
      position={isMaximized ? { x: 0, y: 0 } : position}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="window-titlebar"
      onDragStop={(e, d) => {
        if (!isMaximized) onUpdateBounds(id, { x: d.x, y: d.y }, size);
      }}
      onResizeStop={(e, direction, ref, delta, pos) => {
        if (!isMaximized) {
          onUpdateBounds(
            id,
            pos,
            { width: parseInt(ref.style.width), height: parseInt(ref.style.height) }
          );
        }
      }}
      onMouseDown={() => onFocus(id)}
      bounds="parent"
      minWidth={360}
      minHeight={240}
      style={{ zIndex, position: 'absolute' }}
      className={`flex flex-col bg-slate-900/95 border border-slate-700/60 shadow-2xl backdrop-blur-md overflow-hidden transition-all ${
        isMaximized ? 'rounded-none border-none top-0 left-0 right-0' : 'rounded-lg'
      }`}
    >
      {/* Titlebar */}
      <div className="window-titlebar flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700/50 cursor-grab active:cursor-grabbing select-none shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 truncate pointer-events-none">
          {Icon && <Icon className="w-4 h-4 text-sky-400 shrink-0" />}
          <span className="truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize(id);
            }}
            className="p-1 hover:bg-slate-700/70 rounded text-slate-400 hover:text-white transition"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1 hover:bg-slate-700/70 rounded text-slate-400 hover:text-white transition"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(id);
            }}
            className="p-1 hover:bg-rose-600/80 rounded text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden bg-slate-900/60 text-slate-200">
        {children}
      </div>
    </Rnd>
  );
}
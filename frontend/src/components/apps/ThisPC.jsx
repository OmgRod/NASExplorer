import React, { useEffect, useState } from 'react';
import { HardDrive, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchDrives } from '../../api';

export default function ThisPC({ onOpenPath }) {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDrives = () => {
    setLoading(true);
    setError(null);
    fetchDrives()
      .then((data) => setDrives(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDrives();
  }, []);

  const formatGB = (bytes) => (bytes / 1024 ** 3).toFixed(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full text-slate-400 gap-2 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
        <span>Loading storage devices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-slate-400 gap-2 text-xs p-4">
        <AlertCircle className="w-6 h-6 text-rose-400" />
        <span>{error}</span>
        <button
          onClick={loadDrives}
          className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 overflow-y-auto space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Devices and Drives
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {drives.map((drive) => {
          const usedPct = drive.capacity?.usedPercentage || 0;
          return (
            <div
              key={drive.id}
              onDoubleClick={() => onOpenPath(drive.mountPoint || '/srv')}
              className="p-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg cursor-pointer transition group"
            >
              <div className="flex items-start gap-3">
                <HardDrive className="w-8 h-8 text-sky-400 group-hover:scale-105 transition-transform shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-200 truncate">
                    {drive.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {drive.filesystem.toUpperCase()} • {drive.device}
                  </div>

                  {/* Usage Bar */}
                  <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${usedPct}%` }}
                      className={`h-full transition-all ${
                        usedPct > 90 ? 'bg-rose-500' : 'bg-sky-400'
                      }`}
                    />
                  </div>

                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>{formatGB(drive.capacity.available)} GB free</span>
                    <span>of {formatGB(drive.capacity.total)} GB</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
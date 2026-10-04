import React, { useEffect, useState } from 'react';
import { FolderSymlink, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchShares } from '../../api';

export default function SharesApp({ onOpenShare }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadShares = () => {
    setLoading(true);
    setError(null);
    fetchShares()
      .then((data) => setShares(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadShares();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full text-slate-400 gap-2 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
        <span>Loading shared folders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-slate-400 gap-2 text-xs p-4">
        <AlertCircle className="w-6 h-6 text-rose-400" />
        <span>{error}</span>
        <button
          onClick={loadShares}
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
        Configured NAS Shares
      </h3>

      {shares.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          No shared folders found on OMV
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
          {shares.map((share) => (
            <div
              key={share.id}
              onDoubleClick={() => onOpenShare(share.absolutePath)}
              className="p-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg cursor-pointer transition group flex items-start gap-3"
            >
              <FolderSymlink className="w-8 h-8 text-amber-400 group-hover:scale-105 transition-transform shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-slate-200 truncate">
                  {share.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                  {share.absolutePath}
                </div>
                {share.comment && (
                  <div className="text-[11px] text-slate-400 mt-1 italic truncate">
                    {share.comment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
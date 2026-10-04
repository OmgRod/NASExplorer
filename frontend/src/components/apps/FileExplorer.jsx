import React, { useEffect, useState } from 'react';
import { Folder, FileText, ArrowLeft, RefreshCw, Download, FolderPlus, Upload, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { browseFiles, createFolder, renameFile, deleteFile, downloadFile, uploadFile } from '../../api';

export default function FileExplorer({ initialPath = '/srv' }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rootPath, setRootPath] = useState('/srv');

  const loadPath = (targetPath) => {
    setLoading(true);
    setError(null);
    browseFiles(targetPath)
      .then((data) => {
        setCurrentPath(data.currentPath);
        setRootPath(data.rootPath || '/srv');
        setItems(data.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPath(currentPath);
  }, [currentPath]);

  const handleBack = () => {
    const parent = currentPath === rootPath ? rootPath : currentPath.split('/').slice(0, -1).join('/') || rootPath;
    loadPath(parent);
  };

  const refresh = () => loadPath(currentPath);

  const handleNewFolder = async () => {
    const folderName = window.prompt('Folder name');
    if (!folderName) return;
    try {
      await createFolder(currentPath, folderName);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRename = async (item) => {
    const newName = window.prompt('New name', item.name);
    if (!newName || newName === item.name) return;
    try {
      await renameFile(item.path, newName);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    try {
      await deleteFile(item.path);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = async (item) => {
    try {
      await downloadFile(item.path, item.name);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await uploadFile(currentPath, file);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-3 space-y-3 overflow-hidden">
      {/* Navigation Toolbar */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800 shrink-0">
        <button
          onClick={handleBack}
          disabled={currentPath === rootPath}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 truncate font-mono">
          {currentPath}
        </div>
        <button onClick={handleNewFolder} title="New folder" className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
          <FolderPlus className="w-4 h-4" />
        </button>
        <label title="Upload file" className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0 cursor-pointer">
          <input type="file" onChange={handleUpload} className="hidden" />
          <Upload className="w-4 h-4" />
        </label>
        <button
          onClick={refresh}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-300 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Item Grid - Overflow Scroll Fixed */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-500 gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading folder...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">Folder is empty</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map((item) => (
              <div
                key={item.path}
                onDoubleClick={() => {
                  if (item.isDirectory) setCurrentPath(item.path);
                }}
                className="group flex items-center gap-2 p-2 bg-slate-800/30 hover:bg-slate-800/80 rounded border border-slate-800/50 cursor-pointer select-none transition"
              >
                {item.isDirectory ? (
                  <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {item.isDirectory ? 'Folder' : `${(item.size / 1024).toFixed(1)} KB`}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!item.isDirectory && <button onClick={(event) => { event.stopPropagation(); handleDownload(item); }} title="Download" className="p-1 text-slate-400 hover:text-sky-300"><Download className="w-3.5 h-3.5" /></button>}
                  <button onClick={(event) => { event.stopPropagation(); handleRename(item); }} title="Rename" className="p-1 text-slate-400 hover:text-amber-300"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={(event) => { event.stopPropagation(); handleDelete(item); }} title="Delete" className="p-1 text-slate-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { HardDrive, Folder, Network } from 'lucide-react';
import DesktopIcon from './components/DesktopIcon';
import Window from './components/Window';
import Taskbar from './components/Taskbar';
import LoginModal from './components/LoginModal';
import ThisPC from './components/apps/ThisPC';
import FileExplorer from './components/apps/FileExplorer';
import SharesApp from './components/apps/SharesApp';
import { clearCredentials } from './api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem('nas_creds')
  );

  const [activeWindowId, setActiveWindowId] = useState('thispc');
  const [windows, setWindows] = useState([
    {
      id: 'thispc',
      title: 'This PC',
      icon: HardDrive,
      isOpen: true,
      isMinimized: false,
      zIndex: 10,
      position: { x: 80, y: 60 },
      size: { width: 620, height: 420 },
    },
    {
      id: 'explorer',
      title: 'File Explorer',
      icon: Folder,
      isOpen: false,
      isMinimized: false,
      zIndex: 5,
      position: { x: 140, y: 100 },
      size: { width: 680, height: 460 },
      initialPath: '/srv',
    },
    {
      id: 'shares',
      title: 'Shared Folders',
      icon: Network,
      isOpen: false,
      isMinimized: false,
      zIndex: 4,
      position: { x: 200, y: 140 },
      size: { width: 600, height: 400 },
    },
  ]);

  const bringToFront = (id) => {
    setActiveWindowId(id);
    setWindows((prev) =>
      prev.map((win) => ({
        ...win,
        zIndex: win.id === id ? 50 : 10,
        isMinimized: win.id === id ? false : win.isMinimized,
      }))
    );
  };

  const openWindow = (id, extraProps = {}) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, isOpen: true, isMinimized: false, ...extraProps } : win
      )
    );
    bringToFront(id);
  };

  const closeWindow = (id) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, isOpen: false } : win))
    );
  };

  const minimizeWindow = (id) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, isMinimized: true } : win))
    );
  };

  const toggleWindow = (id) => {
    const win = windows.find((w) => w.id === id);
    if (win.isMinimized || !win.isOpen) {
      openWindow(id);
    } else if (activeWindowId === id) {
      minimizeWindow(id);
    } else {
      bringToFront(id);
    }
  };

  const updateBounds = (id, position, size) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, position, size } : win))
    );
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] overflow-hidden select-none">
      {!isAuthenticated && (
        <LoginModal onLoginSuccess={() => setIsAuthenticated(true)} />
      )}

      {/* Desktop Grid Icons */}
      <div className="p-4 grid grid-flow-col auto-cols-max gap-4">
        <DesktopIcon
          title="This PC"
          icon={HardDrive}
          onClick={() => openWindow('thispc')}
        />
        <DesktopIcon
          title="File Explorer"
          icon={Folder}
          onClick={() => openWindow('explorer')}
        />
        <DesktopIcon
          title="Shared Folders"
          icon={Network}
          onClick={() => openWindow('shares')}
        />
      </div>

      {/* Windows Layer */}
      {windows.map((win) => (
        <Window
          key={win.id}
          {...win}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onFocus={bringToFront}
          onUpdateBounds={updateBounds}
        >
          {win.id === 'thispc' && (
            <ThisPC
              onOpenPath={(path) =>
                openWindow('explorer', { initialPath: path })
              }
            />
          )}
          {win.id === 'explorer' && (
            <FileExplorer initialPath={win.initialPath || '/srv'} />
          )}
          {win.id === 'shares' && (
            <SharesApp
              onOpenShare={(path) =>
                openWindow('explorer', { initialPath: path })
              }
            />
          )}
        </Window>
      ))}

      {/* System Taskbar */}
      <Taskbar
        windows={windows}
        activeWindowId={activeWindowId}
        onToggleWindow={toggleWindow}
        onLogout={() => {
          clearCredentials();
          setIsAuthenticated(false);
        }}
      />
    </div>
  );
}
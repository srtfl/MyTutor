'use client';

import { useState, useRef } from 'react';

export default function Whiteboard({ onMount, onChange }: any) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const exportDrawing = () => {
    // Trigger export in Excalidraw
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'EXPORT_CANVAS' },
        '*'
      );
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      exportDrawing();
    }
    // Ctrl+G for grid
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      setGridEnabled(!gridEnabled);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
      }}
    >
      {/* Enhanced Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px',
          backgroundColor: darkMode ? '#2a2a2a' : '#fff',
          borderBottom: '1px solid #ddd',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Left Section - Main Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              if (confirm('Clear the entire canvas? This cannot be undone.')) {
                iframeRef.current?.contentWindow?.postMessage(
                  { type: 'CLEAR' },
                  '*'
                );
              }
            }}
            style={{
              padding: '8px 14px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
            title="Clear all (Ctrl+Alt+C)"
          >
            🗑️ Clear Canvas
          </button>

          <button
            onClick={exportDrawing}
            style={{
              padding: '8px 14px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
            title="Save/Export (Ctrl+S)"
          >
            💾 Save
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#ddd',
          }}
        />

        {/* Features */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: darkMode ? '#fff' : '#000',
            }}
          >
            <input
              type="checkbox"
              checked={gridEnabled}
              onChange={(e) => setGridEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Grid
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: darkMode ? '#fff' : '#000',
            }}
          >
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Dark Mode
          </label>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right Section - Info */}
        <div
          style={{
            fontSize: '12px',
            color: darkMode ? '#aaa' : '#666',
            display: 'flex',
            gap: '12px',
          }}
        >
          <span title="Keyboard shortcut: Ctrl+S">💾 Ctrl+S to Save</span>
          <span title="Keyboard shortcut: Ctrl+G">🔲 Ctrl+G for Grid</span>
        </div>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: '8px 12px',
            background: darkMode ? '#444' : '#f0f0f0',
            color: darkMode ? '#fff' : '#000',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          style={{
            padding: '12px',
            backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
            borderBottom: '1px solid #ddd',
            fontSize: '13px',
            color: darkMode ? '#fff' : '#000',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <strong>💡 Tips:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
              <li>Drag to draw shapes</li>
              <li>Double-click to edit text</li>
              <li>Right-click for options</li>
              <li>Ctrl+Z to undo</li>
            </ul>
          </div>
          <div>
            <strong>⌨️ Keyboard Shortcuts:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
              <li>V - Select tool</li>
              <li>D - Draw tool</li>
              <li>R - Rectangle</li>
              <li>C - Circle</li>
              <li>T - Text</li>
            </ul>
          </div>
          <div>
            <strong>🎨 Drawing Tips:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
              <li>Hold Shift for straight lines</li>
              <li>Hold Alt to move objects</li>
              <li>Use arrow keys to move</li>
              <li>Delete to remove objects</li>
            </ul>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={`https://excalidraw.com${gridEnabled ? '?gridMode=true' : ''}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Whiteboard Canvas"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
          borderTop: '1px solid #ddd',
          fontSize: '11px',
          color: darkMode ? '#999' : '#999',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>💡 Hover over buttons for tips</span>
        <span>Powered by Excalidraw • Free & Open Source</span>
      </div>
    </div>
  );
}
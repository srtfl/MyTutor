'use client';

export default function Whiteboard({ onMount, onChange }: any) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src="https://excalidraw.com"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Whiteboard"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

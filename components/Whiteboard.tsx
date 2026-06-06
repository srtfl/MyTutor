'use client';

import dynamic from 'next/dynamic';
import 'tldraw/tldraw.css';

const Tldraw = dynamic(() => import('tldraw').then((m) => m.Tldraw), { ssr: false });

export default function Whiteboard({ onMount }: any) {
  const handleMount = (editor: any) => {
    try { console.info('Tldraw mounted at', Date.now()); } catch (e) {}
    if (onMount) onMount(editor);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'white',
      }}
    >
      <Tldraw onMount={handleMount} />
    </div>
  );
}
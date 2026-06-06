'use client';

import dynamic from 'next/dynamic';

const Tldraw = dynamic(() => import('tldraw').then((m) => m.Tldraw), { ssr: false });

export default function Whiteboard({ onMount }: any) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'white',
      }}
    >
      <Tldraw onMount={onMount} />
    </div>
  );
}
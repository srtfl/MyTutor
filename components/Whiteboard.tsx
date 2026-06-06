'use client';

import dynamic from 'next/dynamic';

const Tldraw = dynamic(() => import('tldraw').then((m) => m.Tldraw), { ssr: false });

export default function Whiteboard({ onMount }: any) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        zIndex: 10,
      }}
    >
      <Tldraw onMount={onMount} />
    </div>
  );
}
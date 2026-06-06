'use client';

import dynamic from 'next/dynamic';
import 'tldraw/tldraw.css';

const Tldraw = dynamic(
  () => import('tldraw').then((m) => m.Tldraw),
  { ssr: false }
);

export default function Whiteboard({ onMount }: any) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'white',
      }}
    >
      <Tldraw onMount={onMount} />
    </div>
  );
}
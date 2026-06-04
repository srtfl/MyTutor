'use client';

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onMount: (editor: any) => void;
}

export default function Whiteboard({ onMount }: WhiteboardProps) {
  return (
    <div className="absolute inset-0 z-0">
      <Tldraw onMount={onMount} />
    </div>
  );
}
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import 'tldraw/tldraw.css';

// Load Tldraw dynamically
const DynamicTldraw = dynamic(() => import('tldraw').then(m => m.Tldraw), { 
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b', color: '#71717a', fontFamily: 'monospace' }}>Loading Engine...</div>
});

const isShareable = (id: string) => id.startsWith('shape:') || id.startsWith('binding:') || id.startsWith('asset:');
const ROOM_ID = 'global-classroom-iframe';

export default function BoardPage() {
  const [supabase] = useState(() => createClient());
  const editorRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // SUPABASE SYNC LOGIC
  useEffect(() => {
    const channel = supabase.channel(`canvas:${ROOM_ID}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'canvas-update' }, ({ payload }) => {
      if (!editorRef.current || !editorRef.current.store) return;
      editorRef.current.store.mergeRemoteChanges(() => {
        try {
          if (payload.added) {
            const valid = Object.values(payload.added).filter((r: any) => r && isShareable(r.id));
            if (valid.length > 0) editorRef.current.store.put(valid);
          }
          if (payload.updated) {
            const valid = Object.values(payload.updated).map((rp: any) => Array.isArray(rp) ? rp[1] : rp).filter((r: any) => r && isShareable(r.id));
            if (valid.length > 0) editorRef.current.store.put(valid);
          }
          if (payload.removed) {
            const valid = Object.keys(payload.removed).filter(id => isShareable(id));
            if (valid.length > 0) editorRef.current.store.remove(valid);
          }
        } catch (e) { }
      });
    });
    
    channel.subscribe();
    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [supabase]);

  const handleMount = useCallback((editor: any) => {
    editorRef.current = editor;
    editor.store.listen((update: any) => {
      if (update.source !== 'user' || !channelRef.current) return; 
      try {
        const { added, updated, removed } = update.changes;
        const fAdded: any = {}; Object.keys(added).forEach(id => { if (isShareable(id)) fAdded[id] = added[id]; });
        const fUpdated: any = {}; Object.keys(updated).forEach(id => { if (isShareable(id)) fUpdated[id] = updated[id]; });
        const fRemoved: any = {}; Object.keys(removed).forEach(id => { if (isShareable(id)) fRemoved[id] = removed[id]; });
        if (Object.keys(fAdded).length === 0 && Object.keys(fUpdated).length === 0 && Object.keys(fRemoved).length === 0) return;
        channelRef.current.send({ type: 'broadcast', event: 'canvas-update', payload: { added: fAdded, updated: fUpdated, removed: fRemoved } }).catch(() => {});
      } catch (e) {}
    }, { scope: 'document' });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DynamicTldraw onMount={handleMount} />
    </div>
  );
}
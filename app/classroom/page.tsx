'use client';

// 🆕 FIX: Added useCallback to the React imports
import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { Video, VideoOff, Mic, MicOff, Wifi, Users, BookOpen, FolderTree, ChevronRight, ChevronLeft, BarChart, X, Eye, EyeOff } from 'lucide-react';
import katex from 'katex';

// Math Renderer (Unchanged)
const MathRenderer = ({ content }: { content: string }) => {
  if (!content) return null;
  const cleanContent = content.replace(/\\\\/g, '\\');
  const parts = cleanContent.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\([\s\S]*?\\\)|\\[[\s\S]*?\\]|\\begin\{[^}]*\}[\s\S]*?\\end\{[^}]*\})/g);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        let isMath = false; let mathString = part; let displayMode = false;

        if (part.startsWith('$$') && part.endsWith('$$')) {
          isMath = true; displayMode = true; mathString = part.slice(2, -2);
        } else if (part.startsWith('$') && part.endsWith('$')) {
          isMath = true; mathString = part.slice(1, -1);
        } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
          isMath = true; mathString = part.slice(2, -2);
        } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
          isMath = true; displayMode = true; mathString = part.slice(2, -2);
        } else if (part.startsWith('\\begin{')) {
          isMath = true; displayMode = true; mathString = part; 
        }

        if (isMath) {
          try {
            let safeMath = mathString.replace(/\\begin\{array\}\{[^}]*\}/g, '\\begin{array}{c c c c c c c}');
            safeMath = safeMath.replace(/\\-/g, '-');
            const html = katex.renderToString(safeMath, { throwOnError: true, displayMode: displayMode, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index} className="text-amber-500/90 font-mono text-[13px] bg-amber-500/10 px-1.5 py-0.5 rounded">{part}</span>;
          }
        }

        const strayRegex = /(\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})*)/g;
        const textParts = part.split(strayRegex);

        return (
          <span key={index}>
            {textParts.map((textPart, i) => {
              if (textPart.startsWith('\\') && textPart !== '\\n' && textPart.length > 1) {
                try {
                  const html = katex.renderToString(textPart, { throwOnError: true, displayMode: false, strict: false });
                  return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                } catch (e) {
                  return <span key={i}>{textPart}</span>;
                }
              }
              return <span key={i}>{textPart.replace(/\\n/g, '\n')}</span>;
            })}
          </span>
        );
      })}
    </span>
  );
};

const Tldraw = dynamic(
  async () => {
    const component = await import('tldraw');
    return component.Tldraw;
  },
  { 
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-mono text-sm animate-pulse bg-zinc-900">
        Loading Whiteboard Engine...
      </div>
    )
  }
);

export default function ClassroomPage() {
  const [supabase] = useState(() => createClient());
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const editorRef = useRef<any>(null);
  
  const [curriculumTree, setCurriculumTree] = useState<any>({});
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);

  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const agoraClientRef = useRef<any>(null);
  const localTracksRef = useRef<{ videoTrack: any; audioTrack: any }>({ videoTrack: null, audioTrack: null });
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

  // 🆕 FIX: Changed to session-2 to ensure a clean slate in the Supabase channel
  const roomId = 'global-classroom-session-2'; 

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase.from('questions').select('*').order('topic');
      if (error) return setIsLoading(false);
      
      if (data && data.length > 0) {
        const organizedData: any = {};
        data.forEach((q) => {
          const subj = q.subject || 'Unknown';
          const year = q.year_level || 'GCSE';
          const topic = q.topic || 'Uncategorized';
          const diff = q.difficulty || 'General';

          if (!organizedData[subj]) organizedData[subj] = {};
          if (!organizedData[subj][year]) organizedData[subj][year] = {};
          if (!organizedData[subj][year][topic]) organizedData[subj][year][topic] = {};
          if (!organizedData[subj][year][topic][diff]) organizedData[subj][year][topic][diff] = [];
          
          organizedData[subj][year][topic][diff].push(q);
        });
        setCurriculumTree(organizedData);
      }
      setIsLoading(false);
    };
    fetchQuestions();
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel(`classroom:${roomId}`, { config: { broadcast: { self: false }, presence: { key: roomId } } });
    channel.on('broadcast', { event: 'canvas-update' }, ({ payload }) => {
      if (!editorRef.current) return;
      editorRef.current.store.mergeRemoteChanges(() => {
        try {
          const { added, updated, removed } = payload;
          const recordsToPut: any[] = [];
          if (added) Object.values(added).forEach((r) => r && recordsToPut.push(r));
          if (updated) Object.values(updated).forEach((rp: any) => rp && rp[1] && recordsToPut.push(rp[1]));
          if (recordsToPut.length > 0) editorRef.current.store.put(recordsToPut);
          if (removed) {
            const ids = Object.keys(removed);
            if (ids.length > 0) editorRef.current.store.remove(ids);
          }
        } catch (e) {}
      });
    });
    channel.on('presence', { event: 'sync' }, () => setPeerCount(Object.keys(channel.presenceState()).length || 1));
    channel.subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    return () => {
      channel.unsubscribe();
      if (agoraClientRef.current) {
        localTracksRef.current.audioTrack?.close();
        localTracksRef.current.videoTrack?.close();
        agoraClientRef.current.leave();
      }
    };
  }, [supabase, roomId]);

  // 🆕 FIX: Wrapped handleMount in useCallback. 
  // This prevents React from thinking the whiteboard needs to be destroyed and recreated every time the "ONLINE" button flashes.
  const handleMount = useCallback((editor: any) => {
    editorRef.current = editor;
    editor.store.listen((update: any) => {
      if (update.source !== 'user') return; 
      supabase.channel(`classroom:${roomId}`).send({
        type: 'broadcast', event: 'canvas-update',
        payload: { added: update.changes.added, updated: update.changes.updated, removed: update.changes.removed },
      });
    }, { scope: 'document' });
  }, [supabase, roomId]);

  const initializeAgora = async () => {
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    if (!agoraClientRef.current) {
      agoraClientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClientRef.current.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
        await agoraClientRef.current.subscribe(user, mediaType);
        if (mediaType === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = ''; user.videoTrack.play(remoteVideoRef.current);
        }
        if (mediaType === 'audio') user.audioTrack.play();
      });
    }
  };

  const toggleAudio = async () => {
    try {
      await initializeAgora();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      if (!localTracksRef.current.audioTrack) {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracksRef.current.audioTrack = audioTrack;
        if (agoraClientRef.current.connectionState === 'DISCONNECTED') await agoraClientRef.current.join('9bb4c1b7a3c14481ba51b83074108c83', roomId, '007eJxTYNhmZdAYb3ZNxnOlg7HL/pKl+7ISGk6eOP6T27PyoFp41UEFBsukJJNkwyTzRONkQxMTC8OkRFPDJAtjA3MTQwOLZAvjWyUKWQ2BjAyWZxkYGKEQxJdiSM/JT0rM0U3OSSwuLsrPz9UtTi0uzszP0zVkYAAAET8meA==', null);
        await agoraClientRef.current.publish([audioTrack]);
        setIsMuted(false);
      } else {
        await localTracksRef.current.audioTrack.setEnabled(isMuted);
        setIsMuted(!isMuted);
      }
    } catch (err) {}
  };

  const toggleVideo = async () => {
    try {
      await initializeAgora();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      if (!localTracksRef.current.videoTrack) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.videoTrack = videoTrack;
        if (agoraClientRef.current.connectionState === 'DISCONNECTED') await agoraClientRef.current.join('9bb4c1b7a3c14481ba51b83074108c83', roomId, '007eJxTYNhmZdAYb3ZNxnOlg7HL/pKl+7ISGk6eOP6T27PyoFp41UEFBsukJJNkwyTzRONkQxMTC8OkRFPDJAtjA3MTQwOLZAvjWyUKWQ2BjAyWZxkYGKEQxJdiSM/JT0rM0U3OSSwuLsrPz9UtTi0uzszP0zVkYAAAET8meA==', null);
        await agoraClientRef.current.publish([videoTrack]);
        if (localVideoRef.current) videoTrack.play(localVideoRef.current);
        setIsVideoOn(true);
      } else {
        await localTracksRef.current.videoTrack.setEnabled(!isVideoOn);
        setIsVideoOn(!isVideoOn);
      }
    } catch (err) {}
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden">
      
      {/* ---------------- SIDEBAR NAVIGATION ZONE ---------------- */}
      <aside className="w-[340px] border-r border-zinc-800 bg-zinc-900 flex flex-col justify-between p-4 z-10 shrink-0">
        
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <span className="text-xs font-semibold tracking-widest text-blue-500 uppercase">Live Session</span>
              <h2 className="text-xl font-bold tracking-tight mt-1">Workspace</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-800 text-xs">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono">{peerCount}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-inner">
            <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex items-center gap-2 shrink-0">
              <FolderTree className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-medium">Curriculum Browser</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading && <div className="p-4 text-center text-xs text-zinc-500 animate-pulse">Loading Database...</div>}

              {!isLoading && !activeSubject && Object.keys(curriculumTree).map((subject) => (
                <button key={subject} onClick={() => setActiveSubject(subject)} className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-sm border border-transparent hover:border-zinc-800 transition-colors">
                  <span>{subject === 'Maths' ? '📐' : '⚛️'} {subject}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              ))}

              {activeSubject && !activeYear && (
                <div className="space-y-1">
                  <button onClick={() => setActiveSubject(null)} className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2">
                    <ChevronLeft className="w-3 h-3" /> Back to Subjects
                  </button>
                  {Object.keys(curriculumTree[activeSubject] || {}).sort().map((year) => (
                    <button key={year} onClick={() => setActiveYear(year)} className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-sm border border-zinc-900 transition-colors">
                      <span className="truncate pr-2 text-zinc-300">{year}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </button>
                  ))}
                </div>
              )}

              {activeSubject && activeYear && !activeTopic && (
                <div className="space-y-1">
                  <button onClick={() => setActiveYear(null)} className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2">
                    <ChevronLeft className="w-3 h-3" /> Back to Years
                  </button>
                  {Object.keys(curriculumTree[activeSubject][activeYear] || {}).map((topic) => (
                    <button key={topic} onClick={() => setActiveTopic(topic)} className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-xs border border-zinc-900 transition-colors">
                      <span className="truncate pr-2 text-zinc-300">{topic}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </button>
                  ))}
                </div>
              )}

              {activeSubject && activeYear && activeTopic && !activeDifficulty && (
                <div className="space-y-1">
                  <button onClick={() => setActiveTopic(null)} className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2 border-b border-zinc-900 pb-3">
                    <ChevronLeft className="w-3 h-3" /> Back to Topics
                  </button>
                  {Object.keys(curriculumTree[activeSubject][activeYear][activeTopic] || {}).map((diff) => (
                    <button key={diff} onClick={() => setActiveDifficulty(diff)} className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-xs border border-zinc-900 transition-colors">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <BarChart className="w-3 h-3 text-emerald-500" />
                        <span>{diff}</span>
                      </div>
                      <span className="text-blue-500 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {curriculumTree[activeSubject][activeYear][activeTopic][diff].length} Qs
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeSubject && activeYear && activeTopic && activeDifficulty && (
                <div className="space-y-1">
                  <button onClick={() => { setActiveDifficulty(null); setActiveQuestion(null); setShowSolution(false); }} className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2 border-b border-zinc-900 pb-3">
                    <ChevronLeft className="w-3 h-3" /> Back to Tiers
                  </button>
                  {curriculumTree[activeSubject][activeYear][activeTopic][activeDifficulty].map((q: any, idx: number) => (
                    <button 
                      key={q.id} 
                      onClick={() => {
                        setActiveQuestion(q);
                        setShowSolution(false);
                      }} 
                      className={`w-full text-left p-3 rounded text-xs transition-colors border ${activeQuestion?.id === q.id ? 'bg-blue-950/50 border-blue-900 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      <span className="font-semibold text-blue-500 mr-2">Q{idx + 1}.</span>
                      <span className="line-clamp-2 mt-1">
                        <MathRenderer content={q.question_text} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 shrink-0">
            <div className="relative aspect-video w-full bg-black border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
              <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full object-cover z-0" />
              <span className="text-xs text-zinc-600 font-mono z-10">Remote Video Stream</span>
            </div>
            <div className="relative aspect-video w-full bg-black border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
              <div ref={localVideoRef} className="absolute inset-0 w-full h-full object-cover z-0" />
              {!isVideoOn && <span className="text-xs text-zinc-600 font-mono z-10">Your Camera Off</span>}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 space-y-3 mt-4 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-500' : 'text-zinc-500'}`} />
              Signaling Server
            </span>
            <span className={`font-mono text-xs ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleAudio} className={`flex items-center justify-center gap-2 py-2 border rounded transition-colors text-xs font-medium ${isMuted ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-emerald-950 border-emerald-800 text-emerald-400'}`}>
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isMuted ? 'Unmute' : 'Muted'}
            </button>
            <button onClick={toggleVideo} className={`flex items-center justify-center gap-2 py-2 border rounded transition-colors text-xs font-medium ${!isVideoOn ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-blue-950 border-blue-900 text-blue-400'}`}>
              {!isVideoOn ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              {!isVideoOn ? 'Start Video' : 'Stop Video'}
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- CANVAS & FLOATING HUD ZONE ---------------- */}
      <main className="flex-1 h-full relative bg-zinc-900 overflow-hidden">
        
        {activeQuestion && (
          <div className="absolute top-20 left-6 z-[100] w-full max-w-[420px] max-h-[80vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-xl p-5 animate-in slide-in-from-left-8 fade-in duration-300">
            
            <button 
              onClick={() => {
                setActiveQuestion(null);
                setShowSolution(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-all"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <BookOpen className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Active Workspace</h3>
            </div>
            
            <div className="text-[15px] text-zinc-100 leading-relaxed pr-6 font-medium">
              <MathRenderer content={activeQuestion.question_text} />
            </div>
            
            {activeQuestion.formula && (
              <div className="mt-4 p-3 bg-black/50 rounded-lg border border-zinc-800/50 text-[15px] overflow-x-auto text-emerald-400 text-center">
                <MathRenderer content={`$${activeQuestion.formula.replace(/^\$|\$$/g, '')}$`} />
              </div>
            )}
            
            <div className="mt-5 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Tutor Solution Reference</p>
                <button 
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 px-2.5 py-1.5 rounded transition-all"
                >
                  {showSolution ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Reveal</>}
                </button>
              </div>
              
              {showSolution && (
                <div className="text-[13px] text-zinc-400 overflow-x-auto animate-in fade-in duration-300 mt-3 bg-zinc-900/30 p-3 rounded-lg">
                  <MathRenderer content={activeQuestion.solution} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-0">
          <Tldraw onMount={handleMount} />
        </div>
      </main>
    </div>
  );
}
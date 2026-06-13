'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import {
  Video, VideoOff, Mic, MicOff, Wifi, Users, BookOpen,
  FolderTree, ChevronRight, ChevronLeft, BarChart, X,
  Eye, EyeOff, Menu, Calculator, ChevronDown, ChevronUp
} from 'lucide-react';
import ScientificCalculator from '@/components/Calculator';
import MathRenderer from '@/components/MathRenderer';

const Whiteboard = dynamic(() => import('@/components/Whiteboard'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-500 font-mono text-sm animate-pulse">
      Loading Whiteboard...
    </div>
  ),
});

export default function ClassroomPage() {
  const [supabase] = useState(() => createClient());
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const channelRef = useRef<any>(null);

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

  // ── MOBILE STATE ──
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileQuestion, setShowMobileQuestion] = useState(false);
  const [showMobileCalc, setShowMobileCalc] = useState(false);

  const ROOM_ID = 'global-classroom-final-fix';

  // Close question sheet when question cleared
  useEffect(() => {
    if (!activeQuestion) setShowMobileQuestion(false);
  }, [activeQuestion]);

  // Auto-open question sheet on mobile when question selected
  useEffect(() => {
    if (activeQuestion) setShowMobileQuestion(true);
  }, [activeQuestion]);

  // DATABASE FETCH
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

  // SUPABASE REALTIME
  useEffect(() => {
    const channel = supabase.channel(`canvas:${ROOM_ID}`, {
      config: { broadcast: { self: false }, presence: { key: 'user' } },
    });
    channelRef.current = channel;
    channel.on('presence', { event: 'sync' }, () =>
      setPeerCount(Object.keys(channel.presenceState()).length || 1)
    );
    channel.subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (agoraClientRef.current) {
        localTracksRef.current.audioTrack?.close();
        localTracksRef.current.videoTrack?.close();
        agoraClientRef.current.leave();
      }
    };
  }, [supabase]);

  const handleCanvasChange = useCallback(() => {}, []);
  const handleMount = useCallback((_api: any) => {}, []);

  // AGORA
  const initializeAgora = async () => {
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    if (!agoraClientRef.current) {
      agoraClientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClientRef.current.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
        await agoraClientRef.current.subscribe(user, mediaType);
        if (mediaType === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = '';
          user.videoTrack.play(remoteVideoRef.current);
        }
        if (mediaType === 'audio') user.audioTrack.play();
      });
    }
  };

  const AGORA_TOKEN = '007eJxTYNhmZdAYb3ZNxnOlg7HL/pKl+7ISGk6eOP6T27PyoFp41UEFBsukJJNkwyTzRONkQxMTC8OkRFPDJAtjA3MTQwOLZAvjWyUKWQ2BjAyWZxkYGKEQxJdiSM/JT0rM0U3OSSwuLsrPz9UtTi0uzszP0zVkYAAAET8meA==';
  const AGORA_APP_ID = '9bb4c1b7a3c14481ba51b83074108c83';

  const toggleAudio = async () => {
    try {
      await initializeAgora();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      if (!localTracksRef.current.audioTrack) {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracksRef.current.audioTrack = audioTrack;
        if (agoraClientRef.current.connectionState === 'DISCONNECTED')
          await agoraClientRef.current.join(AGORA_APP_ID, ROOM_ID, AGORA_TOKEN, null);
        await agoraClientRef.current.publish([audioTrack]);
        setIsMuted(false);
      } else {
        await localTracksRef.current.audioTrack.setEnabled(isMuted);
        setIsMuted(!isMuted);
      }
    } catch (err) { console.error('Audio error:', err); }
  };

  const toggleVideo = async () => {
    try {
      await initializeAgora();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      if (!localTracksRef.current.videoTrack) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.videoTrack = videoTrack;
        if (agoraClientRef.current.connectionState === 'DISCONNECTED')
          await agoraClientRef.current.join(AGORA_APP_ID, ROOM_ID, AGORA_TOKEN, null);
        await agoraClientRef.current.publish([videoTrack]);
        if (localVideoRef.current) videoTrack.play(localVideoRef.current);
        setIsVideoOn(true);
      } else {
        await localTracksRef.current.videoTrack.setEnabled(!isVideoOn);
        setIsVideoOn(!isVideoOn);
      }
    } catch (err) { console.error('Video error:', err); }
  };

  // ── SIDEBAR CONTENT (shared between desktop & mobile drawer) ──
  const SidebarContent = () => (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <span className="text-xs font-semibold tracking-widest text-blue-500 uppercase">Live Session</span>
          <h2 className="text-xl font-bold tracking-tight mt-1">Workspace</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-800 text-xs">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">{peerCount}</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Curriculum Browser */}
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-inner">
        <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex items-center gap-2 shrink-0">
          <FolderTree className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-medium">Curriculum Browser</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && <div className="p-4 text-center text-xs text-zinc-500 animate-pulse">Loading Database...</div>}

          {!isLoading && !activeSubject && Object.keys(curriculumTree).map((subject) => (
            <button key={subject} onClick={() => setActiveSubject(subject)}
              className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-sm border border-transparent hover:border-zinc-800 transition-colors">
              <span>{subject === 'Maths' ? '📐' : '⚛️'} {subject}</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          ))}

          {activeSubject && !activeYear && (
            <div className="space-y-1">
              <button onClick={() => setActiveSubject(null)}
                className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2">
                <ChevronLeft className="w-3 h-3" /> Back to Subjects
              </button>
              {Object.keys(curriculumTree[activeSubject!] || {}).sort().map((year) => (
                <button key={year} onClick={() => setActiveYear(year)}
                  className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-sm border border-zinc-900 transition-colors">
                  <span className="truncate pr-2 text-zinc-300">{year}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {activeSubject && activeYear && !activeTopic && (
            <div className="space-y-1">
              <button onClick={() => setActiveYear(null)}
                className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2">
                <ChevronLeft className="w-3 h-3" /> Back to Years
              </button>
              {Object.keys(curriculumTree[activeSubject!][activeYear!] || {}).map((topic) => (
                <button key={topic} onClick={() => setActiveTopic(topic)}
                  className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-xs border border-zinc-900 transition-colors">
                  <span className="truncate pr-2 text-zinc-300">{topic}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {activeSubject && activeYear && activeTopic && !activeDifficulty && (
            <div className="space-y-1">
              <button onClick={() => setActiveTopic(null)}
                className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2 border-b border-zinc-900 pb-3">
                <ChevronLeft className="w-3 h-3" /> Back to Topics
              </button>
              {Object.keys(curriculumTree[activeSubject!][activeYear!][activeTopic!] || {}).map((diff) => (
                <button key={diff} onClick={() => setActiveDifficulty(diff)}
                  className="w-full text-left p-3 hover:bg-zinc-900 rounded flex justify-between items-center text-xs border border-zinc-900 transition-colors">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <BarChart className="w-3 h-3 text-emerald-500" />
                    <span>{diff}</span>
                  </div>
                  <span className="text-blue-500 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {curriculumTree[activeSubject!][activeYear!][activeTopic!][diff].length} Qs
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeSubject && activeYear && activeTopic && activeDifficulty && (
            <div className="space-y-1">
              <button onClick={() => { setActiveDifficulty(null); setActiveQuestion(null); setShowSolution(false); }}
                className="w-full text-left p-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-2 border-b border-zinc-900 pb-3">
                <ChevronLeft className="w-3 h-3" /> Back to Tiers
              </button>
              {curriculumTree[activeSubject!][activeYear!][activeTopic!][activeDifficulty!].map((q: any, idx: number) => (
                <button key={q.id}
                  onClick={() => {
                    setActiveQuestion(q);
                    setShowSolution(false);
                    setShowMobileSidebar(false); // close drawer on mobile after picking
                  }}
                  className={`w-full text-left p-3 rounded text-xs transition-colors border ${
                    activeQuestion?.id === q.id
                      ? 'bg-blue-950 border-blue-900 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}>
                  <span className="font-semibold text-blue-500 mr-2">Q{idx + 1}.</span>
                  <span className="line-clamp-2 mt-1"><MathRenderer content={q.question_text} /></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Feeds - hidden on mobile to save space */}
      <div className="space-y-2 shrink-0 hidden lg:block">
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
  );

  // ── QUESTION PANEL CONTENT (shared) ──
  const QuestionPanel = () => (
    <>
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
          <button onClick={() => setShowSolution(!showSolution)}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 px-2.5 py-1.5 rounded transition-all">
            {showSolution ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Reveal</>}
          </button>
        </div>
        {showSolution && (
          <div className="text-[13px] text-zinc-400 overflow-x-auto animate-in fade-in duration-300 mt-3 bg-zinc-900/30 p-3 rounded-lg">
            <MathRenderer content={activeQuestion.solution} />
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden">

      {/* ── MOBILE BACKDROP ── */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* ── SIDEBAR (desktop: static | mobile: slide-in drawer) ── */}
      <aside className={`
        w-[300px] lg:w-[340px] shrink-0
        bg-zinc-900 border-r border-zinc-800
        flex flex-col justify-between p-4 shadow-2xl
        lg:relative lg:translate-x-0 lg:z-20
        fixed inset-y-0 left-0 z-50
        transition-transform duration-300 ease-in-out
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />

        {/* Controls */}
        <div className="pt-4 border-t border-zinc-800 space-y-3 mt-4 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-500' : 'text-zinc-500'}`} />
              Signaling Server
            </span>
            <span className={`font-mono text-xs ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isConnected ? 'ONLINE' : 'CONNECTING...'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleAudio}
              className={`flex items-center justify-center gap-2 py-2.5 border rounded transition-colors text-xs font-medium ${
                isMuted ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-emerald-950 border-emerald-800 text-emerald-400'
              }`}>
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isMuted ? 'Unmute' : 'Muted'}
            </button>
            <button onClick={toggleVideo}
              className={`flex items-center justify-center gap-2 py-2.5 border rounded transition-colors text-xs font-medium ${
                !isVideoOn ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-blue-950 border-blue-900 text-blue-400'
              }`}>
              {!isVideoOn ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              {!isVideoOn ? 'Start Video' : 'Stop Video'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* ── MOBILE TOP BAR ── */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0 z-30">
          <button onClick={() => setShowMobileSidebar(true)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest">Live Session</p>
            <p className="text-sm font-bold">Workspace</p>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-full text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">{peerCount}</span>
          </div>
        </div>

        {/* ── CANVAS ── */}
        <div className="flex-1 relative bg-zinc-100">
          <div className="absolute inset-0" style={{ zIndex: 0 }}>
            <Whiteboard onMount={handleMount} onChange={handleCanvasChange} />
          </div>

          {/* ── DESKTOP QUESTION PANEL (floating top-left) ── */}
          {activeQuestion && (
            <div className="hidden lg:block absolute top-6 left-6 z-20 w-full max-w-[420px] max-h-[80vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-xl p-5 animate-in slide-in-from-left-8 fade-in duration-300">
              <button
                onClick={() => { setActiveQuestion(null); setShowSolution(false); }}
                className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-all">
                <X className="w-5 h-5" />
              </button>
              <QuestionPanel />
            </div>
          )}
        </div>

        {/* ── MOBILE QUESTION BOTTOM SHEET ── */}
        {activeQuestion && (
          <>
            {/* Backdrop */}
            {showMobileQuestion && (
              <div
                className="lg:hidden fixed inset-0 bg-black/40 z-30"
                onClick={() => setShowMobileQuestion(false)}
              />
            )}
            {/* Sheet */}
            <div className={`
              lg:hidden fixed left-0 right-0 bottom-16 z-40
              bg-zinc-950 border-t border-zinc-800 shadow-2xl
              transition-transform duration-300 ease-in-out
              rounded-t-2xl
              ${showMobileQuestion ? 'translate-y-0' : 'translate-y-full'}
            `}>
              {/* Drag Handle + Toggle */}
              <button
                onClick={() => setShowMobileQuestion(!showMobileQuestion)}
                className="w-full flex flex-col items-center pt-3 pb-2 gap-1">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Active Question</span>
                  {showMobileQuestion
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />}
                </div>
              </button>
              <div className="px-5 pb-5 max-h-[55vh] overflow-y-auto">
                <button
                  onClick={() => { setActiveQuestion(null); setShowSolution(false); }}
                  className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-all">
                  <X className="w-5 h-5" />
                </button>
                <QuestionPanel />
              </div>
            </div>
          </>
        )}

        {/* ── MOBILE BOTTOM NAV ── */}
        <div className="lg:hidden flex items-center justify-around px-2 py-2 bg-zinc-900 border-t border-zinc-800 shrink-0 z-30">
          {/* Questions */}
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Questions</span>
          </button>

          {/* Active Question toggle */}
          {activeQuestion && (
            <button
              onClick={() => setShowMobileQuestion(!showMobileQuestion)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                showMobileQuestion ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}>
              <Eye className="w-5 h-5" />
              <span className="text-[10px] font-medium">Current Q</span>
            </button>
          )}

          {/* Mic */}
          <button
            onClick={toggleAudio}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              !isMuted ? 'bg-emerald-700 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{isMuted ? 'Unmute' : 'Muted'}</span>
          </button>

          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              isVideoOn ? 'bg-blue-700 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{isVideoOn ? 'Camera' : 'Camera'}</span>
          </button>

          {/* Calculator */}
          <button
            onClick={() => setShowMobileCalc(!showMobileCalc)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              showMobileCalc ? 'bg-purple-700 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            <Calculator className="w-5 h-5" />
            <span className="text-[10px] font-medium">Calc</span>
          </button>
        </div>
      </main>

      {/* ── DESKTOP FLOATING COMPONENTS ── */}
      <div className="hidden lg:block">
        <ScientificCalculator />
      </div>

      {/* ── MOBILE CALCULATOR OVERLAY ── */}
      {showMobileCalc && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center pb-20">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileCalc(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600">
              <span className="text-white font-bold">🧮 Scientific Calculator</span>
              <button onClick={() => setShowMobileCalc(false)} className="text-white hover:text-blue-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Inline calculator for mobile */}
            <div className="p-4">
              <ScientificCalculator />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

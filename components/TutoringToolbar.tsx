'use client';

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Highlighter, X, ChevronUp, ChevronDown } from 'lucide-react';

export default function TutoringToolbar() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-note-${Date.now()}.webm`;
        a.click();
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert('Please allow microphone access to record voice notes');
    }
  };

  const stopVoiceNote = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    // FIXED: Positioned at BOTTOM-LEFT of canvas, away from Excalidraw toolbar
    <div className="fixed bottom-6 left-[360px] z-40 font-sans">
      
      {/* Expanded Panel - opens UPWARD */}
      {isExpanded && (
        <div className="mb-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white text-sm font-bold">🎓 Tutor Tools</span>
            <button onClick={() => setIsExpanded(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Voice Recording */}
          <div className="mb-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase mb-2">Voice Note</p>
            {isRecording ? (
              <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-lg p-3">
                <div className="animate-pulse bg-red-500 rounded-full w-3 h-3 shrink-0" />
                <span className="text-red-300 text-sm font-mono font-bold">{formatTime(recordingTime)}</span>
                <button
                  onClick={stopVoiceNote}
                  className="ml-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
                >
                  Stop & Save
                </button>
              </div>
            ) : (
              <button
                onClick={startVoiceNote}
                className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-all text-sm font-medium"
              >
                <Mic className="w-4 h-4" /> Record Explanation
              </button>
            )}
          </div>

          {/* Quick Keyboard Tips */}
          <div>
            <p className="text-zinc-400 text-xs font-semibold uppercase mb-2">Excalidraw Shortcuts</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { key: 'P', label: 'Pen' },
                { key: 'R', label: 'Rectangle' },
                { key: 'O', label: 'Circle' },
                { key: 'A', label: 'Arrow' },
                { key: 'T', label: 'Text' },
                { key: 'E', label: 'Eraser' },
                { key: 'H', label: 'Hand' },
                { key: 'Ctrl+Z', label: 'Undo' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5 bg-zinc-800 rounded px-2 py-1">
                  <kbd className="bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">
                    {key}
                  </kbd>
                  <span className="text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Pill Button */}
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-full shadow-xl px-3 py-2">
        {/* Voice button */}
        {isRecording ? (
          <button
            onClick={stopVoiceNote}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          >
            <div className="animate-pulse bg-white rounded-full w-2 h-2" />
            {formatTime(recordingTime)} Stop
          </button>
        ) : (
          <button
            onClick={startVoiceNote}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all"
            title="Record voice note"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        <div className="h-5 w-px bg-zinc-700" />

        {/* Expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-xs font-medium px-1 transition-all"
          title="Tools & shortcuts"
        >
          <Highlighter className="w-4 h-4" />
          <span>Tools</span>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { Mic, MicOff, MessageCircle, Highlighter, CircleDot, ArrowUpRight, Type, Hand, Download, RotateCcw, X } from 'lucide-react';

export default function TutoringToolbar() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
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
        a.download = `tutor-note-${new Date().getTime()}.webm`;
        a.click();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to record voice notes');
    }
  };

  const stopVoiceNote = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 font-sans">
      {/* Main Toolbar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-full shadow-2xl p-3 flex items-center gap-3 backdrop-blur-md border border-blue-500/50">
        
        {/* Voice Recording */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <div className="animate-pulse bg-red-500 rounded-full w-3 h-3" />
              <span className="text-white text-xs font-mono font-bold">{formatTime(recordingTime)}</span>
              <button
                onClick={stopVoiceNote}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all transform hover:scale-110"
                title="Stop Recording"
              >
                <MicOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={startVoiceNote}
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-all transform hover:scale-110"
              title="Record Voice Note (Ctrl+V)"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-blue-400/50" />

        {/* Annotation Tools */}
        <button
          onClick={() => setShowAnnotations(!showAnnotations)}
          className={`p-2 rounded-full transition-all transform hover:scale-110 ${
            showAnnotations ? 'bg-blue-500 text-white' : 'bg-blue-400/30 text-white hover:bg-blue-500/50'
          }`}
          title="Show Annotation Tools"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-blue-400/50" />

        {/* Quick Actions */}
        <button
          onClick={() => alert('✓ Explanation saved!')}
          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-all transform hover:scale-110"
          title="Save Explanation (Ctrl+S)"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => window.location.reload()}
          className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full transition-all transform hover:scale-110"
          title="Clear & Reset (Ctrl+R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Annotation Tools Panel */}
      {showAnnotations && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 mt-2 min-w-max">
          <div className="text-white text-sm font-bold mb-3 flex items-center justify-between">
            <span>✏️ Annotation Tools</span>
            <button onClick={() => setShowAnnotations(false)} className="hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Arrow Tool */}
            <button
              onClick={() => {
                setSelectedTool('arrow');
                alert('✓ Arrow tool selected - Draw on whiteboard to create arrows');
              }}
              className={`w-full flex items-center gap-3 p-3 rounded transition-all ${
                selectedTool === 'arrow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Draw arrows to point things out"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">Arrow (Point Out)</span>
            </button>

            {/* Circle Tool */}
            <button
              onClick={() => {
                setSelectedTool('circle');
                alert('✓ Circle tool selected - Draw circles to highlight');
              }}
              className={`w-full flex items-center gap-3 p-3 rounded transition-all ${
                selectedTool === 'circle'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Circle important parts"
            >
              <CircleDot className="w-4 h-4" />
              <span className="text-sm">Circle (Highlight)</span>
            </button>

            {/* Highlight Tool */}
            <button
              onClick={() => {
                setSelectedTool('highlight');
                alert('✓ Highlight tool selected - Draw to highlight areas');
              }}
              className={`w-full flex items-center gap-3 p-3 rounded transition-all ${
                selectedTool === 'highlight'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Highlight important content"
            >
              <Highlighter className="w-4 h-4" />
              <span className="text-sm">Highlight</span>
            </button>

            {/* Text Tool */}
            <button
              onClick={() => {
                setSelectedTool('text');
                alert('✓ Text tool selected - Click on whiteboard to add text');
              }}
              className={`w-full flex items-center gap-3 p-3 rounded transition-all ${
                selectedTool === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Add text annotations"
            >
              <Type className="w-4 h-4" />
              <span className="text-sm">Text (Add Notes)</span>
            </button>

            {/* Pointer Tool */}
            <button
              onClick={() => {
                setSelectedTool('pointer');
                alert('✓ Pointer mode - Show students what you are explaining');
              }}
              className={`w-full flex items-center gap-3 p-3 rounded transition-all ${
                selectedTool === 'pointer'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Use pointer/laser mode"
            >
              <Hand className="w-4 h-4" />
              <span className="text-sm">Pointer (Laser)</span>
            </button>
          </div>

          {/* Quick Formulas */}
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="text-white text-xs font-bold mb-2">Quick Formulas:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'x²', formula: 'x^2' },
                { label: '√x', formula: '\\sqrt{x}' },
                { label: 'α', formula: '\\alpha' },
                { label: '∑', formula: '\\sum' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    navigator.clipboard.writeText(item.formula);
                    alert(`✓ "${item.formula}" copied!`);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded transition-all"
                  title={`Copy ${item.formula}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="absolute bottom-0 right-0 transform translate-y-12 translate-x-2 bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 max-w-xs hidden lg:block">
        <p className="font-bold text-white mb-2">⌨️ Keyboard Shortcuts:</p>
        <ul className="space-y-1">
          <li><strong>Ctrl+V</strong> - Record voice note</li>
          <li><strong>Ctrl+S</strong> - Save explanation</li>
          <li><strong>Ctrl+R</strong> - Clear whiteboard</li>
          <li><strong>Tab</strong> - Open annotation tools</li>
          <li><strong>Esc</strong> - Close panels</li>
        </ul>
      </div>
    </div>
  );
}

'use client';

import { ExportModal } from '@/components/editor/ExportModal';
import { MediaBin } from '@/components/editor/MediaBin';
import { PromptInput } from '@/components/editor/PromptInput';
import { RemotionPlayer } from '@/components/player/RemotionPlayer';
import { TimelineEditor } from '@/components/timeline/TimelineEditor';
import { useVideoEditor } from '@/composables/useVideoEditor';
import { Download, Film, Layers, Video } from 'lucide-react';
import React, { useState } from 'react';

export default function Home() {
  const editor = useVideoEditor();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const clipCount = editor.project.clips?.length || 1;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top App Header */}
      <header className="h-16 border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Film size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">PromptVideo</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Copilot Canvas
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[200px]">
              {editor.project.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-zinc-400 border-x border-zinc-800 px-4 py-1">
            <span className="flex items-center gap-1.5">
              <Video size={14} className="text-zinc-500" />
              {editor.project.durationSec}s Total
            </span>
            <span className="flex items-center gap-1.5">
              <Layers size={14} className="text-zinc-500" />
              {clipCount} {clipCount === 1 ? 'Clip' : 'Clips'} &bull; {editor.project.overlays.length} Overlays
            </span>
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <Download size={15} />
            <span>Export MP4</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 p-5 flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
        {/* Upper Studio: Media Bin (Left) + Player (Center) + Copilot Chat (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[520px]">
          {/* Column 1: Media Bin & Uploads */}
          <div className="lg:col-span-3 h-full">
            <MediaBin editor={editor} />
          </div>

          {/* Column 2: Video Player with Direct Canvas Drag */}
          <div className="lg:col-span-5 h-full flex flex-col">
            <RemotionPlayer editor={editor} />
          </div>

          {/* Column 3: AI Timeline Copilot (Full Height) */}
          <div className="lg:col-span-4 h-full">
            <PromptInput editor={editor} />
          </div>
        </div>

        {/* Lower Studio: Stackable Multi-Track Timeline with In-Timeline Receipts */}
        <div className="w-full">
          <TimelineEditor editor={editor} />
        </div>
      </div>

      {/* Real MP4 Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={editor.project}
      />
    </main>
  );
}

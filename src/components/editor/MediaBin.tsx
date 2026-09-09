'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { MediaAsset } from '@/types';
import { formatTimecode } from '@/utils/time';
import { Clock, Film, FolderUp, Plus, Sparkles, UploadCloud, Video } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';

interface MediaBinProps {
  editor: UseVideoEditorReturn;
}

export const MediaBin: React.FC<MediaBinProps> = ({ editor }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { mediaAssets, addMediaAsset, stitchClipToTimeline } = editor;

  const processVideoFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error(`"${file.name}" is not a recognized video file.`);
      return;
    }

    setIsProcessing(true);
    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration || 10;
      const width = tempVideo.videoWidth || 1280;
      const height = tempVideo.videoHeight || 720;

      // Capture a quick thumbnail frame at 0.5s
      tempVideo.currentTime = Math.min(1.0, duration * 0.1);

      tempVideo.onseeked = () => {
        let thumbnailUrl: string | undefined;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, 160, 90);
            thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
          }
        } catch {
          // Cross-origin or local canvas fallback
        }

        const newAsset: MediaAsset = {
          id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url: objectUrl,
          durationSec: Number(duration.toFixed(1)),
          width,
          height,
          thumbnailUrl,
          sizeBytes: file.size,
        };

        addMediaAsset(newAsset);
        setIsProcessing(false);
        toast.success(`Imported "${file.name}" (${Number(duration.toFixed(1))}s)`);
      };
    };

    tempVideo.onerror = () => {
      setIsProcessing(false);
      toast.error(`Failed to process "${file.name}". Video format may be unsupported.`);
    };
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      processVideoFile(files[i]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col h-full max-h-full min-h-0 bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={15} className="text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Media Bin ({mediaAssets.length})
          </h2>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
        >
          <FolderUp size={13} />
          <span>Import</span>
        </button>
      </div>

      {/* Hidden Multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Dropzone & Assets List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Upload Drop Target */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
          }`}
        >
          <UploadCloud size={20} className={isDragging ? 'text-emerald-400' : 'text-zinc-500'} />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-zinc-300">
              {isProcessing ? 'Importing media...' : 'Drop clips here or click to browse'}
            </span>
            <span className="text-[10px] text-zinc-500">MP4, WebM, MOV</span>
          </div>
        </div>

        {/* Media Asset Cards */}
        <div className="flex flex-col gap-2">
          {mediaAssets.map((asset) => {
            return (
              <div
                key={asset.id}
                className="group p-2 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/80 rounded-xl flex items-center gap-3 transition-all"
              >
                {/* Thumbnail / Video Icon */}
                <div className="relative w-16 h-10 rounded-lg bg-zinc-950 overflow-hidden flex items-center justify-center border border-zinc-800 shrink-0">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video size={16} className="text-zinc-600" />
                  )}
                  <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono text-zinc-300 flex items-center gap-0.5">
                    <Clock size={8} />
                    <span>{formatTimecode(asset.durationSec)}</span>
                  </div>
                </div>

                {/* Clip Meta */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                    {asset.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {asset.width}x{asset.height} &bull; {asset.durationSec}s
                  </span>
                </div>

                {/* Quick Add / Stitch Button */}
                <button
                  onClick={() => {
                    stitchClipToTimeline(asset, 'end');
                    toast.success(`Stitched "${asset.name}" to end of timeline`);
                  }}
                  title="Stitch to Timeline"
                  className="px-2 py-1 bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus size={12} />
                  <span>Stitch</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

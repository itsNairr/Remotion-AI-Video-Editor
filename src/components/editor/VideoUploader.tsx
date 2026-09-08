'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { FileVideo, Plus, Upload, Video } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';

interface VideoUploaderProps {
  editor: UseVideoEditorReturn;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ editor }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processVideoFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a valid video file (.mp4, .mov, .webm)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration || 30;
      const width = tempVideo.videoWidth || 1280;
      const height = tempVideo.videoHeight || 720;

      editor.setProject({
        id: `proj_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        sourceUrl: objectUrl,
        durationSec: Math.round(duration),
        fps: 30,
        width,
        height,
        cuts: [],
        overlays: [],
        zooms: [],
      });

      editor.updatePlayhead(0);

      toast.success(
        `Loaded "${file.name}" (${Math.round(duration)}s, ${width}x${height})`
      );
    };

    tempVideo.onerror = () => {
      toast.error('Failed to read video metadata. Please check the file codec.');
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-zinc-700/60 shadow-sm transition active:scale-95 cursor-pointer"
        title="Upload your own MP4, WebM, or MOV video"
      >
        <Upload size={14} className="text-emerald-400" />
        <span>Upload Video</span>
      </button>
    </div>
  );
};

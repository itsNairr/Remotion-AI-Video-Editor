'use client';

import { VideoProjectState } from '@/types/editor';
import { exportProjectToMp4, ExportProgress } from '@/utils/exportVideo';
import { CheckCircle2, Download, Film, Loader2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProjectState;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, project }) => {
  const [progress, setProgress] = useState<ExportProgress>({
    percent: 0,
    currentSec: 0,
    status: 'Initializing video renderer...',
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    setDownloadUrl(null);
    setError(null);
    setProgress({ percent: 0, currentSec: 0, status: '' });
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Start export when opened
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    exportProjectToMp4(
      project,
      (p) => setProgress(p),
      abortController.signal,
      previewCanvasRef.current
    )
      .then((result) => {
        setIsExporting(false);
        if (result.downloadUrl) {
          setDownloadUrl(result.downloadUrl);
          setFilename(result.filename);
        }
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) return;
        setIsExporting(false);
        const message = err instanceof Error ? err.message : 'Export failed';
        setError(message);
      });

    return () => {
      abortController.abort();
    };
  }, [isOpen, project]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Film size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Exporting MP4 Video</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {project.width}x{project.height} @ {project.fps}fps &bull; Zero Cloud Costs
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Live Preview Canvas */}
          <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-inner">
            <canvas
              ref={previewCanvasRef}
              width={320}
              height={180}
              className="w-full h-full object-contain"
            />
            {isExporting && (
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-zinc-700/60 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Frame Capture
              </div>
            )}
          </div>

          {/* Progress Bar & Status */}
          {isExporting && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-emerald-400" />
                  Rendering Timeline Edits...
                </span>
                <span className="font-mono font-bold text-emerald-400">{progress.percent}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <span className="text-[11px] text-zinc-400 font-mono truncate">
                {progress.status}
              </span>
            </div>
          )}

          {/* Success State */}
          {!isExporting && downloadUrl && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <CheckCircle2 size={16} />
                <span>Export Completed & Saved!</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Your video has been rendered and your browser automatically initiated the download of{' '}
                <span className="text-white font-mono">{filename}</span>.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={downloadUrl}
                  download={filename}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-emerald-950/40"
                >
                  <Download size={13} />
                  <span>Download Again</span>
                </a>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isExporting && error && (
            <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex flex-col gap-1.5">
              <span className="text-xs font-bold text-red-400">Export Error</span>
              <p className="text-[11px] text-zinc-400">{error}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between text-xs">
          <span className="text-[11px] text-zinc-500 font-mono">
            {project.cuts.length} cuts &bull; {project.overlays.length} overlays applied
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              {isExporting ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

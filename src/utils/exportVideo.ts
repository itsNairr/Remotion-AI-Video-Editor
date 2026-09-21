'use client';

import { VideoProjectState } from '@/types/editor';
import { getActiveOverlays, getActiveZoom, isTimeInsideCut } from './editor';
import { computeTextMetrics } from './textRendering';

export interface ExportProgress {
  percent: number;
  currentSec: number;
  status: string;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  downloadUrl?: string;
  filename: string;
  error?: string;
}

export async function exportProjectToMp4(
  project: VideoProjectState,
  onProgress?: (progress: ExportProgress) => void,
  abortSignal?: AbortSignal,
  previewCanvas?: HTMLCanvasElement | null
): Promise<ExportResult> {
  const filename = `${(project.title || 'video_export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')}_edited.mp4`;

  return new Promise(async (resolve, reject) => {
    try {
      // 1. Gather all stitched clips & preload video elements
      const clips = (project.clips && project.clips.length > 0)
        ? project.clips
        : [{
            id: 'clip_default',
            name: project.title || 'Source Video',
            sourceUrl: project.sourceUrl,
            startSec: 0,
            endSec: project.durationSec,
            clipDurationSec: project.durationSec,
            inPointSec: 0,
          }];

      const videoMap = new Map<string, HTMLVideoElement>();
      for (const clip of clips) {
        if (!videoMap.has(clip.sourceUrl)) {
          const v = document.createElement('video');
          v.crossOrigin = 'anonymous';
          v.src = clip.sourceUrl;
          v.muted = true;
          v.playsInline = true;

          await new Promise<void>((res, rej) => {
            v.onloadedmetadata = () => res();
            v.onerror = () => rej(new Error(`Failed to load video "${clip.name}" for rendering`));
            setTimeout(() => rej(new Error(`Loading timed out for "${clip.name}"`)), 15000);
          });
          videoMap.set(clip.sourceUrl, v);
        }
      }

      const primaryVideo = videoMap.get(clips[0].sourceUrl)!;
      const width = project.width || 1280;
      const height = project.height || 720;
      const fps = project.fps || 30;
      const totalDuration = project.durationSec || primaryVideo.duration || 10;

      // 2. Off-screen canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not create 2D canvas context');
      }

      // Off-screen canvas for knockout text mask
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');

      // 3. MediaRecorder setup
      const canvasStream = canvas.captureStream(fps);
      let mimeType = 'video/mp4';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      const recordedChunks: Blob[] = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 6000000, // 6 Mbps high quality
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType.includes('mp4') ? 'video/mp4' : mimeType });
        const downloadUrl = URL.createObjectURL(finalBlob);

        // Auto trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        resolve({
          success: true,
          blob: finalBlob,
          downloadUrl,
          filename,
        });
      };

      recorder.start(100);

      // 4. Render timeline step by step
      const stepSec = 1 / fps;
      let currentSec = 0;

      const previewCtx = previewCanvas?.getContext('2d');

      const renderFrame = async (t: number) => {
        return new Promise<void>((frameDone) => {
          const activeClipsAtTime = clips
            .filter((c) => c.startSec <= t && t < c.endSec)
            .sort((a, b) => (a.trackIndex || 0) - (b.trackIndex || 0));
          const activeClip = activeClipsAtTime[activeClipsAtTime.length - 1] || clips[clips.length - 1];
          const clipVideo = videoMap.get(activeClip.sourceUrl) || primaryVideo;
          const localTime = Math.max(0, (t - activeClip.startSec) + (activeClip.inPointSec || 0));

          clipVideo.currentTime = localTime;
          const onSeeked = () => {
            clipVideo.removeEventListener('seeked', onSeeked);

            // Clear canvas
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // A. Handle Active Zoom
            const activeZoom = getActiveZoom(t, project.zooms);
            const scale = activeZoom ? activeZoom.scale : 1.0;
            const isSpeaker =
              activeZoom?.target_anchor === 'speaker_face' || activeZoom?.target_anchor === 'top_center';
            const anchorX = (activeZoom?.anchorX ?? 0.5) * width;
            const anchorY = isSpeaker ? 0.35 * height : (activeZoom?.anchorY ?? 0.5) * height;

            ctx.save();
            if (scale > 1.0) {
              ctx.translate(anchorX, anchorY);
              ctx.scale(scale, scale);
              ctx.translate(-anchorX, -anchorY);
            }
            ctx.drawImage(clipVideo, 0, 0, width, height);
            ctx.restore();

            // B. Active Overlays (1:1 identical to Remotion Preview)
            const activeOverlays = getActiveOverlays(t, project.overlays).sort(
              (a, b) => (a.trackIndex || 0) - (b.trackIndex || 0)
            );
            for (const overlay of activeOverlays) {
              const metrics = computeTextMetrics(overlay, width, height, (text, font) => {
                ctx.font = font;
                return ctx.measureText(text).width;
              });

              if (metrics.isKnockout && maskCtx) {
                // Knockout text: Black background with text cutout revealing video underneath
                maskCtx.clearRect(0, 0, width, height);
                maskCtx.fillStyle = metrics.bgColor;
                maskCtx.fillRect(0, 0, width, height);

                // Cut out text
                maskCtx.globalCompositeOperation = 'destination-out';
                maskCtx.font = metrics.fontString;
                maskCtx.textAlign = 'center';
                maskCtx.textBaseline = 'middle';
                maskCtx.fillText(overlay.text.toUpperCase(), metrics.textX, metrics.textY);
                maskCtx.globalCompositeOperation = 'source-over';

                // Composite mask over main canvas
                ctx.drawImage(maskCanvas, 0, 0);
              } else if (metrics.isFullScreen) {
                // Full Screen Solid Color Screen (e.g. White Screen, Black Screen)
                ctx.save();
                ctx.fillStyle = metrics.bgColor;
                ctx.fillRect(0, 0, width, height);
                if (overlay.text && overlay.text.trim()) {
                  ctx.fillStyle = metrics.textColor;
                  ctx.font = metrics.fontString;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(overlay.text, width / 2, height / 2);
                }
                ctx.restore();
              } else {
                // Standard Overlay Box (Exact placement, colors, and typography)
                ctx.save();
                if (metrics.bgColor && metrics.bgColor !== 'transparent') {
                  ctx.fillStyle = metrics.bgColor;
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.roundRect(metrics.posX, metrics.posY, metrics.boxWidth, metrics.boxHeight, metrics.borderRadius);
                  ctx.fill();
                  ctx.stroke();
                }

                // Text
                if (overlay.text && overlay.text.trim()) {
                  ctx.fillStyle = metrics.textColor;
                  ctx.font = metrics.fontString;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(overlay.text, metrics.textX, metrics.textY);
                }
                ctx.restore();
              }
            }

            // C. Captions Layer
            if (project.captions?.enabled) {
              const cap = project.captions;
              const yOffsetPct = cap.position_y_offset ?? 14;
              const capY = height - (height * (yOffsetPct / 100));
              const text = 'Timeline Copilot in Real-Time';

              ctx.save();
              const capFontSize = Math.round(height * 0.045);
              ctx.font = `900 ${capFontSize}px sans-serif`;
              const metrics = ctx.measureText(text);
              const pillW = metrics.width + 48;
              const pillH = capFontSize + 24;
              const pillX = (width - pillW) / 2;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
              ctx.beginPath();
              ctx.roundRect(pillX, capY - pillH / 2, pillW, pillH, 16);
              ctx.fill();

              ctx.fillStyle = cap.highlight_color || '#FFDD00';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, width / 2, capY);
              ctx.restore();
            }

            // D. Draw to preview canvas if provided
            if (previewCtx && previewCanvas) {
              previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
            }

            frameDone();
          };

          clipVideo.addEventListener('seeked', onSeeked, { once: true });
        });
      };

      // Loop through frames
      while (currentSec < totalDuration) {
        if (abortSignal?.aborted) {
          recorder.stop();
          reject(new Error('Export aborted by user'));
          return;
        }

        // Check if current time is within a cut segment
        const activeCut = isTimeInsideCut(currentSec, project.cuts);
        if (activeCut) {
          // Skip dead air segment!
          const cutObj = project.cuts.find((c) => currentSec >= c.startSec && currentSec < c.endSec);
          if (cutObj && cutObj.endSec > currentSec) {
            currentSec = cutObj.endSec;
            continue;
          }
        }

        await renderFrame(currentSec);

        const progressPercent = Math.min(99, Math.round((currentSec / totalDuration) * 100));
        onProgress?.({
          percent: progressPercent,
          currentSec: Number(currentSec.toFixed(2)),
          status: `Rendering frame at ${currentSec.toFixed(1)}s / ${totalDuration.toFixed(1)}s (${progressPercent}%)`,
        });

        currentSec += stepSec;
      }

      onProgress?.({
        percent: 100,
        currentSec: totalDuration,
        status: 'Finalizing MP4 video file and preparing download...',
      });

      // Finish recording
      setTimeout(() => {
        recorder.stop();
      }, 300);
    } catch (err: unknown) {
      reject(err);
    }
  });
}

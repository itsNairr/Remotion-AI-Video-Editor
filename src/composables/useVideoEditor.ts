'use client';

import {
  CaptionsConfig,
  Cut,
  MediaAsset,
  PlayheadContext,
  SelectedElement,
  TextOverlay,
  TimelineAction,
  TimelineTrackType,
  VideoClip,
  VideoProjectState,
  Zoom,
} from '@/types';
import {
  addTrackItem,
  clamp,
  cutRangeFromClips,
  nudgeTrackItem,
  removeTrackItem,
  splitClipAtTime,
  updateTrackItem,
} from '@/utils/editor';
import { useCallback, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';

export const INITIAL_SAMPLE_ASSETS: MediaAsset[] = [
  {
    id: 'asset_sample_1',
    name: 'sample-video.mp4',
    url: '/sample-video.mp4',
    durationSec: 20,
    width: 1280,
    height: 720,
  },
  {
    id: 'asset_sample_2',
    name: 'intro_founder.mp4',
    url: '/sample-video.mp4',
    durationSec: 8,
    width: 1280,
    height: 720,
  },
  {
    id: 'asset_sample_3',
    name: 'broll_office.mp4',
    url: '/sample-video.mp4',
    durationSec: 10,
    width: 1280,
    height: 720,
  },
];

export const INITIAL_SAMPLE_PROJECT: VideoProjectState = {
  id: 'proj_sample_01',
  title: 'Founder Update: AI Video Editing',
  sourceUrl: '/sample-video.mp4',
  durationSec: 20,
  fps: 30,
  width: 1280,
  height: 720,
  trackConfig: {
    videoTrackCount: 2,
    overlayTrackCount: 2,
    zoomTrackCount: 1,
  },
  clips: [
    {
      id: 'clip_01a',
      assetId: 'asset_sample_1',
      name: 'sample-video.mp4 (Part 1)',
      sourceUrl: '/sample-video.mp4',
      startSec: 0,
      endSec: 8.0,
      clipDurationSec: 20,
      inPointSec: 0,
      trackIndex: 0,
    },
    {
      id: 'clip_01b',
      assetId: 'asset_sample_1',
      name: 'sample-video.mp4 (Part 2)',
      sourceUrl: '/sample-video.mp4',
      startSec: 8.0,
      endSec: 20.0,
      clipDurationSec: 20,
      inPointSec: 8.0,
      trackIndex: 0,
    },
  ],
  cuts: [],
  overlays: [
    {
      id: 'overlay_01',
      text: 'Crucial Update',
      startSec: 2.0,
      endSec: 6.5,
      placement: 'top_left',
      textColor: '#ffffff',
      bgColor: 'rgba(16, 185, 129, 0.9)',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      fontWeight: 'bold',
      trackIndex: 0,
    },
  ],
  zooms: [
    {
      id: 'zoom_01',
      startSec: 15.0,
      endSec: 20.0,
      scale: 1.25,
      target_anchor: 'speaker_face',
      transition: 'smooth_ease_in',
      anchorX: 0.5,
      anchorY: 0.35,
      trackIndex: 0,
    },
  ],
};

export function useVideoEditor(initialProject: VideoProjectState = INITIAL_SAMPLE_PROJECT) {
  const [project, setProject] = useState<VideoProjectState>(initialProject);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(INITIAL_SAMPLE_ASSETS);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const playerRef = useRef<PlayerRef>(null);

  const [playhead, setPlayhead] = useState<PlayheadContext>({
    currentSec: 0,
    currentFrame: 0,
    isPlaying: false,
  });

  const updatePlayhead = useCallback(
    (sec: number, isPlaying?: boolean) => {
      const clampedSec = clamp(sec, 0, project.durationSec);
      const frame = Math.round(clampedSec * project.fps);

      setPlayhead((prev) => {
        const nextPlaying = isPlaying !== undefined ? isPlaying : prev.isPlaying;
        if (
          Math.abs(prev.currentSec - clampedSec) < 0.001 &&
          prev.currentFrame === frame &&
          prev.isPlaying === nextPlaying
        ) {
          return prev;
        }
        return {
          currentSec: clampedSec,
          currentFrame: frame,
          isPlaying: nextPlaying,
        };
      });
    },
    [project.durationSec, project.fps]
  );

  const seekTo = useCallback(
    (sec: number) => {
      const clampedSec = clamp(sec, 0, project.durationSec);
      const frame = Math.round(clampedSec * project.fps);
      if (playerRef.current) {
        playerRef.current.seekTo(frame);
      }
      updatePlayhead(clampedSec);
    },
    [project.durationSec, project.fps, updatePlayhead]
  );

  const play = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
    setPlayhead((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setPlayhead((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(() => {
    if (playerRef.current) {
      if (playerRef.current.isPlaying()) {
        playerRef.current.pause();
        setPlayhead((prev) => ({ ...prev, isPlaying: false }));
      } else {
        playerRef.current.play();
        setPlayhead((prev) => ({ ...prev, isPlaying: true }));
      }
    } else {
      setPlayhead((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  }, []);

  const addMediaAsset = useCallback((asset: MediaAsset) => {
    setMediaAssets((prev) => [asset, ...prev]);
  }, []);

  const stitchClipToTimeline = useCallback(
    (
      asset: MediaAsset,
      position: 'start' | 'end' | 'at_playhead' | 'custom' = 'end',
      customTimeSec?: number,
      targetTrackIndex = 0
    ) => {
      setProject((prev) => {
        const existingClips = prev.clips && prev.clips.length > 0 ? [...prev.clips] : [
          {
            id: 'clip_default',
            name: prev.title || 'Source Video',
            sourceUrl: prev.sourceUrl,
            startSec: 0,
            endSec: prev.durationSec,
            clipDurationSec: prev.durationSec,
            inPointSec: 0,
            trackIndex: 0,
          },
        ];

        let startSec = 0;
        if (position === 'start') {
          startSec = 0;
        } else if (position === 'at_playhead') {
          startSec = playhead.currentSec;
        } else if (position === 'custom' && customTimeSec !== undefined) {
          startSec = customTimeSec;
        } else {
          // 'end' of specified track
          const trackClips = existingClips.filter((c) => (c.trackIndex || 0) === targetTrackIndex);
          const maxEnd = trackClips.length > 0 ? Math.max(...trackClips.map((c) => c.endSec)) : 0;
          startSec = maxEnd;
        }

        const newClip: VideoClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          assetId: asset.id,
          name: asset.name,
          sourceUrl: asset.url,
          startSec: Number(startSec.toFixed(2)),
          endSec: Number((startSec + asset.durationSec).toFixed(2)),
          clipDurationSec: asset.durationSec,
          inPointSec: 0,
          trackIndex: targetTrackIndex,
        };

        let updatedClips = [...existingClips];
        if (position === 'start' && targetTrackIndex === 0) {
          // Shift all existing V1 clips forward by asset.durationSec
          updatedClips = existingClips.map((c) =>
            (c.trackIndex || 0) === 0
              ? {
                  ...c,
                  startSec: Number((c.startSec + asset.durationSec).toFixed(2)),
                  endSec: Number((c.endSec + asset.durationSec).toFixed(2)),
                }
              : c
          );
          updatedClips.unshift(newClip);
        } else {
          updatedClips.push(newClip);
          updatedClips.sort((a, b) => a.startSec - b.startSec);
        }

        const newTotalDuration = Math.max(
          ...updatedClips.map((c) => c.endSec),
          prev.durationSec
        );

        const currentTracks = prev.trackConfig?.videoTrackCount || 2;
        const newTrackCount = Math.max(currentTracks, targetTrackIndex + 1);

        return {
          ...prev,
          clips: updatedClips,
          durationSec: Number(newTotalDuration.toFixed(2)),
          trackConfig: {
            videoTrackCount: newTrackCount,
            overlayTrackCount: prev.trackConfig?.overlayTrackCount || 2,
            zoomTrackCount: prev.trackConfig?.zoomTrackCount || 1,
          },
        };
      });
    },
    [playhead.currentSec]
  );

  // ---------------------------------------------------------------------------
  // Stacked Track Management API
  // ---------------------------------------------------------------------------

  const addTrack = useCallback((category: 'clips' | 'overlays' | 'zooms') => {
    setProject((prev) => {
      const currentConfig = prev.trackConfig || {
        videoTrackCount: 2,
        overlayTrackCount: 2,
        zoomTrackCount: 1,
      };
      if (category === 'clips') {
        return {
          ...prev,
          trackConfig: {
            ...currentConfig,
            videoTrackCount: Math.min(5, currentConfig.videoTrackCount + 1),
          },
        };
      }
      if (category === 'overlays') {
        return {
          ...prev,
          trackConfig: {
            ...currentConfig,
            overlayTrackCount: Math.min(5, currentConfig.overlayTrackCount + 1),
          },
        };
      }
      if (category === 'zooms') {
        return {
          ...prev,
          trackConfig: {
            ...currentConfig,
            zoomTrackCount: Math.min(4, currentConfig.zoomTrackCount + 1),
          },
        };
      }
      return prev;
    });
  }, []);

  const removeTrack = useCallback((category: 'clips' | 'overlays' | 'zooms', targetTrackIndex: number) => {
    setProject((prev) => {
      const currentConfig = prev.trackConfig || {
        videoTrackCount: 2,
        overlayTrackCount: 2,
        zoomTrackCount: 1,
      };

      if (category === 'clips') {
        const newCount = Math.max(1, currentConfig.videoTrackCount - 1);
        const updatedClips = (prev.clips || []).map((c) => {
          if ((c.trackIndex || 0) === targetTrackIndex) {
            return { ...c, trackIndex: Math.max(0, targetTrackIndex - 1) };
          }
          if ((c.trackIndex || 0) > targetTrackIndex) {
            return { ...c, trackIndex: (c.trackIndex || 0) - 1 };
          }
          return c;
        });
        return {
          ...prev,
          clips: updatedClips,
          trackConfig: { ...currentConfig, videoTrackCount: newCount },
        };
      }
      if (category === 'overlays') {
        const newCount = Math.max(1, currentConfig.overlayTrackCount - 1);
        const updatedOverlays = prev.overlays.map((o) => {
          if ((o.trackIndex || 0) === targetTrackIndex) {
            return { ...o, trackIndex: Math.max(0, targetTrackIndex - 1) };
          }
          if ((o.trackIndex || 0) > targetTrackIndex) {
            return { ...o, trackIndex: (o.trackIndex || 0) - 1 };
          }
          return o;
        });
        return {
          ...prev,
          overlays: updatedOverlays,
          trackConfig: { ...currentConfig, overlayTrackCount: newCount },
        };
      }
      if (category === 'zooms') {
        const newCount = Math.max(1, currentConfig.zoomTrackCount - 1);
        const updatedZooms = prev.zooms.map((z) => {
          if ((z.trackIndex || 0) === targetTrackIndex) {
            return { ...z, trackIndex: Math.max(0, targetTrackIndex - 1) };
          }
          if ((z.trackIndex || 0) > targetTrackIndex) {
            return { ...z, trackIndex: (z.trackIndex || 0) - 1 };
          }
          return z;
        });
        return {
          ...prev,
          zooms: updatedZooms,
          trackConfig: { ...currentConfig, zoomTrackCount: newCount },
        };
      }
      return prev;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Generic Dynamic Track Helpers (Eliminates 16 redundant entity-specific methods)
  // ---------------------------------------------------------------------------

  const addItem = useCallback(<T extends { id?: string; startSec: number }>(
    track: TimelineTrackType,
    item: T
  ) => {
    const newItem = {
      ...item,
      id: item.id || `${track.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    } as any;

    setProject((prev) => ({
      ...prev,
      [track]: addTrackItem(prev[track] as any[], newItem),
    }));
    return newItem;
  }, []);

  const updateItem = useCallback(<T>(
    track: TimelineTrackType,
    id: string,
    patch: Partial<T>
  ) => {
    setProject((prev) => ({
      ...prev,
      [track]: updateTrackItem(prev[track] as any[], id, patch),
    }));
  }, []);

  const removeItem = useCallback((track: TimelineTrackType, id: string) => {
    setProject((prev) => ({
      ...prev,
      [track]: removeTrackItem(prev[track] as any[], id),
    }));
  }, []);

  const moveItem = useCallback((
    track: TimelineTrackType,
    id: string,
    startSec: number,
    endSec: number,
    newTrackIndex?: number
  ) => {
    setProject((prev) => {
      if (track === 'clips') {
        const clips = (prev.clips || []).map((c) => {
          if (c.id !== id) return c;
          return {
            ...c,
            startSec: Number(startSec.toFixed(2)),
            endSec: Number(endSec.toFixed(2)),
            ...(newTrackIndex !== undefined ? { trackIndex: newTrackIndex } : {}),
          };
        });
        clips.sort((a, b) => a.startSec - b.startSec);
        return {
          ...prev,
          clips,
          durationSec: Math.max(...clips.map((c) => c.endSec), prev.durationSec),
        };
      }
      return {
        ...prev,
        [track]: updateTrackItem(prev[track] as any[], id, {
          startSec: Number(startSec.toFixed(2)),
          endSec: Number(endSec.toFixed(2)),
          ...(newTrackIndex !== undefined ? { trackIndex: newTrackIndex } : {}),
        }),
      };
    });
  }, []);

  const trimItem = useCallback((
    track: TimelineTrackType,
    id: string,
    startSec: number,
    endSec: number,
    newTrackIndex?: number
  ) => {
    moveItem(track, id, startSec, endSec, newTrackIndex);
  }, [moveItem]);

  const nudgeItem = useCallback((
    track: TimelineTrackType,
    id: string,
    deltaSec: number,
    edge: 'start' | 'end'
  ) => {
    setProject((prev) => ({
      ...prev,
      [track]: nudgeTrackItem(prev[track] as any[], id, deltaSec, edge, prev.durationSec),
    }));
  }, []);

  const updateCaptions = useCallback((updates: Partial<CaptionsConfig>) => {
    setProject((prev) => ({
      ...prev,
      captions: prev.captions
        ? { ...prev.captions, ...updates }
        : {
            enabled: true,
            style: 'karaoke_bounce',
            highlight_color: '#FFDD00',
            max_words_per_line: 3,
            position_y_offset: 15,
            ...updates,
          },
    }));
  }, []);

  const applyBatchActions = useCallback((actions: TimelineAction[]) => {
    setProject((prev) => {
      let updated = { ...prev };
      for (const act of actions) {
        if (act.action === 'add' && act.data) {
          updated[act.track] = addTrackItem(updated[act.track] as any[], act.data) as any;
        } else if (act.action === 'update' && act.id && act.data) {
          updated[act.track] = updateTrackItem(updated[act.track] as any[], act.id, act.data) as any;
        } else if (act.action === 'remove' && act.id) {
          updated[act.track] = removeTrackItem(updated[act.track] as any[], act.id) as any;
        } else if (act.action === 'nudge' && act.id && act.data) {
          updated[act.track] = nudgeTrackItem(
            updated[act.track] as any[],
            act.id,
            act.data.deltaSec || 0,
            act.data.edge || 'start',
            updated.durationSec
          ) as any;
        }
      }
      return updated;
    });
  }, []);

  const splitClip = useCallback(
    (timeSec?: number, targetTrackIndex?: number) => {
      const splitAt = timeSec !== undefined ? timeSec : playhead.currentSec;
      setProject((prev) => {
        const existingClips =
          prev.clips && prev.clips.length > 0
            ? [...prev.clips]
            : [
                {
                  id: 'clip_default',
                  name: prev.title || 'Source Video',
                  sourceUrl: prev.sourceUrl,
                  startSec: 0,
                  endSec: prev.durationSec,
                  clipDurationSec: prev.durationSec,
                  inPointSec: 0,
                  trackIndex: 0,
                },
              ];

        const result = splitClipAtTime(existingClips, splitAt, targetTrackIndex);
        if (!result.splitSuccess) return prev;

        return {
          ...prev,
          clips: result.clips,
        };
      });
    },
    [playhead.currentSec]
  );

  const cutRange = useCallback((startSec: number, endSec: number) => {
    setProject((prev) => {
      const existingClips =
        prev.clips && prev.clips.length > 0
          ? [...prev.clips]
          : [
              {
                id: 'clip_default',
                name: prev.title || 'Source Video',
                sourceUrl: prev.sourceUrl,
                startSec: 0,
                endSec: prev.durationSec,
                clipDurationSec: prev.durationSec,
                inPointSec: 0,
                trackIndex: 0,
              },
            ];

      const result = cutRangeFromClips(existingClips, startSec, endSec);
      return {
        ...prev,
        clips: result.clips,
        durationSec: Math.max(result.newDurationSec, 1),
      };
    });
  }, []);

  const resetToSample = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.seekTo(0);
    }
    setProject(INITIAL_SAMPLE_PROJECT);
    setPlayhead({ currentSec: 0, currentFrame: 0, isPlaying: false });
  }, []);

  // Backwards-compatible aliases mapping directly to generic track helpers
  const addCut = useCallback((cut: Omit<Cut, 'id'>) => addItem('cuts', cut), [addItem]);
  const removeCut = useCallback((id: string) => removeItem('cuts', id), [removeItem]);
  const updateCut = useCallback((id: string, patch: Partial<Cut>) => updateItem('cuts', id, patch), [updateItem]);
  const nudgeCut = useCallback((id: string, delta: number, edge: 'start' | 'end') => nudgeItem('cuts', id, delta, edge), [nudgeItem]);

  const addOverlay = useCallback((overlay: Omit<TextOverlay, 'id'>) => addItem('overlays', overlay), [addItem]);
  const removeOverlay = useCallback((id: string) => removeItem('overlays', id), [removeItem]);
  const updateOverlay = useCallback((id: string, patch: Partial<TextOverlay>) => updateItem('overlays', id, patch), [updateItem]);
  const nudgeOverlay = useCallback((id: string, delta: number, edge: 'start' | 'end') => nudgeItem('overlays', id, delta, edge), [nudgeItem]);

  const addZoom = useCallback((zoom: Omit<Zoom, 'id'>) => addItem('zooms', zoom), [addItem]);
  const removeZoom = useCallback((id: string) => removeItem('zooms', id), [removeItem]);
  const updateZoom = useCallback((id: string, patch: Partial<Zoom>) => updateItem('zooms', id, patch), [updateItem]);
  const nudgeZoom = useCallback((id: string, delta: number, edge: 'start' | 'end') => nudgeItem('zooms', id, delta, edge), [nudgeItem]);

  return {
    playerRef,
    play,
    pause,
    togglePlay,
    seekTo,
    project,
    setProject,
    playhead,
    updatePlayhead,
    // Media Assets & Multi-Clip Stitching
    mediaAssets,
    addMediaAsset,
    stitchClipToTimeline,
    selectedElement,
    setSelectedElement,
    // Stacked Track Management API
    addTrack,
    removeTrack,
    // Generic Dynamic Dispatch API
    addItem,
    updateItem,
    removeItem,
    moveItem,
    trimItem,
    nudgeItem,
    updateCaptions,
    applyBatchActions,
    resetToSample,
    // Real NLE Clip Splitting
    splitClip,
    cutRange,
    // Specific aliases
    addCut,
    removeCut,
    updateCut,
    nudgeCut,
    addOverlay,
    removeOverlay,
    updateOverlay,
    nudgeOverlay,
    addZoom,
    removeZoom,
    updateZoom,
    nudgeZoom,
  };
}

export type UseVideoEditorReturn = ReturnType<typeof useVideoEditor>;

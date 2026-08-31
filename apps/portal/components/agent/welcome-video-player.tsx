'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

import { AGENT_WELCOME_VIDEO_SRC } from '@/constants/agent-welcome-video';
import { cn } from '@/lib/utils';

export function WelcomeVideoPlayer({
  autoPlay = false,
  className,
  lockUntilEnded = false,
  onEnded,
}: {
  autoPlay?: boolean;
  className?: string;
  /** Hide skip/seek controls until the video finishes (first-login modal). */
  lockUntilEnded?: boolean;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [mutedFallback, setMutedFallback] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;

    const start = async () => {
      try {
        el.muted = false;
        el.defaultMuted = false;
        await el.play();
      } catch {
        if (cancelled) return;
        try {
          el.muted = true;
          el.defaultMuted = true;
          await el.play();
          if (!cancelled) setMutedFallback(true);
        } catch {
          if (!cancelled) setNeedsGesture(true);
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, [autoPlay]);

  const unlock = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.defaultMuted = false;
    setMutedFallback(false);
    setNeedsGesture(false);
    void el.play();
  }, []);

  const handleEnded = useCallback(() => {
    setFinished(true);
    setNeedsGesture(false);
    setMutedFallback(false);
    onEnded?.();
  }, [onEnded]);

  const showControls = !lockUntilEnded || finished;

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-black', className)}>
      <video
        ref={videoRef}
        src={AGENT_WELCOME_VIDEO_SRC}
        className="aspect-video w-full"
        playsInline
        controls={showControls}
        controlsList={lockUntilEnded ? 'nodownload noplaybackrate noremoteplayback' : undefined}
        disablePictureInPicture
        preload="auto"
        autoPlay={autoPlay}
        onPlay={() => setNeedsGesture(false)}
        onEnded={handleEnded}
        onError={lockUntilEnded ? handleEnded : undefined}
        onContextMenu={lockUntilEnded ? (event) => event.preventDefault() : undefined}
      />
      {(needsGesture || mutedFallback) && !finished && (
        <button
          type="button"
          onClick={unlock}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-black shadow-lg">
            <Volume2 className="size-7" />
          </span>
          <span className="text-sm font-semibold">
            {mutedFallback ? 'Tap for sound' : 'Tap to play'}
          </span>
        </button>
      )}
    </div>
  );
}

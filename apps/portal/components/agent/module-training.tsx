'use client';

import { CircleHelp, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  autoplayTrainingId,
  LEASING_VIEW_EVENT,
  TRAINING_VIDEO,
  trainingAudience,
  trainingVideoById,
  type TrainingVideo,
} from '@/constants/module-training';
import { isPortalWelcomeDeferredRoute, isPublicRoute, ROUTES } from '@/constants/routes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';
import { hasSeenTraining, markTrainingSeen } from '@/lib/module-training-seen';
import { cn } from '@/lib/utils';

type ModuleTrainingContextValue = {
  replay: (videoId: string) => void;
};

const ModuleTrainingContext = createContext<ModuleTrainingContextValue>({
  replay: () => undefined,
});

export function useModuleTraining(): ModuleTrainingContextValue {
  return useContext(ModuleTrainingContext);
}

export function TrainingReplayButton({
  video,
  className,
}: {
  video: TrainingVideo;
  className?: string;
}) {
  const { replay } = useModuleTraining();
  return (
    <button
      type="button"
      title={`Replay ${video.title}`}
      aria-label={`Replay ${video.title}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        replay(video.id);
      }}
      className={cn(
        'text-muted-foreground hover:bg-secondary hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-full',
        className,
      )}
    >
      <CircleHelp className="size-3.5" strokeWidth={1.75} />
    </button>
  );
}

/** One ? that opens the videos for a module made of several screens, such as Leasing. */
export function TrainingReplayMenu({
  videos,
  className,
}: {
  videos: TrainingVideo[];
  className?: string;
}) {
  const { replay } = useModuleTraining();
  const [open, setOpen] = useState(false);
  if (videos.length === 0) return null;
  if (videos.length === 1) return <TrainingReplayButton video={videos[0]!} className={className} />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Replay a leasing video"
          aria-label="Replay a leasing video"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'text-muted-foreground hover:bg-secondary hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-full',
            className,
          )}
        >
          <CircleHelp className="size-3.5" strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-48 p-1">
        <div role="menu" className="flex flex-col">
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              role="menuitem"
              className="hover:bg-muted rounded-md px-3 py-2 text-left text-sm"
              onClick={() => {
                setOpen(false);
                replay(video.id);
              }}
            >
              {video.menuLabel ?? video.title}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ModuleTrainingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [video, setVideo] = useState<TrainingVideo | null>(null);

  const replay = useCallback((videoId: string) => {
    const next = trainingVideoById(videoId);
    if (next) setVideo(next);
  }, []);

  const close = useCallback(() => {
    if (user?.id && video) markTrainingSeen(user.id, video.id);
    setVideo(null);
  }, [user?.id, video]);

  const value = useMemo(() => ({ replay }), [replay]);

  return (
    <ModuleTrainingContext.Provider value={value}>
      {children}
      {video ? <ModuleTrainingDialog video={video} onClose={close} /> : null}
    </ModuleTrainingContext.Provider>
  );
}

/**
 * Plays a module video the first time this user opens that module.
 * The introduction stays on the first-login welcome, then Full Service follows it.
 */
export function ModuleTrainingHost() {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();
  const { agencies, portalAccessReady } = useAgentData();
  const { replay } = useModuleTraining();
  const [welcomeClear, setWelcomeClear] = useState(false);
  const [leasingView, setLeasingView] = useState('lettings');
  const [leasingViewReady, setLeasingViewReady] = useState(false);
  const autoplayed = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  if (pathnameRef.current !== pathname) {
    pathnameRef.current = pathname;
    setLeasingViewReady(false);
  }

  useEffect(() => {
    const read = () => {
      const view = new URLSearchParams(window.location.search).get('view');
      setLeasingView(view === 'vacating' || view === 'tenancy_reviews' ? view : 'lettings');
      setLeasingViewReady(true);
    };
    read();
    const onView = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === 'vacating' || detail === 'tenancy_reviews' || detail === 'lettings') {
        setLeasingView(detail);
        setLeasingViewReady(true);
      }
    };
    window.addEventListener('popstate', read);
    window.addEventListener(LEASING_VIEW_EVENT, onView);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener(LEASING_VIEW_EVENT, onView);
    };
  }, [pathname]);

  useEffect(() => {
    if (!user?.id) {
      setWelcomeClear(false);
      return;
    }
    let cancelled = false;
    void fetchPortalWelcomeStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.dismissed || !status.eligible) setWelcomeClear(true);
      })
      .catch(() => {
        if (!cancelled) setWelcomeClear(true);
      });
    const onDismissed = () => setWelcomeClear(true);
    window.addEventListener(PORTAL_WELCOME_DISMISSED_EVENT, onDismissed);
    return () => {
      cancelled = true;
      window.removeEventListener(PORTAL_WELCOME_DISMISSED_EVENT, onDismissed);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !portalAccessReady || !welcomeClear) return;
    if (!pathname || isPublicRoute(pathname) || isPortalWelcomeDeferredRoute(pathname)) return;
    if (pathname === ROUTES.LEASING && !leasingViewReady) return;
    const videoId = autoplayTrainingId(
      pathname,
      leasingView === 'lettings' ? null : leasingView,
      trainingAudience(agencies),
    );
    if (!videoId || videoId === TRAINING_VIDEO.INTRODUCTION) return;
    if (hasSeenTraining(user.id, videoId)) return;
    const key = `${user.id}:${videoId}:${pathname}:${leasingView ?? ''}`;
    if (autoplayed.current === key) return;
    autoplayed.current = key;
    markTrainingSeen(user.id, videoId);
    replay(videoId);
  }, [user?.id, portalAccessReady, welcomeClear, pathname, leasingView, leasingViewReady, agencies, replay]);

  return null;
}

function ModuleTrainingDialog({ video, onClose }: { video: TrainingVideo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={video.menuLabel ?? video.title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <h2 className="text-base font-semibold">{video.menuLabel ?? video.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close video"
          >
            <X className="size-4" />
          </button>
        </div>
        <video
          key={video.src}
          src={video.src}
          controls
          autoPlay
          playsInline
          className="aspect-video w-full rounded-xl bg-black"
          onEnded={onClose}
        />
      </div>
    </div>
  );
}

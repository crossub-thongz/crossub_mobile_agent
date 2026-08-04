'use client';

import { useEffect, useRef, useState } from 'react';

import {
  VOICE_LEVEL_FULL_SCALE_RMS,
  VOICE_SILENCE_SAMPLE_MS,
  VOICE_SPEECH_RMS_THRESHOLD,
} from '@/constants/voice-input';
import { fetchGiiVoiceStatus } from '@/lib/crossub-api/gii-client';
import { browserSpeechSupported, startBrowserSpeech } from '@/lib/gii-browser-speech';
import { resolveSpeechLanguage } from '@/lib/gii-voice-input';
import { cn } from '@/lib/utils';

/**
 * Mic self-check — answers "why is voice not working" without a screenshot round trip.
 *
 * Gii's mic can fail at five separate places, and every one of them surfaces to the agent as
 * the same sentence. This runs each stage in order and shows which one stopped: browser
 * support, mic permission, whether any sound is actually reaching the browser, whether this
 * environment has server transcription, and whether the browser's own recogniser can reach
 * its speech service. Public route — it reads no account data.
 */

type StageState = 'idle' | 'running' | 'pass' | 'warn' | 'fail';

type Stage = {
  key: string;
  label: string;
  state: StageState;
  detail: string;
};

const INITIAL_STAGES: Stage[] = [
  { key: 'support', label: 'Browser support', state: 'idle', detail: '' },
  { key: 'permission', label: 'Microphone permission', state: 'idle', detail: '' },
  { key: 'signal', label: 'Sound reaching the browser', state: 'idle', detail: '' },
  { key: 'server', label: 'Server transcription', state: 'idle', detail: '' },
  { key: 'recogniser', label: 'Browser recogniser', state: 'idle', detail: '' },
];

const STATE_STYLES: Record<StageState, string> = {
  idle: 'bg-muted text-muted-foreground',
  running: 'bg-amber-100 text-amber-700',
  pass: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  fail: 'bg-rose-100 text-rose-700',
};

const STATE_LABEL: Record<StageState, string> = {
  idle: '—',
  running: 'checking',
  pass: 'ok',
  warn: 'note',
  fail: 'failed',
};

export default function VoiceCheckPage() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [heard, setHeard] = useState('');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const set = (key: string, state: StageState, detail: string) =>
    setStages((prev) => prev.map((s) => (s.key === key ? { ...s, state, detail } : s)));

  const run = async () => {
    cleanupRef.current?.();
    setStages(INITIAL_STAGES);
    setLevel(0);
    setPeak(0);
    setHeard('');
    setRunning(true);

    // 1) Browser support ----------------------------------------------------
    const canRecord =
      typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    const canRecognise = browserSpeechSupported();
    if (!canRecord && !canRecognise) {
      set('support', 'fail', 'This browser has neither MediaRecorder nor SpeechRecognition.');
      setRunning(false);
      return;
    }
    set(
      'support',
      'pass',
      `MediaRecorder ${canRecord ? 'yes' : 'no'} · SpeechRecognition ${canRecognise ? 'yes' : 'no'} · ${resolveSpeechLanguage()}`,
    );

    // 2) Microphone permission ---------------------------------------------
    set('permission', 'running', 'Waiting for the browser prompt…');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      set(
        'permission',
        'fail',
        `Blocked: ${err instanceof Error ? err.name : 'unknown'}. Allow the mic for this site, then run again.`,
      );
      setRunning(false);
      return;
    }
    const track = stream.getAudioTracks()[0];
    set(
      'permission',
      'pass',
      `Granted · input: ${track?.label || 'unnamed device'}${track?.muted ? ' · REPORTED MUTED' : ''}`,
    );

    // 3) Is anything actually arriving? -------------------------------------
    set('signal', 'running', 'Say something — a few words is enough.');
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    let ctx: AudioContext | null = null;
    let meterTimer: ReturnType<typeof setInterval> | null = null;
    let peakRms = 0;

    if (!AudioCtor) {
      set('signal', 'warn', 'No Web Audio in this browser — level cannot be measured.');
    } else {
      ctx = new AudioCtor();
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const context = ctx;

      meterTimer = setInterval(() => {
        if (context.state !== 'running') return;
        analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i++) {
          const deviation = samples[i]! - 128;
          sumSquares += deviation * deviation;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        if (rms > peakRms) {
          peakRms = rms;
          setPeak(rms);
        }
        setLevel(Math.min(1, rms / VOICE_LEVEL_FULL_SCALE_RMS));
      }, VOICE_SILENCE_SAMPLE_MS);
    }

    // 4) Does this environment transcribe on the server? --------------------
    set('server', 'running', 'Asking the API…');
    try {
      const status = await fetchGiiVoiceStatus();
      if (status.available === true) {
        set('server', 'pass', `Available via ${status.provider ?? 'configured provider'}.`);
      } else if (status.available === false) {
        set(
          'server',
          'fail',
          'This API has no speech provider configured. Set DEEPGRAM_API_KEY on the API service — where the browser recogniser is blocked, that key is the only thing that makes voice work.',
        );
      } else {
        set(
          'server',
          'warn',
          'This API predates the status endpoint, so it cannot say — but POST /transcribe may still work, and the app will try it. Set DEEPGRAM_API_KEY on the API service if voice is failing.',
        );
      }
    } catch {
      set('server', 'warn', 'Could not ask the API (not signed in, or endpoint not deployed).');
    }

    // Verdict on the signal stage, and RELEASE the mic before testing the recogniser.
    //
    // The recogniser has to own the mic alone. Testing it while this page still holds a
    // `getUserMedia` stream is a documented way to provoke the very `network` error we are
    // trying to attribute — a check that creates its own failure proves nothing.
    if (AudioCtor) {
      if (peakRms >= VOICE_SPEECH_RMS_THRESHOLD) {
        set('signal', 'pass', `Peak level ${peakRms.toFixed(1)} — the mic is capturing.`);
      } else {
        set(
          'signal',
          'warn',
          `Peak level ${peakRms.toFixed(1)} so far (needs ${VOICE_SPEECH_RMS_THRESHOLD}). If you have not spoken yet, that is expected — speak during the next stage.`,
        );
      }
    }
    meterTimer && clearInterval(meterTimer);
    void ctx?.close().catch(() => {});
    stream.getTracks().forEach((t) => t.stop());
    setLevel(0);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 5) Can the browser recogniser hear and reach its service? -------------
    if (!canRecognise) {
      set('recogniser', 'warn', 'Not available in this browser.');
    } else {
      set(
        'recogniser',
        'running',
        'Listening for 10 seconds, with the mic to itself — say a few words now.',
      );
      const speech = startBrowserSpeech({
        lang: resolveSpeechLanguage(),
        onInterim: (text) => setHeard(text),
      });
      if (!speech) {
        set('recogniser', 'fail', 'Could not start.');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        const text = await speech.stop();
        const err = speech.lastError();
        if (text) set('recogniser', 'pass', `Heard: "${text}"`);
        else if (err === 'network')
          set(
            'recogniser',
            'fail',
            'Reported `network` with the mic to itself, so nothing local provoked it: this browser genuinely cannot reach its speech service. On Chrome that service is Google\'s. Voice cannot work through the browser here — the server needs DEEPGRAM_API_KEY.',
          );
        else
          set(
            'recogniser',
            err ? 'fail' : 'warn',
            err ? `Reported \`${err}\` and returned no text.` : 'Returned no text.',
          );
      }
    }

    setRunning(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Gii mic check</h1>
        <p className="text-sm text-muted-foreground">
          Runs each stage of voice input in order and shows which one stops. Takes about 15
          seconds — allow the mic, then talk while it listens.
        </p>
      </header>

      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition active:scale-95 disabled:opacity-50"
      >
        {running ? 'Running…' : 'Start the check'}
      </button>

      <section className="space-y-2 rounded-xl border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Live mic level</span>
          <span className="tabular-nums text-muted-foreground">
            peak {peak.toFixed(1)}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {heard ? `Recognised: ${heard}` : 'Speak while the check runs — this bar should move.'}
        </p>
      </section>

      <ol className="space-y-3">
        {stages.map((stage) => (
          <li key={stage.key} className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{stage.label}</span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  STATE_STYLES[stage.state],
                )}
              >
                {STATE_LABEL[stage.state]}
              </span>
            </div>
            {stage.detail ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {stage.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}

import { useRef, useCallback, useState, useEffect } from 'react';

const PREF_KEY   = 'laziz_alarm_enabled';
const PREF_TTL   = 24 * 60 * 60 * 1000; // 24 hours in ms

/** Read the stored preference — returns true if set within last 24 h */
const isPreferenceValid = () => {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < PREF_TTL;
  } catch {
    return false;
  }
};

const savePreference = () => {
  localStorage.setItem(PREF_KEY, JSON.stringify({ ts: Date.now() }));
};

const clearPreference = () => {
  localStorage.removeItem(PREF_KEY);
};

/**
 * useOrderAlarm
 *
 * • First visit: admin clicks "Enable Sound" → AudioContext created, preference
 *   saved to localStorage for 24 hours.
 *
 * • Subsequent visits (within 24 h): hook detects saved preference on mount,
 *   shows "Sound On" immediately, and silently resumes AudioContext on the
 *   first user interaction (click / keydown) — no button needed.
 *
 * • After 24 h the preference expires and admin needs to click once again.
 */
export function useOrderAlarm() {
  const ctxRef     = useRef(null);
  const loopRef    = useRef(null);
  const activeRef  = useRef(false);
  const autoRef    = useRef(false); // whether we added the auto-resume listener

  // Initialise from localStorage so the UI shows "Sound On" immediately
  const [enabled, setEnabled] = useState(() => isPreferenceValid());

  /* ── Build oscillator chain ─────────────────────────────────────── */
  const _playBurst = (ctx, dest, startTime, freq, duration) => {
    try {
      [[  'square', 0.9, freq     ],
       [  'sine',   0.6, freq * 2 ],
       ['sawtooth', 0.5, freq + 8 ]].forEach(([type, vol, f]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.setValueAtTime(vol, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.connect(gain); gain.connect(dest);
        osc.start(startTime); osc.stop(startTime + duration + 0.05);
      });
    } catch (_) {}
  };

  const _getMasterDest = (ctx) => {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-6,  ctx.currentTime);
    comp.knee.setValueAtTime(0,        ctx.currentTime);
    comp.ratio.setValueAtTime(20,      ctx.currentTime);
    comp.attack.setValueAtTime(0.001,  ctx.currentTime);
    comp.release.setValueAtTime(0.1,   ctx.currentTime);
    const master = ctx.createGain();
    master.gain.setValueAtTime(2.5, ctx.currentTime);
    comp.connect(master); master.connect(ctx.destination);
    return comp;
  };

  const _playPattern = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return;
    const dest = _getMasterDest(ctx);
    const now  = ctx.currentTime;
    _playBurst(ctx, dest, now + 0.00, 960, 0.18);
    _playBurst(ctx, dest, now + 0.22, 960, 0.18);
    _playBurst(ctx, dest, now + 0.44, 960, 0.18);
    _playBurst(ctx, dest, now + 0.80, 720, 0.30);
  }, []);

  /* ── Create / resume the AudioContext ───────────────────────────── */
  const _initCtx = useCallback((playTestBeep = false) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx();
    }
    ctxRef.current.resume().then(() => {
      setEnabled(true);
      savePreference();
      if (playTestBeep) _playPattern();
    }).catch(() => {});
  }, [_playPattern]);

  /* ── Auto-resume on first user interaction if pref is saved ─────── */
  useEffect(() => {
    if (!isPreferenceValid() || autoRef.current) return;
    autoRef.current = true;

    const resume = () => {
      _initCtx(false); // silent — just unlock audio
      document.removeEventListener('click',   resume);
      document.removeEventListener('keydown', resume);
      document.removeEventListener('touchstart', resume);
    };

    document.addEventListener('click',      resume, { once: true });
    document.addEventListener('keydown',    resume, { once: true });
    document.addEventListener('touchstart', resume, { once: true, passive: true });

    return () => {
      document.removeEventListener('click',   resume);
      document.removeEventListener('keydown', resume);
      document.removeEventListener('touchstart', resume);
    };
  }, [_initCtx]);

  /* ── Public: enable from button click (first time) ─────────────── */
  const enableSound = useCallback(() => {
    _initCtx(true); // with test beep
  }, [_initCtx]);

  /* ── Public: disable & clear 24-h preference ────────────────────── */
  const disableSound = useCallback(() => {
    stopAlarm();
    clearPreference();
    setEnabled(false);
    if (ctxRef.current) {
      ctxRef.current.suspend().catch(() => {});
    }
  }, []);

  /* ── Public: start looping alarm ────────────────────────────────── */
  const playAlarm = useCallback(() => {
    if (activeRef.current || !ctxRef.current) return;
    activeRef.current = true;
    ctxRef.current.resume().then(() => {
      _playPattern();
      loopRef.current = setInterval(() => {
        if (activeRef.current && ctxRef.current?.state === 'running') {
          _playPattern();
        }
      }, 2200);
    }).catch(() => {});
  }, [_playPattern]);

  /* ── Public: stop alarm ─────────────────────────────────────────── */
  const stopAlarm = useCallback(() => {
    activeRef.current = false;
    clearInterval(loopRef.current);
    loopRef.current = null;
  }, []);

  /* ── Public: test beep ──────────────────────────────────────────── */
  const testBeep = useCallback(() => {
    if (!ctxRef.current) return;
    ctxRef.current.resume().then(_playPattern).catch(() => {});
  }, [_playPattern]);

  return { enabled, enableSound, disableSound, playAlarm, stopAlarm, testBeep };
}

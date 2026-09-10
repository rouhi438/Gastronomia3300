type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
const ALARM_PLAYBACK_COOLDOWN_MS = 1500;

let lastPlaybackAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext && audioContext.state !== "closed") {
    return audioContext;
  }

  const AudioContextConstructor =
    window.AudioContext || (window as BrowserWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor();

  return audioContext;
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.24, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

export async function prepareAdminOrderAlarm(): Promise<boolean> {
  try {
    const context = getAudioContext();

    if (!context) {
      return false;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    return context.state === "running";
  } catch (error: unknown) {
    console.error("Admin order alarm preparation failed:", error);

    return false;
  }
}

export async function playAdminOrderAlarm(): Promise<boolean> {
  const ready = await prepareAdminOrderAlarm();

  if (!ready || !audioContext) {
    return false;
  }

  try {
    const now = Date.now();

    if (now - lastPlaybackAt < ALARM_PLAYBACK_COOLDOWN_MS) {
      return true;
    }

    lastPlaybackAt = now;

    const start = audioContext.currentTime + 0.03;

    scheduleTone(audioContext, 740, start, 0.2);
    scheduleTone(audioContext, 988, start + 0.22, 0.28);
    scheduleTone(audioContext, 740, start + 0.62, 0.2);
    scheduleTone(audioContext, 988, start + 0.84, 0.3);

    return true;
  } catch (error: unknown) {
    lastPlaybackAt = 0;
    console.error("Admin order alarm playback failed:", error);

    return false;
  }
}

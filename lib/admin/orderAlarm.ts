type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export type AdminOrderAlarmSound =
  | "classic"
  | "kitchen"
  | "digital"
  | "phone"
  | "urgent";

export const ADMIN_ORDER_ALARM_SOUNDS: ReadonlyArray<{
  id: AdminOrderAlarmSound;
  label: string;
  description: string;
}> = [
  {
    id: "classic",
    label: "Klassisk",
    description: "Den nuværende alarmlyd.",
  },
  {
    id: "kitchen",
    label: "Køkkenklokke",
    description: "En tydelig dobbelt køkkenklokke.",
  },
  {
    id: "digital",
    label: "Digital",
    description: "Tre korte og moderne toner.",
  },
  {
    id: "phone",
    label: "Telefon",
    description: "Et genkendeligt ring-ring signal.",
  },
  {
    id: "urgent",
    label: "Haster",
    description: "En hurtigere og kraftigere alarm.",
  },
];

export const DEFAULT_ADMIN_ORDER_ALARM_SOUND: AdminOrderAlarmSound = "classic";

const ALARM_PLAYBACK_COOLDOWN_MS = 1500;
const ALARM_SOUND_STORAGE_KEY = "admin-order-alarm-sound";
const ALARM_SOUND_CHANGE_EVENT = "admin-order-alarm-sound-change";

let audioContext: AudioContext | null = null;
let lastPlaybackAt = 0;

function isAdminOrderAlarmSound(
  value: string | null,
): value is AdminOrderAlarmSound {
  return (
    value === "classic" ||
    value === "kitchen" ||
    value === "digital" ||
    value === "phone" ||
    value === "urgent"
  );
}

export function getAdminOrderAlarmSound(): AdminOrderAlarmSound {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_ORDER_ALARM_SOUND;
  }

  try {
    const storedSound = window.localStorage.getItem(ALARM_SOUND_STORAGE_KEY);

    return isAdminOrderAlarmSound(storedSound)
      ? storedSound
      : DEFAULT_ADMIN_ORDER_ALARM_SOUND;
  } catch {
    return DEFAULT_ADMIN_ORDER_ALARM_SOUND;
  }
}

export function setAdminOrderAlarmSound(sound: AdminOrderAlarmSound) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ALARM_SOUND_STORAGE_KEY, sound);
    window.dispatchEvent(new Event(ALARM_SOUND_CHANGE_EVENT));
  } catch (error: unknown) {
    console.error("Admin order alarm preference could not be saved:", error);
  }
}

export function subscribeToAdminOrderAlarmSound(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(ALARM_SOUND_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(ALARM_SOUND_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

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
  volume = 0.24,
  type: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function scheduleAlarmPattern(
  context: AudioContext,
  sound: AdminOrderAlarmSound,
) {
  const start = context.currentTime + 0.03;

  if (sound === "kitchen") {
    scheduleTone(context, 1318, start, 0.3, 0.2, "sine");
    scheduleTone(context, 2637, start, 0.2, 0.07, "sine");
    scheduleTone(context, 1046, start + 0.42, 0.38, 0.22, "sine");
    scheduleTone(context, 2093, start + 0.42, 0.26, 0.07, "sine");
    return;
  }

  if (sound === "digital") {
    scheduleTone(context, 659, start, 0.18, 0.18, "triangle");
    scheduleTone(context, 784, start + 0.22, 0.18, 0.19, "triangle");
    scheduleTone(context, 1046, start + 0.44, 0.35, 0.21, "triangle");
    return;
  }

  if (sound === "phone") {
    scheduleTone(context, 440, start, 0.32, 0.16, "sine");
    scheduleTone(context, 480, start, 0.32, 0.16, "sine");
    scheduleTone(context, 440, start + 0.52, 0.32, 0.16, "sine");
    scheduleTone(context, 480, start + 0.52, 0.32, 0.16, "sine");
    return;
  }

  if (sound === "urgent") {
    scheduleTone(context, 1046, start, 0.14, 0.2, "square");
    scheduleTone(context, 784, start + 0.18, 0.14, 0.2, "square");
    scheduleTone(context, 1046, start + 0.36, 0.14, 0.2, "square");
    scheduleTone(context, 784, start + 0.54, 0.14, 0.2, "square");
    scheduleTone(context, 1046, start + 0.72, 0.22, 0.2, "square");
    return;
  }

  scheduleTone(context, 740, start, 0.2);
  scheduleTone(context, 988, start + 0.22, 0.28);
  scheduleTone(context, 740, start + 0.62, 0.2);
  scheduleTone(context, 988, start + 0.84, 0.3);
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

async function playAlarmSound(
  sound: AdminOrderAlarmSound,
  bypassCooldown: boolean,
): Promise<boolean> {
  const ready = await prepareAdminOrderAlarm();

  if (!ready || !audioContext) {
    return false;
  }

  try {
    const now = Date.now();

    if (!bypassCooldown && now - lastPlaybackAt < ALARM_PLAYBACK_COOLDOWN_MS) {
      return true;
    }

    lastPlaybackAt = now;

    scheduleAlarmPattern(audioContext, sound);

    return true;
  } catch (error: unknown) {
    lastPlaybackAt = 0;
    console.error("Admin order alarm playback failed:", error);

    return false;
  }
}

export function playAdminOrderAlarm(): Promise<boolean> {
  return playAlarmSound(getAdminOrderAlarmSound(), false);
}

export function previewAdminOrderAlarm(
  sound: AdminOrderAlarmSound,
): Promise<boolean> {
  return playAlarmSound(sound, true);
}

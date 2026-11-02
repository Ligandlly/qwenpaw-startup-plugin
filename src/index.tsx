import { StartupWelcome } from "./StartupWelcome";
import { CHAT_PATH, NEW_CHAT_EVENT, PLUGIN_ID } from "./constants";
import { clearLaunched, isLaunched } from "./launch";
import { react } from "./react";
import { injectStyles, removeStyles } from "./styles";

interface Registration {
  dispose: () => void;
}

/** How often the suppressed entry re-checks whether it is back on the chat page. */
const WATCH_INTERVAL_MS = 500;

let registration: Registration | null = null;
let stopWatching: (() => void) | null = null;

function release(): void {
  try {
    registration?.dispose();
  } catch {
    /* the host may already have torn the slot down */
  }
  registration = null;
}

/** Nothing to choose from — drop our registration so the host welcome returns. */
function handBackToHost(): void {
  release();
  removeStyles();
}

function renderWelcome(props: unknown) {
  const React = react();
  return React.createElement(StartupWelcome, {
    hostProps: props as Record<string, unknown>,
    onSkip: handBackToHost,
  });
}

/** Register the picker in the chat welcome slot. Idempotent. */
function register(): void {
  const welcome = window.QwenPaw?.chat?.welcome;
  if (registration || typeof welcome?.render !== "function") return;

  try {
    injectStyles();
    registration = welcome.render(PLUGIN_ID, renderWelcome);
  } catch (error) {
    console.error("[qwenpaw-startup-page] failed to register", error);
    handBackToHost();
  }
}

function stopWatchingNow(): void {
  stopWatching?.();
}

/**
 * A new conversation is starting, so whatever the last launch suppressed no
 * longer applies: put the picker back for it.
 */
function onNewChat(): void {
  stopWatchingNow();
  clearLaunched(window.sessionStorage);
  register();
}

/**
 * The page load we are in was opened by the picker, so that conversation keeps
 * the host's native welcome area. Wait for the next new conversation:
 *
 * - `qwenpaw:sidebar-new-chat` — "new chat" clicked while on the chat page;
 * - the path watch — "new chat" clicked from any other page, where the sidebar
 *   only flips a sessionStorage flag and navigates (no event to listen to).
 */
function watchForNewChat(): void {
  if (stopWatching) return;

  let awayFromChat = !location.pathname.startsWith(CHAT_PATH);
  window.addEventListener(NEW_CHAT_EVENT, onNewChat);

  const timer = window.setInterval(() => {
    const onChat = location.pathname.startsWith(CHAT_PATH);
    if (onChat && awayFromChat) onNewChat();
    awayFromChat = !onChat;
  }, WATCH_INTERVAL_MS);

  stopWatching = () => {
    window.removeEventListener(NEW_CHAT_EVENT, onNewChat);
    window.clearInterval(timer);
    stopWatching = null;
  };
}

/** Drop every listener and registration this module holds (host unload / tests). */
export function dispose(): void {
  stopWatchingNow();
  release();
}

export function mount(): Registration {
  dispose();

  if (typeof window.QwenPaw?.chat?.welcome?.render !== "function") {
    return { dispose };
  }

  // This page load came from the picker: the conversation it opened keeps the
  // host's own welcome area. The next new conversation brings the picker back.
  if (isLaunched(window.sessionStorage)) {
    watchForNewChat();
    return { dispose };
  }

  register();
  return { dispose };
}

mount();

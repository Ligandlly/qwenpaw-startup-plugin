import { StartupWelcome } from "./StartupWelcome";
import { PLUGIN_ID } from "./constants";
import { isLaunched } from "./launch";
import { react } from "./react";
import { injectStyles, removeStyles } from "./styles";

interface Registration {
  dispose: () => void;
}

let registration: Registration | null = null;

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

export function mount(): Registration {
  release();

  const welcome = window.QwenPaw?.chat?.welcome;
  if (typeof welcome?.render !== "function") return { dispose: release };

  // This tab already launched once: stay out of the way and let the console
  // render its own welcome area.
  if (isLaunched(window.sessionStorage)) return { dispose: release };

  try {
    injectStyles();
    const React = react();
    registration = welcome.render(PLUGIN_ID, (props: unknown) =>
      React.createElement(StartupWelcome, {
        hostProps: props as Record<string, unknown>,
        onSkip: handBackToHost,
      }),
    );
  } catch (error) {
    console.error("[qwenpaw-startup-page] failed to register", error);
    handBackToHost();
  }

  return { dispose: release };
}

mount();

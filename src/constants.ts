/**
 * Host contract constants.
 *
 * Everything here mirrors an internal Console convention on purpose — the
 * plugin runs without touching host source, so these keys ARE the API.
 * See docs/architecture.md ("契约与脆弱点") for the fallback for each one.
 */

export const PLUGIN_ID = "qwenpaw-startup-page";

/** Zustand-persisted agent state: sessionStorage (per tab) + localStorage (shared). */
export const AGENT_STORAGE_KEY = "qwenpaw-agent-storage";

/** "Last used agent" — what a brand new tab inherits. */
export const LAST_USED_AGENT_KEY = "qwenpaw-last-used-agent";

/** Consumed by ChatSessionInitializer to land on a blank conversation. */
export const PENDING_NEW_CHAT_KEY = "qwenpaw_pending_new_chat";

/** Set once this tab has launched, so the startup page never blocks twice. */
export const LAUNCHED_FLAG_KEY = "qwenpaw-startup-page:launched";

/** Where launching lands. */
export const CHAT_PATH = "/chat";

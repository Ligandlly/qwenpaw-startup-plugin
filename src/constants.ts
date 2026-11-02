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

/**
 * Set by the launch itself: the conversation this page load lands on already had
 * its pick, so the startup page stays away for that one conversation.
 */
export const LAUNCHED_FLAG_KEY = "qwenpaw-startup-page:launched";

/** Where launching lands. */
export const CHAT_PATH = "/chat";

/**
 * Dispatched on `window` by the console sidebar when "new chat" is clicked from
 * inside the chat page. Consumed by ChatSessionInitializer; no public API.
 */
export const NEW_CHAT_EVENT = "qwenpaw:sidebar-new-chat";

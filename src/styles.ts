/**
 * Styles live in a JS string and are injected as one <style> element.
 * Everything is expressed with the console's own design tokens (`--app-*`
 * from console/src/styles/tokens.css) and mirrors ChatWelcome.module.less:
 * 560px column, 24px padding, 64px avatar, 14px card radius, accent washes.
 */

export const STYLE_ID = "qpst-styles";

const CSS = `
.qpst{width:100%;min-width:0;max-width:560px;margin:auto;padding:24px;text-align:center;color:var(--app-text);font-family:inherit}
.qpst-head{display:flex;flex-direction:column;align-items:center}
.qpst-brand{background:var(--app-accent-soft)!important;color:var(--app-accent)!important;font-weight:600}
.qpst-brand-node{display:block;width:64px;height:64px;border-radius:50%;overflow:hidden}
.qpst-brand-node>*{width:100%;height:100%;object-fit:cover;display:block}
.qpst-title{margin:20px 0 8px;font-size:clamp(20px,2vw,26px);font-weight:600;line-height:1.3;letter-spacing:-.025em;text-wrap:balance}
.qpst-desc{margin:0;font-size:var(--app-font-secondary,13px);color:var(--app-text-secondary);line-height:1.6;text-wrap:pretty}

.qpst-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:24px;max-height:264px;overflow-y:auto;overscroll-behavior:contain;padding:2px;scrollbar-width:thin}
.qpst-card{position:relative;display:flex;align-items:flex-start;gap:12px;min-height:64px;padding:12px 16px;text-align:left;font:inherit;font-size:var(--app-font-secondary,13px);color:var(--app-text);cursor:pointer;background:var(--app-surface-subtle);border:1px solid var(--app-border-subtle);border-radius:14px;transition:background-color var(--app-motion-fast,120ms) var(--app-easing-standard,ease),border-color var(--app-motion-fast,120ms) var(--app-easing-standard,ease)}
.qpst-card:hover{background:var(--app-accent-faint);border-color:var(--app-accent-border)}
.qpst-card.is-selected{background:var(--app-accent-faint);border-color:var(--app-selected-border,var(--app-accent-border))}
.qpst-card[aria-disabled="true"]{opacity:.55;cursor:not-allowed;background:var(--app-surface-subtle);border-color:var(--app-border-subtle)}
.qpst-body{min-width:0;display:block;flex:1}
.qpst-name{display:flex;align-items:center;gap:6px;font-size:var(--app-font-secondary,13px);font-weight:500;line-height:1.4}
.qpst-tag{flex:0 0 auto;font-size:var(--app-font-caption,12px);font-weight:400;padding:0 6px;border-radius:999px;color:var(--app-text-tertiary);background:color-mix(in srgb,var(--app-text) 8%,transparent)}
.qpst-carddesc{margin:4px 0 0;font-size:var(--app-font-caption,12px);line-height:1.5;color:var(--app-text-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.qpst-check{position:absolute;top:10px;right:10px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;line-height:1;color:#fff;border:1px solid var(--app-accent);background:var(--app-accent)}

.qpst-skeleton .qpst-card{pointer-events:none;cursor:default}
.qpst-sk{display:block;border-radius:6px;background:color-mix(in srgb,var(--app-text) 10%,transparent);animation:qpst-pulse 1.4s ease-in-out infinite}
.qpst-sk-ava{flex:0 0 32px;width:32px;height:32px;border-radius:10px}
.qpst-sk-title{width:74px;height:12px}
.qpst-sk-line{width:100%;height:10px;margin-top:8px}
.qpst-sk-line-short{width:62%;height:10px;margin-top:6px}
@keyframes qpst-pulse{0%,100%{opacity:.5}50%{opacity:1}}

.qpst-foot{margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:8px}
.qpst-hint{font-size:var(--app-font-caption,12px);color:var(--app-text-tertiary);text-align:center}

/* Fallbacks only — the console renders antd Button/Avatar, these keep the
   plugin coherent in a host that does not attach antd. */
.qpst-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:var(--app-control-md,36px);padding:0 16px;font:inherit;font-size:var(--app-font-body,14px);font-weight:500;cursor:pointer;border:1px solid var(--app-border);border-radius:var(--app-radius,10px);background:var(--app-surface);color:var(--app-text);transition:background-color var(--app-motion-fast,120ms) var(--app-easing-standard,ease),border-color var(--app-motion-fast,120ms) var(--app-easing-standard,ease)}
.qpst-btn:hover:not(:disabled){border-color:var(--app-accent-border);color:var(--app-accent-text)}
.qpst-btn:disabled{cursor:not-allowed;opacity:.55}
.qpst-btn-primary{background:var(--app-accent);border-color:var(--app-accent);color:#fff;box-shadow:0 2px 5px var(--app-accent-soft)}
.qpst-btn-primary:hover:not(:disabled){background:var(--app-accent);border-color:var(--app-accent);color:#fff;opacity:.92}
@media (any-pointer:coarse){.qpst-btn:not(.qpst-retry){min-height:44px}}

.qpst-error{margin-top:24px;display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;border:1px solid var(--app-border-subtle);border-radius:var(--app-radius-card,16px);background:var(--app-surface-subtle)}
.qpst-error-text{margin:12px 0 0;font-size:var(--app-font-caption,12px);line-height:1.6;color:#c0392b}
html.dark-mode .qpst-error-text{color:#ff9a8f}

@media (max-width:600px){.qpst{padding:16px}.qpst-card{padding:12px}}
@media (max-width:520px){.qpst-grid{grid-template-columns:1fr;max-height:none}}
@media (max-width:380px){.qpst-title{font-size:19px}}
@media (prefers-reduced-motion:reduce){.qpst-card,.qpst-btn{transition:none}.qpst-sk{animation:none}}
`;

export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const element = doc.createElement("style");
  element.id = STYLE_ID;
  element.textContent = CSS;
  doc.head.appendChild(element);
}

export function removeStyles(doc: Document = document): void {
  doc.getElementById(STYLE_ID)?.remove();
}

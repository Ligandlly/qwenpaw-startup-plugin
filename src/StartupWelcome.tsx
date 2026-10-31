import type * as ReactNS from "react";

import { AgentCard } from "./AgentCard";
import {
  fetchAgents,
  isLaunchable,
  launchableAgents,
  pickDefaultAgent,
  sortAgents,
  type AgentSummary,
} from "./agents";
import { getUseSelectedAgent, readSelectedAgentId } from "./host";
import { launchAgent, type LaunchResult } from "./launch";
import { react } from "./react";
import { Avatar, Button } from "./ui";
import { useMessages } from "./useMessages";

/** The subset of the host's `WelcomeRenderProps` the startup page reuses. */
export interface WelcomeRenderPropsLike {
  avatar?: string | ReactNS.ReactNode;
  greeting?: ReactNS.ReactNode;
  description?: ReactNS.ReactNode;
}

export interface StartupWelcomeProps {
  /** Passed straight through by the host; only `avatar` is reused. */
  hostProps?: WelcomeRenderPropsLike;
  /** Called when there is nothing to choose from — hand the area back to the host. */
  onSkip: () => void;
  /** Test seam; production always uses the real storage + navigation path. */
  launchImpl?: (agentId: string) => LaunchResult;
}

type Status = "loading" | "ready" | "error";

const SKELETONS = [0, 1, 2, 3];

export function StartupWelcome({ hostProps, onSkip, launchImpl }: StartupWelcomeProps) {
  const React = react();
  const { t } = useMessages();
  const useHostSelectedAgent = getUseSelectedAgent();
  const [status, setStatus] = React.useState<Status>("loading");
  const [agents, setAgents] = React.useState<AgentSummary[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [launching, setLaunching] = React.useState(false);
  const [storageError, setStorageError] = React.useState(false);

  const cards = React.useRef(new Map<string, HTMLButtonElement>());
  const storedId = React.useRef<string>(readSelectedAgentId());
  const skipRef = React.useRef(onSkip);
  skipRef.current = onSkip;

  // The host's store is the live source of truth; the storage read is a
  // fallback for a host that does not expose `useSelectedAgent`.
  const hostedAgent = useHostSelectedAgent ? useHostSelectedAgent() : null;
  const currentId = hostedAgent?.id || storedId.current;
  const currentRef = React.useRef(currentId);
  currentRef.current = currentId;

  const load = React.useCallback((isActive: () => boolean) => {
    setStatus("loading");
    setStorageError(false);
    fetchAgents()
      .then((list) => {
        if (!isActive()) return;
        const sorted = sortAgents(list);
        // Nothing to choose (zero or one enabled agent): the startup page
        // would only add a click, so give the area back to the host.
        if (launchableAgents(sorted).length <= 1) {
          skipRef.current();
          return;
        }
        setAgents(sorted);
        setSelectedId(pickDefaultAgent(sorted, currentRef.current));
        setStatus("ready");
      })
      .catch(() => {
        if (isActive()) setStatus("error");
      });
  }, []);

  React.useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const launch = React.useCallback(
    (agentId: string | null) => {
      if (!agentId || launching) return;
      setLaunching(true);
      setStorageError(false);
      const result = (launchImpl ?? launchAgent)(agentId);
      if (!result.ok) {
        setLaunching(false);
        setStorageError(true);
      }
    },
    [launchImpl, launching],
  );

  const select = React.useCallback((agentId: string) => {
    setSelectedId(agentId);
    cards.current.get(agentId)?.focus();
  }, []);

  const onKeyDown = React.useCallback(
    (event: ReactNS.KeyboardEvent<HTMLDivElement>) => {
      const usable = launchableAgents(agents);
      if (usable.length === 0) return;
      const index = usable.findIndex((agent) => agent.id === selectedId);
      const move = (delta: number) => {
        event.preventDefault();
        const next = usable[(index + delta + usable.length) % usable.length];
        if (next) select(next.id);
      };
      if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1);
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1);
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        launch(selectedId);
      }
    },
    [agents, launch, select, selectedId],
  );

  const ready = status === "ready";
  const hostAvatar = hostProps?.avatar;

  const brand = () => {
    if (typeof hostAvatar === "string") {
      return <Avatar text="Q" size={64} round imageUrl={hostAvatar} />;
    }
    if (hostAvatar) return <span className="qpst-brand-node">{hostAvatar}</span>;
    return <Avatar text="Q" size={64} round className="qpst-brand" />;
  };

  return (
    <div className="qpst">
      <div className="qpst-head">
        {brand()}
        <div className="qpst-title" role="heading" aria-level={2}>
          {t("title")}
        </div>
        <p className="qpst-desc">
          {status === "error" ? t("errorBody") : t("description")}
        </p>
      </div>

      {status === "loading" ? (
        <div
          className="qpst-grid qpst-skeleton"
          aria-busy="true"
          aria-label={t("loading")}
        >
          {SKELETONS.map((key) => (
            <div className="qpst-card" key={key}>
              <span className="qpst-sk qpst-sk-ava" aria-hidden="true" />
              <span className="qpst-body">
                <span className="qpst-sk qpst-sk-title" />
                <span className="qpst-sk qpst-sk-line" />
                <span className="qpst-sk qpst-sk-line-short" />
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="qpst-error">
          <Button
            className="qpst-retry"
            ariaLabel={t("retry")}
            onClick={() => load(() => true)}
          >
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {ready ? (
        <div
          className="qpst-grid"
          role="radiogroup"
          aria-label={t("gridLabel")}
          onKeyDown={onKeyDown}
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={agent.id === selectedId}
              current={agent.id === currentId}
              disabledTag={t("disabledTag")}
              currentTag={t("currentTag")}
              onSelect={(agentId) => {
                if (isLaunchable(agent)) setSelectedId(agentId);
              }}
              registerRef={(element) => {
                if (element) cards.current.set(agent.id, element);
                else cards.current.delete(agent.id);
              }}
            />
          ))}
        </div>
      ) : null}

      {storageError ? (
        <p className="qpst-error-text" role="alert">
          {t("storageError")}
        </p>
      ) : null}

      {ready || status === "loading" ? (
        <div className="qpst-foot">
          <Button
            primary
            className="qpst-launch"
            loading={launching}
            disabled={!ready || !selectedId}
            ariaLabel={launching ? t("launching") : t("launch")}
            onClick={() => launch(selectedId)}
          >
            {launching ? t("launching") : t("launch")}
            <span aria-hidden="true">→</span>
          </Button>
          <span className="qpst-hint">{t("hint")}</span>
        </div>
      ) : null}
    </div>
  );
}

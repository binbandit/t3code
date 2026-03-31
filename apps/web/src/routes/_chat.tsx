import { type ResolvedKeybindingsConfig } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { useCommandPaletteStore } from "../commandPaletteStore";
import { useHandleNewThread } from "../hooks/useHandleNewThread";
import {
  resolveThreadActionProjectId,
  startNewLocalThreadFromContext,
  startNewThreadFromContext,
} from "../lib/chatThreadActions";
import { isTerminalFocused } from "../lib/terminalFocus";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { resolveShortcutCommand } from "../keybindings";
import { selectThreadTerminalState, useTerminalStateStore } from "../terminalStateStore";
import { useThreadSelectionStore } from "../threadSelectionStore";
import { useSettings } from "~/hooks/useSettings";

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];

function ChatRouteGlobalShortcuts() {
  const clearSelection = useThreadSelectionStore((state) => state.clearSelection);
  const selectedThreadIdsSize = useThreadSelectionStore((state) => state.selectedThreadIds.size);
  const { activeDraftThread, activeThread, defaultProjectId, handleNewThread, routeThreadId } =
    useHandleNewThread();
  const commandPaletteOpen = useCommandPaletteStore((s) => s.open);
  const toggleOpen = useCommandPaletteStore((s) => s.toggleOpen);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;
  const terminalOpen = useTerminalStateStore((state) =>
    routeThreadId
      ? selectThreadTerminalState(state.terminalStateByThreadId, routeThreadId).terminalOpen
      : false,
  );
  const appSettings = useSettings();

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const command = resolveShortcutCommand(event, keybindings, {
        context: {
          terminalFocus: isTerminalFocused(),
          terminalOpen,
        },
      });

      if (command === "commandPalette.toggle") {
        event.preventDefault();
        event.stopPropagation();
        toggleOpen();
        return;
      }

      if (commandPaletteOpen) {
        return;
      }

      if (event.key === "Escape" && selectedThreadIdsSize > 0) {
        event.preventDefault();
        clearSelection();
        return;
      }

      if (command !== "chat.new" && command !== "chat.newLocal") {
        return;
      }

      const threadActionContext = {
        activeDraftThread,
        activeThread,
        defaultThreadEnvMode: appSettings.defaultThreadEnvMode,
        handleNewThread,
        projects: defaultProjectId ? [{ id: defaultProjectId } as const] : [],
      } as const;

      if (!resolveThreadActionProjectId(threadActionContext)) {
        return;
      }

      if (command === "chat.newLocal") {
        event.preventDefault();
        event.stopPropagation();
        void startNewLocalThreadFromContext(threadActionContext);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void startNewThreadFromContext(threadActionContext);
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [
    activeDraftThread,
    activeThread,
    clearSelection,
    commandPaletteOpen,
    handleNewThread,
    keybindings,
    defaultProjectId,
    selectedThreadIdsSize,
    terminalOpen,
    toggleOpen,
    appSettings.defaultThreadEnvMode,
  ]);

  return null;
}

function ChatRouteLayout() {
  return (
    <>
      <ChatRouteGlobalShortcuts />
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/_chat")({
  component: ChatRouteLayout,
});

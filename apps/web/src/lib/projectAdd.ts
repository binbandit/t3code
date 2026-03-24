import {
  DEFAULT_MODEL_BY_PROVIDER,
  type NativeApi,
  type ProjectId,
  type ThreadId,
} from "@t3tools/contracts";
import type { DraftThreadEnvMode } from "../composerDraftStore";
import { newCommandId, newProjectId } from "./utils";
import {
  findProjectByPath,
  inferProjectTitleFromPath,
  isExplicitRelativeProjectPath,
  isUnsupportedWindowsProjectPath,
  resolveProjectPathForDispatch,
} from "./projectPaths";

interface ProjectLike {
  readonly id: ProjectId;
  readonly cwd: string;
}

interface ThreadLike {
  readonly id: ThreadId;
  readonly projectId: ProjectId;
  readonly createdAt: string;
  readonly updatedAt?: string | undefined;
}

interface AddProjectFromPathContext {
  readonly api: NativeApi;
  readonly currentProjectCwd?: string | null;
  readonly defaultThreadEnvMode: DraftThreadEnvMode;
  readonly handleNewThread: (
    projectId: ProjectId,
    options?: { envMode?: DraftThreadEnvMode },
  ) => Promise<void>;
  readonly navigateToThread: (threadId: ThreadId) => Promise<void>;
  readonly platform: string;
  readonly projects: ReadonlyArray<ProjectLike>;
  readonly threads: ReadonlyArray<ThreadLike>;
}

export type AddProjectFromPathResult = "created" | "existing" | "noop";

function resolveMostRecentThreadTimestamp(thread: {
  createdAt: string;
  updatedAt?: string | undefined;
}): number {
  const timestamp = Date.parse(thread.updatedAt ?? thread.createdAt);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function compareThreadsByMostRecentDesc(
  left: { id: string; createdAt: string; updatedAt?: string | undefined },
  right: { id: string; createdAt: string; updatedAt?: string | undefined },
): number {
  const byTimestamp =
    resolveMostRecentThreadTimestamp(right) - resolveMostRecentThreadTimestamp(left);
  if (byTimestamp !== 0) {
    return byTimestamp;
  }
  return right.id.localeCompare(left.id);
}

export async function addProjectFromPath(
  context: AddProjectFromPathContext,
  rawCwd: string,
): Promise<AddProjectFromPathResult> {
  if (isUnsupportedWindowsProjectPath(rawCwd.trim(), context.platform)) {
    throw new Error("Windows-style paths are only supported on Windows.");
  }

  if (isExplicitRelativeProjectPath(rawCwd.trim()) && !context.currentProjectCwd) {
    throw new Error("Relative paths require an active project.");
  }

  const cwd = resolveProjectPathForDispatch(rawCwd, context.currentProjectCwd);
  if (cwd.length === 0) {
    return "noop";
  }

  const existing = findProjectByPath(context.projects, cwd);
  if (existing) {
    const latestThread = context.threads
      .filter((thread) => thread.projectId === existing.id)
      .toSorted(compareThreadsByMostRecentDesc)[0];
    if (latestThread) {
      await context.navigateToThread(latestThread.id);
    }
    return "existing";
  }

  const projectId = newProjectId();
  await context.api.orchestration.dispatchCommand({
    type: "project.create",
    commandId: newCommandId(),
    projectId,
    title: inferProjectTitleFromPath(cwd),
    workspaceRoot: cwd,
    defaultModel: DEFAULT_MODEL_BY_PROVIDER.codex,
    createdAt: new Date().toISOString(),
  });
  await context.handleNewThread(projectId, {
    envMode: context.defaultThreadEnvMode,
  });
  return "created";
}

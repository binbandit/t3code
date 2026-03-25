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
  readonly selectExistingThreadId?: (projectId: ProjectId) => ThreadId | null;
}

export type AddProjectFromPathResult = "created" | "existing" | "noop";

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
    const threadId = context.selectExistingThreadId?.(existing.id) ?? null;
    if (threadId) {
      await context.navigateToThread(threadId);
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
  await context
    .handleNewThread(projectId, {
      envMode: context.defaultThreadEnvMode,
    })
    .catch(() => undefined);
  return "created";
}

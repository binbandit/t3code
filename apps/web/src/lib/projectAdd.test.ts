import { describe, expect, it, vi } from "vitest";
import { ProjectId, ThreadId, type NativeApi } from "@t3tools/contracts";
import { addProjectFromPath } from "./projectAdd";

describe("addProjectFromPath", () => {
  it("navigates to the selected existing project thread", async () => {
    const projectId = ProjectId.makeUnsafe("project-1");
    const selectedThreadId = ThreadId.makeUnsafe("thread-selected");
    const navigateToThread = vi.fn(async (_threadId: ThreadId) => undefined);

    await addProjectFromPath(
      {
        api: {
          orchestration: {
            dispatchCommand: vi.fn(),
          },
        } as unknown as NativeApi,
        currentProjectCwd: null,
        defaultThreadEnvMode: "local",
        handleNewThread: vi.fn(async () => undefined),
        navigateToThread,
        platform: "MacIntel",
        projects: [{ id: projectId, cwd: "/repo/project" }],
        selectExistingThreadId: vi.fn(() => selectedThreadId),
      },
      "/repo/project",
    );

    expect(navigateToThread).toHaveBeenCalledWith(selectedThreadId);
  });

  it("swallows thread creation failures after successfully creating a project", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const handleNewThread = vi.fn(async () => {
      throw new Error("thread create failed");
    });

    await expect(
      addProjectFromPath(
        {
          api: {
            orchestration: {
              dispatchCommand,
            },
          } as unknown as NativeApi,
          currentProjectCwd: null,
          defaultThreadEnvMode: "local",
          handleNewThread,
          navigateToThread: vi.fn(async (_threadId: ThreadId) => undefined),
          platform: "MacIntel",
          projects: [],
        },
        "/repo/new-project",
      ),
    ).resolves.toBe("created");

    expect(dispatchCommand).toHaveBeenCalledTimes(1);
    expect(handleNewThread).toHaveBeenCalledTimes(1);
  });
});

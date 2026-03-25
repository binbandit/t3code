import { describe, expect, it, vi } from "vitest";
import { ProjectId, ThreadId, type NativeApi } from "@t3tools/contracts";
import { addProjectFromPath } from "./projectAdd";

describe("addProjectFromPath", () => {
  it("navigates to the most recently updated existing project thread", async () => {
    const projectId = ProjectId.makeUnsafe("project-1");
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
        threads: [
          {
            id: ThreadId.makeUnsafe("thread-older"),
            projectId,
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-24T12:00:00.000Z",
          },
          {
            id: ThreadId.makeUnsafe("thread-newer"),
            projectId,
            createdAt: "2026-03-20T00:00:00.000Z",
            updatedAt: "2026-03-20T00:00:00.000Z",
          },
        ],
      },
      "/repo/project",
    );

    expect(navigateToThread).toHaveBeenCalledWith("thread-older");
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
          threads: [],
        },
        "/repo/new-project",
      ),
    ).resolves.toBe("created");

    expect(dispatchCommand).toHaveBeenCalledTimes(1);
    expect(handleNewThread).toHaveBeenCalledTimes(1);
  });
});

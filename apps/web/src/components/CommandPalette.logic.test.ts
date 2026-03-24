import { describe, expect, it, vi } from "vitest";
import { ProjectId, ThreadId } from "@t3tools/contracts";
import type { Thread } from "../types";
import { buildThreadActionItems } from "./CommandPalette.logic";

describe("buildThreadActionItems", () => {
  it("orders threads by most recent activity and formats timestamps from updatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00.000Z"));

    try {
      const projectId = ProjectId.makeUnsafe("project-1");
      const threads = [
        {
          id: ThreadId.makeUnsafe("thread-older"),
          codexThreadId: null,
          projectId,
          title: "Older thread",
          model: "gpt-5",
          runtimeMode: "full-access",
          interactionMode: "default",
          session: null,
          messages: [],
          proposedPlans: [],
          error: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-24T12:00:00.000Z",
          latestTurn: null,
          branch: null,
          worktreePath: null,
          turnDiffSummaries: [],
          activities: [],
        },
        {
          id: ThreadId.makeUnsafe("thread-newer"),
          codexThreadId: null,
          projectId,
          title: "Newer thread",
          model: "gpt-5",
          runtimeMode: "full-access",
          interactionMode: "default",
          session: null,
          messages: [],
          proposedPlans: [],
          error: null,
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
          latestTurn: null,
          branch: null,
          worktreePath: null,
          turnDiffSummaries: [],
          activities: [],
        },
      ] satisfies Thread[];

      const items = buildThreadActionItems({
        threads,
        projectTitleById: new Map([[projectId, "Project"]]),
        icon: null,
        runThread: async (_threadId) => undefined,
      });

      expect(items.map((item) => item.value)).toEqual([
        "thread:thread-older",
        "thread:thread-newer",
      ]);
      expect(items[0]?.timestamp).toBe("1d ago");
      expect(items[1]?.timestamp).toBe("5d ago");
    } finally {
      vi.useRealTimers();
    }
  });
});

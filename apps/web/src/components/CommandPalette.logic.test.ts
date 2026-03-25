import { describe, expect, it, vi } from "vitest";
import { ProjectId, ThreadId } from "@t3tools/contracts";
import type { Thread } from "../types";
import {
  buildThreadActionItems,
  filterCommandPaletteGroups,
  type CommandPaletteGroup,
} from "./CommandPalette.logic";

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
      expect(items[0]?.timestamp).toBe("yesterday");
      expect(items[1]?.timestamp).toBe("5 days ago");
    } finally {
      vi.useRealTimers();
    }
  });

  it("ranks thread title matches ahead of contextual project-name matches", () => {
    const projectId = ProjectId.makeUnsafe("project-1");
    const threadItems = buildThreadActionItems({
      threads: [
        {
          id: ThreadId.makeUnsafe("thread-context-match"),
          codexThreadId: null,
          projectId,
          title: "Fix navbar spacing",
          model: "gpt-5",
          runtimeMode: "full-access",
          interactionMode: "default",
          session: null,
          messages: [],
          proposedPlans: [],
          error: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
          latestTurn: null,
          branch: null,
          worktreePath: null,
          turnDiffSummaries: [],
          activities: [],
        },
        {
          id: ThreadId.makeUnsafe("thread-title-match"),
          codexThreadId: null,
          projectId,
          title: "Project kickoff notes",
          model: "gpt-5",
          runtimeMode: "full-access",
          interactionMode: "default",
          session: null,
          messages: [],
          proposedPlans: [],
          error: null,
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
          latestTurn: null,
          branch: null,
          worktreePath: null,
          turnDiffSummaries: [],
          activities: [],
        },
      ] satisfies Thread[],
      projectTitleById: new Map([[projectId, "Project"]]),
      icon: null,
      runThread: async (_threadId) => undefined,
    });

    const groups = filterCommandPaletteGroups({
      activeGroups: [],
      query: "project",
      isInSubmenu: false,
      projectSearchItems: [],
      threadSearchItems: threadItems,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.value).toBe("threads-search");
    expect(groups[0]?.items.map((item) => item.value)).toEqual([
      "thread:thread-title-match",
      "thread:thread-context-match",
    ]);
  });

  it("preserves thread project-name matches when there is no stronger title match", () => {
    const group: CommandPaletteGroup = {
      value: "threads-search",
      label: "Threads",
      items: [
        {
          kind: "action",
          value: "thread:project-context-only",
          searchTerms: ["Fix navbar spacing", "Project"],
          title: "Fix navbar spacing",
          description: "Project",
          icon: null,
          run: async () => undefined,
        },
      ],
    };

    const groups = filterCommandPaletteGroups({
      activeGroups: [group],
      query: "project",
      isInSubmenu: false,
      projectSearchItems: [],
      threadSearchItems: [],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.value)).toEqual(["thread:project-context-only"]);
  });
});

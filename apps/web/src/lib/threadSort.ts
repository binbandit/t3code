import type { ProjectId } from "@t3tools/contracts";
import type { SidebarProjectSortOrder, SidebarThreadSortOrder } from "@t3tools/contracts/settings";
import type { Thread } from "../types";

type ThreadSortInput = Pick<Thread, "createdAt" | "updatedAt" | "messages">;

function toSortableTimestamp(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function getLatestUserMessageTimestamp(thread: ThreadSortInput): number {
  let latestUserMessageTimestamp: number | null = null;

  for (const message of thread.messages) {
    if (message.role !== "user") continue;
    const messageTimestamp = toSortableTimestamp(message.createdAt);
    if (messageTimestamp === null) continue;
    latestUserMessageTimestamp =
      latestUserMessageTimestamp === null
        ? messageTimestamp
        : Math.max(latestUserMessageTimestamp, messageTimestamp);
  }

  if (latestUserMessageTimestamp !== null) {
    return latestUserMessageTimestamp;
  }

  return toSortableTimestamp(thread.updatedAt ?? thread.createdAt) ?? Number.NEGATIVE_INFINITY;
}

export function getThreadSortTimestamp(
  thread: ThreadSortInput,
  sortOrder: SidebarThreadSortOrder | Exclude<SidebarProjectSortOrder, "manual">,
): number {
  if (sortOrder === "created_at") {
    return toSortableTimestamp(thread.createdAt) ?? Number.NEGATIVE_INFINITY;
  }
  return getLatestUserMessageTimestamp(thread);
}

export function sortThreads<T extends Pick<Thread, "id" | "createdAt" | "updatedAt" | "messages">>(
  threads: readonly T[],
  sortOrder: SidebarThreadSortOrder,
): T[] {
  return threads.toSorted((left, right) => {
    const rightTimestamp = getThreadSortTimestamp(right, sortOrder);
    const leftTimestamp = getThreadSortTimestamp(left, sortOrder);
    const byTimestamp =
      rightTimestamp === leftTimestamp ? 0 : rightTimestamp > leftTimestamp ? 1 : -1;
    if (byTimestamp !== 0) return byTimestamp;
    return right.id.localeCompare(left.id);
  });
}

export function getLatestThreadForProject<
  T extends Pick<Thread, "id" | "projectId" | "createdAt" | "updatedAt" | "messages">,
>(threads: readonly T[], projectId: ProjectId, sortOrder: SidebarThreadSortOrder): T | null {
  return (
    sortThreads(
      threads.filter((thread) => thread.projectId === projectId),
      sortOrder,
    )[0] ?? null
  );
}

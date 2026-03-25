import { type KeybindingCommand, type FilesystemBrowseEntry } from "@t3tools/contracts";
import { type ReactNode } from "react";
import { compareThreadsByMostRecentDesc } from "../lib/projectAdd";
import { formatRelativeTime } from "../relativeTime";
import { type Project, type Thread } from "../types";

export const RECENT_THREAD_LIMIT = 12;
export const ITEM_ICON_CLASS = "size-4 text-muted-foreground/80";
export const ADDON_ICON_CLASS = "size-4";

export interface CommandPaletteItem {
  readonly kind: "action" | "submenu";
  readonly value: string;
  readonly label: string;
  readonly title: ReactNode;
  readonly description?: string;
  readonly searchText?: string;
  readonly searchFields?: ReadonlyArray<string>;
  readonly timestamp?: string;
  readonly icon: ReactNode;
  readonly shortcutCommand?: KeybindingCommand;
}

export interface CommandPaletteActionItem extends CommandPaletteItem {
  readonly kind: "action";
  readonly keepOpen?: boolean;
  readonly run: () => Promise<void>;
}

export interface CommandPaletteSubmenuItem extends CommandPaletteItem {
  readonly kind: "submenu";
  readonly addonIcon: ReactNode;
  readonly groups: ReadonlyArray<CommandPaletteGroup>;
  readonly initialQuery?: string;
}

export interface CommandPaletteGroup {
  readonly value: string;
  readonly label: string;
  readonly items: ReadonlyArray<CommandPaletteActionItem | CommandPaletteSubmenuItem>;
}

export interface CommandPaletteView {
  readonly addonIcon: ReactNode;
  readonly groups: ReadonlyArray<CommandPaletteGroup>;
  readonly initialQuery?: string;
}

export type CommandPaletteMode = "root" | "root-browse" | "submenu" | "submenu-browse";

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildProjectActionItems(input: {
  projects: ReadonlyArray<Project>;
  valuePrefix: string;
  icon: ReactNode;
  runProject: (projectId: Project["id"]) => Promise<void>;
}): CommandPaletteActionItem[] {
  return input.projects.map((project) => ({
    kind: "action",
    value: `${input.valuePrefix}:${project.id}`,
    label: `${project.name} ${project.cwd}`.trim(),
    title: project.name,
    description: project.cwd,
    searchFields: [project.name, project.cwd],
    icon: input.icon,
    run: async () => {
      await input.runProject(project.id);
    },
  }));
}

export function buildThreadActionItems(input: {
  threads: ReadonlyArray<Thread>;
  activeThreadId?: Thread["id"];
  projectTitleById: ReadonlyMap<Project["id"], string>;
  icon: ReactNode;
  runThread: (threadId: Thread["id"]) => Promise<void>;
  limit?: number;
}): CommandPaletteActionItem[] {
  const sortedThreads = input.threads.toSorted(compareThreadsByMostRecentDesc);
  const visibleThreads =
    input.limit === undefined ? sortedThreads : sortedThreads.slice(0, input.limit);

  return visibleThreads.map((thread) => {
    const projectTitle = input.projectTitleById.get(thread.projectId);
    const descriptionParts: string[] = [];

    if (projectTitle) {
      descriptionParts.push(projectTitle);
    }
    if (thread.branch) {
      descriptionParts.push(`#${thread.branch}`);
    }
    if (thread.id === input.activeThreadId) {
      descriptionParts.push("Current thread");
    }

    const searchText = `${thread.title} ${projectTitle ?? ""} ${thread.branch ?? ""}`.trim();

    return {
      kind: "action",
      value: `thread:${thread.id}`,
      label: searchText,
      title: thread.title,
      description: descriptionParts.join(" · "),
      searchText,
      searchFields: [thread.title, projectTitle ?? "", thread.branch ?? ""],
      timestamp: formatRelativeTime(thread.updatedAt ?? thread.createdAt, Date.now(), "short"),
      icon: input.icon,
      run: async () => {
        await input.runThread(thread.id);
      },
    };
  });
}

function rankSearchFieldMatch(field: string, normalizedQuery: string): number {
  const normalizedField = normalizeSearchText(field);
  if (normalizedField.length === 0 || !normalizedField.includes(normalizedQuery)) {
    return Number.NEGATIVE_INFINITY;
  }
  if (normalizedField === normalizedQuery) {
    return 3;
  }
  if (normalizedField.startsWith(normalizedQuery)) {
    return 2;
  }
  return 1;
}

function rankCommandPaletteItemMatch(
  item: CommandPaletteActionItem | CommandPaletteSubmenuItem,
  normalizedQuery: string,
): number {
  const searchFields = item.searchFields?.filter((field) => field.length > 0) ?? [];
  if (searchFields.length === 0) {
    return 0;
  }

  for (const [index, field] of searchFields.entries()) {
    const fieldRank = rankSearchFieldMatch(field, normalizedQuery);
    if (fieldRank !== Number.NEGATIVE_INFINITY) {
      return 1_000 - index * 100 + fieldRank;
    }
  }

  return 0;
}

export function filterCommandPaletteGroups(input: {
  activeGroups: ReadonlyArray<CommandPaletteGroup>;
  query: string;
  isInSubmenu: boolean;
  projectSearchItems: ReadonlyArray<CommandPaletteActionItem>;
  threadSearchItems: ReadonlyArray<CommandPaletteActionItem>;
}): CommandPaletteGroup[] {
  const isActionsFilter = input.query.startsWith(">");
  const searchQuery = isActionsFilter ? input.query.slice(1) : input.query;
  const normalizedQuery = normalizeSearchText(searchQuery);

  if (normalizedQuery.length === 0) {
    if (isActionsFilter) {
      return input.activeGroups.filter((group) => group.value === "actions");
    }
    return [...input.activeGroups];
  }

  let baseGroups = [...input.activeGroups];
  if (isActionsFilter) {
    baseGroups = baseGroups.filter((group) => group.value === "actions");
  } else if (!input.isInSubmenu) {
    baseGroups = baseGroups.filter((group) => group.value !== "recent-threads");
  }

  const searchableGroups = [...baseGroups];
  if (!input.isInSubmenu && !isActionsFilter) {
    if (input.projectSearchItems.length > 0) {
      searchableGroups.push({
        value: "projects-search",
        label: "Projects",
        items: input.projectSearchItems,
      });
    }
    if (input.threadSearchItems.length > 0) {
      searchableGroups.push({
        value: "threads-search",
        label: "Threads",
        items: input.threadSearchItems,
      });
    }
  }

  return searchableGroups.flatMap((group) => {
    const items = group.items
      .map((item, index) => {
        const haystack = normalizeSearchText(
          item.searchText ?? [item.label, item.description].filter(Boolean).join(" "),
        );
        if (!haystack.includes(normalizedQuery)) {
          return null;
        }

        return {
          item,
          index,
          rank: rankCommandPaletteItemMatch(item, normalizedQuery),
        };
      })
      .filter(
        (entry): entry is { item: (typeof group.items)[number]; index: number; rank: number } =>
          entry !== null,
      )
      .toSorted((left, right) => right.rank - left.rank || left.index - right.index)
      .map((entry) => entry.item);

    if (items.length === 0) {
      return [];
    }

    return [{ value: group.value, label: group.label, items }];
  });
}

export function buildBrowseGroups(input: {
  browseEntries: ReadonlyArray<FilesystemBrowseEntry>;
  browseQuery: string;
  canBrowseUp: boolean;
  upIcon: ReactNode;
  directoryIcon: ReactNode;
  browseUp: () => void;
  browseTo: (name: string) => void;
}): CommandPaletteGroup[] {
  const items: CommandPaletteActionItem[] = [];

  if (input.canBrowseUp) {
    items.push({
      kind: "action",
      value: "browse:up",
      label: `${input.browseQuery} ..`,
      searchText: `${input.browseQuery} ..`,
      title: "..",
      icon: input.upIcon,
      keepOpen: true,
      run: async () => {
        input.browseUp();
      },
    });
  }

  for (const entry of input.browseEntries) {
    items.push({
      kind: "action",
      value: `browse:${entry.fullPath}`,
      label: `${input.browseQuery} ${entry.fullPath} ${entry.name}`,
      searchText: `${input.browseQuery} ${entry.fullPath} ${entry.name}`,
      title: entry.name,
      icon: input.directoryIcon,
      keepOpen: true,
      run: async () => {
        input.browseTo(entry.name);
      },
    });
  }

  return [{ value: "directories", label: "Directories", items }];
}

export function getCommandPaletteMode(input: {
  currentView: CommandPaletteView | null;
  isBrowsing: boolean;
}): CommandPaletteMode {
  if (input.currentView) {
    return input.isBrowsing ? "submenu-browse" : "submenu";
  }
  return input.isBrowsing ? "root-browse" : "root";
}

export function getCommandPaletteInputPlaceholder(mode: CommandPaletteMode): string {
  switch (mode) {
    case "root":
      return "Search commands, projects, and threads...";
    case "root-browse":
      return "Enter project path (e.g. ~/projects/my-app)";
    case "submenu":
      return "Search...";
    case "submenu-browse":
      return "Enter path (e.g. ~/projects/my-app)";
  }
}

export function getCommandPaletteInputStartAddon(input: {
  mode: CommandPaletteMode;
  currentViewAddonIcon: ReactNode | null;
  browseIcon: ReactNode;
}): ReactNode | undefined {
  if (input.mode === "submenu" || input.mode === "submenu-browse") {
    return input.currentViewAddonIcon ?? undefined;
  }
  if (input.mode === "root-browse") {
    return input.browseIcon;
  }
  return undefined;
}

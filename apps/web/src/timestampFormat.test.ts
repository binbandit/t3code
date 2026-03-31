import { describe, expect, it } from "vitest";

import {
  formatRelativeTime,
  formatRelativeTimeLabel,
  getTimestampFormatOptions,
} from "./timestampFormat";

describe("getTimestampFormatOptions", () => {
  it("omits hour12 when locale formatting is requested", () => {
    expect(getTimestampFormatOptions("locale", true)).toEqual({
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  });

  it("builds a 12-hour formatter with seconds when requested", () => {
    expect(getTimestampFormatOptions("12-hour", true)).toEqual({
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  });

  it("builds a 24-hour formatter without seconds when requested", () => {
    expect(getTimestampFormatOptions("24-hour", false)).toEqual({
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  });
});

describe("formatRelativeTime", () => {
  const nowMs = Date.parse("2026-03-15T12:00:00.000Z");

  it("returns just now for times under a minute old", () => {
    expect(formatRelativeTime("2026-03-15T11:59:45.000Z", nowMs)).toEqual({
      value: "just now",
      suffix: null,
    });
  });

  it("returns structured short values by default", () => {
    expect(formatRelativeTime("2026-03-15T11:55:00.000Z", nowMs)).toEqual({
      value: "5m",
      suffix: "ago",
    });
    expect(formatRelativeTime("2026-03-15T09:00:00.000Z", nowMs)).toEqual({
      value: "3h",
      suffix: "ago",
    });
    expect(formatRelativeTime("2026-03-12T12:00:00.000Z", nowMs)).toEqual({
      value: "3d",
      suffix: "ago",
    });
  });

  it("returns structured long values", () => {
    expect(formatRelativeTime("2026-03-15T11:55:00.000Z", nowMs, "long")).toEqual({
      value: "5 minutes",
      suffix: "ago",
    });
    expect(formatRelativeTime("2026-03-15T09:00:00.000Z", nowMs, "long")).toEqual({
      value: "3 hours",
      suffix: "ago",
    });
    expect(formatRelativeTime("2026-03-12T12:00:00.000Z", nowMs, "long")).toEqual({
      value: "3 days",
      suffix: "ago",
    });
  });
});

describe("formatRelativeTimeLabel", () => {
  it("formats short labels", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTimeLabel(fiveMinutesAgo, "short")).toBe("5m ago");
  });

  it("formats long labels", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTimeLabel(fiveMinutesAgo, "long")).toBe("5 minutes ago");
  });
});

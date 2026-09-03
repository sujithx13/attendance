import { describe, expect, it } from "vitest";
import { getTabs } from "../lib/navigation";

describe("getTabs", () => {
  it("keeps student navigation focused on home, timetable, universal scanner, and profile", () => {
    expect(getTabs("student").map((tab) => tab.screen)).toEqual(["home", "timetable", "scanner", "profile"]);
  });

  it("gives faculty direct access to home, schedule, universal scanner, and profile", () => {
    expect(getTabs("faculty").map((tab) => tab.screen)).toEqual(["home", "timetable", "scanner", "profile"]);
  });
});

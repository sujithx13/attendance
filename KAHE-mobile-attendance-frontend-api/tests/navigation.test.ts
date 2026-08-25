import { describe, expect, it } from "vitest";
import { getTabs } from "../lib/navigation";

describe("getTabs", () => {
  it("keeps student navigation focused on scanner attendance, personal QR, analytics, and profile", () => {
    expect(getTabs("student").map((tab) => tab.screen)).toEqual(["home", "attendance", "qr", "history", "profile"]);
  });

  it("gives faculty direct access to live QR setup, roster scanning, and profile", () => {
    expect(getTabs("faculty").map((tab) => tab.screen)).toEqual(["home", "classroom", "scanner", "profile"]);
  });
});

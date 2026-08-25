import { describe, expect, it } from "vitest";
import { API_BASE_URL, authHeaders } from "../lib/api";

describe("attendance API client configuration", () => {
  it("uses the supplied versioned backend base URL", () => {
    expect(API_BASE_URL).toBe("https://witnesses-gaps-liable-vary.trycloudflare.com/api/v1");
  });

  it("formats authenticated requests with a bearer token", () => {
    expect(authHeaders("example-token")).toEqual({ Authorization: "Bearer example-token" });
  });
});

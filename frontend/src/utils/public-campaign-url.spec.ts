import { afterEach, describe, expect, it, vi } from "vitest";
import { publicCampaignUrl } from "./public-campaign-url";

describe("publicCampaignUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves an origin-relative api url against the page origin", () => {
    vi.stubEnv("VITE_API_URL", "/api");

    expect(publicCampaignUrl("abc123")).toBe(
      `${window.location.origin}/api/v2/public/campaign/abc123`,
    );
  });

  it("keeps an absolute api url", () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:8686");

    expect(publicCampaignUrl("abc123")).toBe(
      "http://localhost:8686/v2/public/campaign/abc123",
    );
  });

  it("falls back to the page origin when no api url is configured", () => {
    vi.stubEnv("VITE_API_URL", "");

    expect(publicCampaignUrl("abc123")).toBe(
      `${window.location.origin}/v2/public/campaign/abc123`,
    );
  });

  it("does not double up on a trailing slash", () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:8686/");

    expect(publicCampaignUrl("abc123")).toBe(
      "http://localhost:8686/v2/public/campaign/abc123",
    );
  });
});

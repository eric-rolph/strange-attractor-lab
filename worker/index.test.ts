import { describe, expect, it } from "vitest";
import worker from "./index";

const assets = {
  fetch: async () => new Response("asset-response", { status: 200 }),
};

describe("Cloudflare Worker", () => {
  it("returns health metadata", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/api/health"),
      { ASSETS: assets } as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      service: "strange-attractor-lab",
    });
  });

  it("returns structured 404 responses for unknown API routes", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/api/missing"),
      { ASSETS: assets } as never,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("delegates non-API requests to static assets", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/"),
      { ASSETS: assets } as never,
    );

    expect(await response.text()).toBe("asset-response");
  });
});


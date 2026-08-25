import { describe, expect, it, vi } from "vitest";
import fixture from "@/tests/fixtures/v6-real-essay.json";
import { createV6EvaluateHandler } from "@/app/api/v6/evaluate/route";

const input = {
  sourceText: fixture.exam.sourceText,
  starter1: fixture.exam.starter1,
  studentParagraph1: fixture.sample.p1,
  starter2: fixture.exam.starter2,
  studentParagraph2: fixture.sample.p2,
};

function request(body: unknown = input, contentType = "application/json") {
  return new Request("https://essayflow-tan.vercel.app/api/v6/evaluate", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-forwarded-for": "203.0.113.8, 10.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v6/evaluate proxy", () => {
  it("validates input before contacting the scoring service", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const handler = createV6EvaluateHandler({ fetchImpl });

    expect((await handler(request({ sourceText: "short" }))).status).toBe(400);
    expect((await handler(request(input, "text/plain"))).status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("forwards valid input to the stable scoring service endpoint", async () => {
    const upstreamBody = '{"type":"stage","stage":1,"status":"complete"}\n';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(upstreamBody, {
      status: 200,
      headers: { "content-type": "application/x-ndjson; charset=utf-8" },
    }));
    const handler = createV6EvaluateHandler({ fetchImpl });

    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(await response.text()).toBe(upstreamBody);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://essayflow-scoring-service.vercel.app/api/v6/evaluate");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "content-type": "application/json",
      origin: "https://essayflow-scoring-service.vercel.app",
      "x-forwarded-for": "203.0.113.8",
    });
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it("supports an HTTPS service override without exposing it to the page", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "RATE_LIMITED" }, { status: 429 }));
    const handler = createV6EvaluateHandler({
      env: { SCORING_SERVICE_URL: "https://preview.example/ignored/path" },
      fetchImpl,
    });

    const response = await handler(request());
    expect(response.status).toBe(429);
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://preview.example/api/v6/evaluate");
  });

  it("rejects an insecure service URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const handler = createV6EvaluateHandler({
      env: { SCORING_SERVICE_URL: "http://insecure.example" },
      fetchImpl,
    });

    const response = await handler(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: "SERVICE_CONFIG_ERROR" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a safe 502 when the scoring service cannot be reached", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("secret upstream detail"));
    const handler = createV6EvaluateHandler({ fetchImpl });

    const response = await handler(request());
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).toContain("SERVICE_UNAVAILABLE");
    expect(body).not.toContain("secret upstream detail");
  });
});

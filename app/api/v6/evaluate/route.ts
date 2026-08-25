import { V6EvaluateInputSchema } from "@/lib/workflow/v6/types";

const DEFAULT_SCORING_SERVICE_URL = "https://essayflow-scoring-service.vercel.app";

type EvaluationEnv = Record<string, string | undefined>;
type Fetch = typeof fetch;

type HandlerDependencies = {
  env?: EvaluationEnv;
  fetchImpl?: Fetch;
};

function scoringEndpoint(env: EvaluationEnv) {
  const configured = env.SCORING_SERVICE_URL?.trim() || DEFAULT_SCORING_SERVICE_URL;
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("SCORING_SERVICE_URL must use HTTPS");
  return new URL("/api/v6/evaluate", url);
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function createV6EvaluateHandler(dependencies: HandlerDependencies = {}) {
  const env = dependencies.env ?? process.env;
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  return async function handle(request: Request) {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: "请求必须使用 JSON", code: "INVALID_INPUT" }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "请求内容不是合法 JSON", code: "INVALID_INPUT" }, { status: 400 });
    }

    const parsed = V6EvaluateInputSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "提交内容不完整", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    let endpoint: URL;
    try {
      endpoint = scoringEndpoint(env);
    } catch (error) {
      console.error("[scoring-service-config]", error);
      return Response.json({ error: "评测服务配置错误", code: "SERVICE_CONFIG_ERROR" }, { status: 500 });
    }

    try {
      const upstream = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: endpoint.origin,
          "x-forwarded-for": clientIp(request),
        },
        body: JSON.stringify(parsed.data),
        cache: "no-store",
        signal: request.signal,
      });

      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      console.error("[scoring-service-unavailable]", error);
      return Response.json(
        { error: "评测服务暂时不可用，请稍后重试", code: "SERVICE_UNAVAILABLE" },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }
  };
}

export const POST = createV6EvaluateHandler();

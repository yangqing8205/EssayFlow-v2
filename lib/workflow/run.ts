import { FinalReportSchema, type ParsedEssay, type WorkflowState } from "@/lib/schemas";
import { analyzeStory, analyzeLanguage, score } from "@/lib/agents/mock";
import { OpenAICompatibleProvider, providerMode } from "@/lib/providers";
import { EVALUATION_PROMPT } from "@/lib/prompts/evaluation";

export async function runWorkflow(parsed: ParsedEssay, onStage?: (state: WorkflowState) => void) {
  const stage = (name: WorkflowState["stage"], status: WorkflowState["status"]) => onStage?.({ stage: name, status });
  if (providerMode() === "live") {
    stage("story", "running");
    const provider = new OpenAICompatibleProvider();
    const raw = await provider.generate<Record<string, unknown>>(EVALUATION_PROMPT, parsed);
    stage("story", "done"); stage("language", "done"); stage("score", "done"); stage("report", "done");
    return FinalReportSchema.parse({ ...raw, modelVersion: process.env.OPENAI_MODEL || "openai-compatible", isMock: false });
  }
  stage("story", "running");
  const story = analyzeStory(parsed);
  stage("story", "done"); stage("language", "running");
  const rawLanguage = analyzeLanguage(parsed);
  const language = { ...rawLanguage, issues: rawLanguage.issues.map(issue => ({ ...issue, problem: issue.problem.replace(/[。！？.!?]+$/, "") })) };
  stage("language", "done"); stage("score", "running");
  const scoring = score(story, language);
  stage("score", "done"); stage("report", "running");
  const result = FinalReportSchema.parse({ score: scoring, story, language, polishedVersion: `${parsed.starter1} ${parsed.studentParagraph1}\n\n${parsed.starter2} ${parsed.studentParagraph2}`, modelVersion: "mock-public-demo-v2", isMock: true });
  stage("report", "done");
  return result;
}

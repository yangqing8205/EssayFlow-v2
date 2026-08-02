"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO } from "@/data/examples/demo";
import { parseEssay, parsePromptText, wordCount } from "@/lib/workflow/parser";
import type { EssayInput, FinalReport, ParsedEssay, WorkflowState } from "@/lib/schemas";
import { Report } from "@/components/Report";

type View = "home" | "input" | "confirm" | "progress" | "report";
const EMPTY: EssayInput = { promptText: "", studentParagraph1: "", studentParagraph2: "" };
const STORAGE_KEY = "essayflow-draft-v2";
const stages: { key: WorkflowState["stage"]; label: string }[] = [
  { key: "parse", label: "识别原文与两句段首语" },
  { key: "story", label: "提取核心矛盾与主题终点" },
  { key: "language", label: "通读全文语言表现" },
  { key: "score", label: "内容判档与语言档内定分" },
  { key: "report", label: "生成个性化报告" },
];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [form, setForm] = useState<EssayInput>(() => { if (typeof window === "undefined") return EMPTY; const draft = localStorage.getItem(STORAGE_KEY); if (!draft) return EMPTY; try { return JSON.parse(draft); } catch { return EMPTY; } });
  const [parsed, setParsed] = useState<ParsedEssay | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => { if (!Object.values(form).some(Boolean)) return; const timer = setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })); }, 500); return () => clearTimeout(timer); }, [form]);

  const update = (key: keyof EssayInput, value: string) => setForm(x => ({ ...x, [key]: value }));
  const loadDemo = () => { setForm(DEMO); setView("input"); setError(""); };
  const clear = () => { setForm(EMPTY); localStorage.removeItem(STORAGE_KEY); setSavedAt(""); };
  function handleParse() { try { setParsed(parseEssay(form)); setError(""); setView("confirm"); } catch (e) { setError(e instanceof Error ? e.message : "输入格式有误"); } }
  async function evaluate() { if (!parsed) return; setView("progress"); setDone([]); try { for (const s of stages) { setActive(s.key); await new Promise(r => setTimeout(r, 300)); setDone(x => [...x, s.key]); } const response = await fetch("/api/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setReport(data); setView("report"); } catch (e) { setError(e instanceof Error ? e.message : "评测暂时失败"); setView("confirm"); } }

  const step = view === "input" ? 1 : view === "confirm" || view === "progress" ? 2 : view === "report" ? 3 : 0;
  return <main className="app-shell"><Header step={step} onHome={() => setView("home")} />
    {view === "home" && <Landing start={() => setView("input")} demo={loadDemo} />}
    {view === "input" && <InputWorkspace form={form} update={update} demo={loadDemo} clear={clear} error={error} next={handleParse} savedAt={savedAt} />}
    {view === "confirm" && parsed && <Confirm parsed={parsed} setParsed={setParsed} back={() => setView("input")} next={evaluate} />}
    {view === "progress" && <Progress active={active} done={done} />}
    {view === "report" && report && <div className="page-width report-page"><Report report={report} onRevise={() => setView("input")} /></div>}
    <Footer />
  </main>;
}

function Logo() { return <span className="logo-mark" aria-hidden><svg viewBox="0 0 32 32"><path d="M7 25C7 14 13 7 25 6c0 12-7 19-18 19Z"/><path d="M9 23c4-6 8-10 14-14"/></svg></span>; }
function Header({ step, onHome }: { step: number; onHome: () => void }) { return <header className="topbar"><div className="page-width header-inner"><button className="brand" onClick={onHome}><Logo/><span>Essay<b>Flow</b></span></button>{step > 0 && <nav className="steps" aria-label="评测步骤">{["提交内容", "确认边界", "查看报告"].map((x, i) => <div className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""} key={x}><span>{step > i + 1 ? "✓" : i + 1}</span>{x}</div>)}</nav>}<div className="privacy"><span>●</span> 本地自动保存</div></div></header>; }

function Landing({ start, demo }: { start: () => void; demo: () => void }) { return <>
  <section className="landing page-width"><div className="landing-copy"><span className="pill">高中英语 · 读后续写</span><h1>先读懂故事，<br/><em>再给出分数。</em></h1><p>四项内容标准决定档位，语言整体表现决定档内分。每一个判断都能回到原文和学生续写里找到证据。</p><div className="button-row"><button className="btn btn-primary" onClick={start}>开始评测 <span>→</span></button><button className="btn btn-ghost" onClick={demo}>查看脱敏示例</button></div><small>无需注册 · 草稿保存在本机 · 请勿粘贴个人信息</small></div>
  <div className="preview-card"><div className="preview-top"><span>评测结果</span><i>内容已判档</i></div><div className="preview-score"><b>22</b><span>/25<br/>第五档 · 档内中位</span></div><div className="preview-divider"/><p>内容决定档位</p>{["解决矛盾", "文本衔接", "主题升华", "情节合理性"].map((x, i) => <div className="preview-row" key={x}><span>{x}</span><b>{i === 3 ? "轻微瑕疵" : "表现充分"}</b></div>)}<div className="preview-language"><span>语言整体表现</span><b>档内中位</b></div></div></section>
  <section className="method"><div className="page-width method-grid">{[["01", "一次粘贴题目", "原文、要求和两句段首语一起粘贴，系统自动拆分。"], ["02", "内容先判档", "解决矛盾、衔接、主题和合理性决定档位上限。"], ["03", "语言再定分", "整体看准确、流畅、丰富和叙事支撑，不机械数错。"]].map(x => <article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></section>
  </>; }

function InputWorkspace({ form, update, demo, clear, error, next, savedAt }: { form: EssayInput; update: (k: keyof EssayInput, v: string) => void; demo: () => void; clear: () => void; error: string; next: () => void; savedAt: string }) {
  const extracted = useMemo(() => {
    try { return parsePromptText(form.promptText); }
    catch { return { sourceText: "", starter1: "", starter2: "" }; }
  }, [form.promptText]);
  const checks = [{ label: "阅读原文", ok: extracted.sourceText.length >= 60 }, { label: "两句段首语", ok: Boolean(extracted.starter1 && extracted.starter2) }, { label: "第一段续写", ok: form.studentParagraph1.trim().length >= 10 }, { label: "第二段续写", ok: form.studentParagraph2.trim().length >= 10 }];
  const ready = checks.every(x => x.ok);
  return <div className="workspace page-width"><div className="workspace-title"><div><p className="eyebrow">步骤 1 / 3</p><h1>提交续写内容</h1><p>完整题目只需粘贴一次，我们会自动识别并锁定两句段首语。</p></div><button className="text-button" onClick={demo}>填入脱敏示例</button></div>
    <div className="workspace-grid"><div className="editor-column">
      <EditorCard index="01" title="粘贴完整题目" hint="包含阅读原文、注意事项和两句段首语" count={wordCount(form.promptText)}><textarea rows={13} value={form.promptText} onChange={e => update("promptText", e.target.value)} placeholder="将整道读后续写题目粘贴到这里……"/></EditorCard>
      <section className="parse-panel"><div className="parse-heading"><span className={extracted.starter2 ? "parse-icon ok" : "parse-icon"}>{extracted.starter2 ? "✓" : "↗"}</span><div><b>自动识别结果</b><p>段首语会锁定，不参与语言纠错</p></div></div><LockedRow label="P1 段首语" value={extracted.starter1}/><LockedRow label="P2 段首语" value={extracted.starter2}/></section>
      <div className="paragraph-grid"><EditorCard index="02" title="第一段学生续写" hint="无需重复第一段给定首句" count={wordCount(form.studentParagraph1)}><textarea rows={8} value={form.studentParagraph1} onChange={e => update("studentParagraph1", e.target.value)} placeholder="粘贴第一段学生原创内容……"/></EditorCard><EditorCard index="03" title="第二段学生续写" hint="无需重复第二段给定首句" count={wordCount(form.studentParagraph2)}><textarea rows={8} value={form.studentParagraph2} onChange={e => update("studentParagraph2", e.target.value)} placeholder="粘贴第二段学生原创内容……"/></EditorCard></div>
      {error && <div className="error-banner">{error}</div>}
    </div><aside className="check-panel"><div className="readiness"><span>{checks.filter(x => x.ok).length}</span><small>/4 项就绪</small></div><h3>提交前检查</h3>{checks.map(x => <div className={`check-row ${x.ok ? "ok" : ""}`} key={x.label}><span>{x.ok ? "✓" : "·"}</span>{x.label}</div>)}<div className="word-summary"><span>学生原创词数</span><b>{wordCount(form.studentParagraph1) + wordCount(form.studentParagraph2)}</b><small>建议约 150 词</small></div><div className="privacy-note"><b>隐私提示</b><p>请删除姓名、学校、班级等个人信息。</p></div></aside></div>
    <div className="sticky-actions"><div><span className="save-dot">●</span>{savedAt ? `${savedAt} 已保存草稿` : "输入后自动保存草稿"}<button onClick={clear}>清空</button></div><button disabled={!ready} className="btn btn-primary" onClick={next}>解析并确认 <span>→</span></button></div>
  </div>;
}

function EditorCard({ index, title, hint, count, children }: { index: string; title: string; hint: string; count: number; children: React.ReactNode }) { return <label className="editor-card"><div className="editor-head"><span>{index}</span><div><b>{title}</b><p>{hint}</p></div><small>{count} words</small></div>{children}</label>; }
function LockedRow({ label, value }: { label: string; value: string }) { return <div className={`locked-row ${value ? "found" : ""}`}><span>{label}</span><p>{value || "等待识别……"}</p><i>{value ? "已锁定" : "未识别"}</i></div>; }

function Confirm({ parsed, setParsed, back, next }: { parsed: ParsedEssay; setParsed: (p: ParsedEssay) => void; back: () => void; next: () => void }) { const fields: [keyof ParsedEssay, string, boolean][] = [["sourceText", "阅读原文", false], ["starter1", "第一段固定首句", true], ["studentParagraph1", "第一段学生原创", false], ["starter2", "第二段固定首句", true], ["studentParagraph2", "第二段学生原创", false]]; return <div className="confirm-page page-width"><p className="eyebrow">步骤 2 / 3</p><h1>确认内容边界</h1><p>这是评分准确性的关键一步。请确认两句段首语没有被算入学生原创。</p><div className="confirm-grid">{fields.map(([key, label, locked], i) => <label className={`editor-card ${i === 0 ? "wide" : ""}`} key={key}><div className="editor-head"><div><b>{label}</b></div>{locked && <i className="lock-badge">锁定内容</i>}</div><textarea rows={i === 0 ? 7 : 5} value={parsed[key]} onChange={e => setParsed({ ...parsed, [key]: e.target.value })}/></label>)}</div><div className="confirm-actions"><button className="btn btn-ghost" onClick={back}>← 返回修改</button><button className="btn btn-primary" onClick={next}>确认并开始评测 →</button></div></div>; }
function Progress({ active, done }: { active: string; done: string[] }) { return <div className="progress-page page-width"><div className="orb"/><p className="eyebrow">正在评测</p><h1>先理解故事，再判断分数</h1><p>系统正在沿着你的评分逻辑逐步形成报告。</p><div className="progress-list">{stages.map(s => <div className={active === s.key ? "active" : done.includes(s.key) ? "done" : ""} key={s.key}><span>{done.includes(s.key) ? "✓" : "·"}</span>{s.label}</div>)}</div></div>; }
function Footer() { return <footer>EssayFlow · AI 反馈仅作学习参考 · 请勿提交个人敏感信息</footer>; }

# EssayFlow｜高中英语读后续写评测与辅导

EssayFlow 是一个独立重构的作品集 Demo，不是任何原公司系统或官方产品。它帮助高中生把“一个分数”变成有原文和作文证据支撑、可执行、可复盘的写作反馈。

## 核心体验

完整主链路为：粘贴完整题目并提交 P1/P2 → 系统自动提取原文和两句段首语 → 用户确认内容边界 → 内容判档与语言档内定分 → 报告 → 修改复评。解决矛盾、文本衔接、主题升华、情节合理性四项内容标准共同决定档位；语言整体表现决定该档内的具体分数。总分 25 分，但不采用“五维各 5 分”相加。

系统严格区分原文、固定首句与学生原创，并以 Zod 验证边界数据。评测先综合四项内容标准判档，再通读学生原创语言的准确性、清晰度、自然度、流畅度、丰富性及叙事支撑效果，决定档内高、中、低位。系统不机械统计硬性错误数量，也不设置审核 Prompt；固定首句始终锁定且不参与语言纠错。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。未配置 API Key 时自动使用明确标注的 Mock 演示数据，完整链路仍可运行。

真实模型接入：复制 `.env.example` 为 `.env.local`，配置 `OPENAI_API_KEY`、可选的 `OPENAI_BASE_URL` 和 `OPENAI_MODEL`。统一 OpenAI-compatible Provider 已位于 `lib/providers`；生产化时应让各节点通过 Provider 返回 JSON，并逐个使用现有 Zod Schema 校验。当前 MVP 为保证离线、稳定演示，API 主链路使用确定性 Mock 节点。

## 工程命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`evals/cases.json` 包含 12 个自编评测场景索引。没有真实模型运行时，本项目不会伪造准确率。

## 隐私设计

- 不含真实学生作文、内部地址、公司 Prompt 或密钥。
- 页面提示不要提交姓名、学校等信息。
- MVP 不实现账户和数据库，服务端也不记录完整作文，刷新即清除。
- API Key 仅从环境变量读取；`.env*` 默认被 Git 忽略。

## 技术栈与结构

Next.js、React、TypeScript、Tailwind CSS、Zod、Vitest、OpenAI-compatible SDK。页面与路由在 `app/`，UI 在 `components/`，数据契约、节点、编排、Provider 和 Rubric 分别置于 `lib/` 对应目录。详细说明见 `docs/architecture.md`。

## 已知限制与路线图

MVP 不含登录、支付、班级、文件上传或永久存储。真实 Provider 接口已经预留，但实时多模型节点调用需要部署者配置 Key 并补充面向具体模型的 Schema retry adapter。下一步包括：完整修订差异视图、SQLite 可选本地历史、DOCX/PDF 导入、流式节点进度、真实模型 eval 基线与可访问性审计。

## 部署

可直接部署到支持 Next.js 的 Node 平台。构建命令 `npm run build`，启动命令 `npm start`；Mock 模式无需环境变量。若启用真实模型，只在部署平台的 Secret 管理中保存密钥。

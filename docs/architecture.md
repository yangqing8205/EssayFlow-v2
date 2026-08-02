# 架构与重构边界

## 对原工作流的结构化理解

根据需求文本（未收到实际 DSL、公司 Prompt 或截图），当前公开流程抽象为：输入解析 → 用户确认内容边界 → 故事理解与语言整体诊断 → 四项内容共同判档 → 语言表现决定档内分 → 报告整形 → 修订版本比较。可借鉴的是职责分离、结构化中间态、证据约束和人工确认点。评分不采用五维各 5 分相加，不统计硬性错误数量，也不设置审核 Prompt。

## 不可公开复用的内容

公司原始 Prompt、内部节点 ID 与名称、私有知识库、业务阈值、MCP 地址、真实学生文本、内部链接和版本记录均不进入本项目。本仓库只含重新设计的通用 Rubric、自编示例和公开风格接口。

## 数据流

```text
EssayInput → ParsedEssay（用户确认） → StoryAnalysis + LanguageAnalysis
→ 四项内容标准共同判档 → 语言整体表现决定档内分 → ScoreReport → FinalReport
→ 修订提交 → RevisionComparison
```

页面只消费结构化结果；评分规则位于 `lib/rubrics`，模型入口位于 `lib/providers`，节点位于 `lib/agents`，编排位于 `lib/workflow`。

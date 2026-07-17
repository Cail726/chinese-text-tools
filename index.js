#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ─── Zod 输入校验 ───────────────────────────────
const AnalyzeTextSchema = z.object({
  text: z.string().min(1, "文本不能为空"),
});

const GenerateOutlineSchema = z.object({
  topic: z.string().min(1, "主题不能为空"),
  type: z.enum(["paper", "novel", "business"]).default("paper"),
  detailLevel: z.enum(["brief", "medium", "detailed"]).default("detailed"),
});

const FormatGbt7714Schema = z.object({
  authors: z.string().min(1, "作者不能为空"),
  title: z.string().min(1, "标题不能为空"),
  journal: z.string().min(1, "期刊/出版社/学校不能为空"),
  year: z.string().min(1, "年份不能为空"),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().optional(),
  accessDate: z.string().optional(),
  type: z.enum(["journal", "book", "thesis", "patent", "standard", "online", "conference"]).default("journal"),
});

const CountFrequencySchema = z.object({
  text: z.string().min(1, "文本不能为空"),
  topN: z.number().int().min(1).max(500).default(20),
});

// ─── 中文文本分析 ───────────────────────────────
function analyzeText(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const chinesePuncts = (text.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const digits = (text.match(/\d+/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;

  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  const readingTimeMin = Math.ceil(
    (chineseChars + chinesePuncts) / 400 + englishWords / 200
  );

  const editorWordCount = chineseChars + chinesePuncts;
  const avgParagraphLen = paragraphs.length > 0 ? Math.round(editorWordCount / paragraphs.length) : 0;

  return {
    editorWordCount,
    chineseChars,
    chinesePuncts,
    englishWords,
    digits,
    totalChars,
    paragraphCount: paragraphs.length,
    lineCount: lines.length,
    avgParagraphLen,
    estimatedReadingTimeMin: readingTimeMin,
  };
}

// ─── 生成大纲 ───────────────────────────────
function generateOutline(topic, type, detailLevel) {
  const templates = {
    paper: {
      title: `论文大纲：${topic}`,
      sections: [
        { level: 1, title: "摘要", desc: "研究背景、方法、结果、结论的简要概括（300字以内）" },
        { level: 1, title: "1. 引言", desc: `阐述"${topic}"的研究背景与意义，国内外研究现状，本文研究内容与创新点` },
        { level: 2, title: "1.1 研究背景与意义", desc: "为什么这个问题值得研究" },
        { level: 2, title: "1.2 国内外研究现状", desc: "前人的工作存在哪些不足" },
        { level: 2, title: "1.3 本文研究内容", desc: "本文要解决什么问题，用什么方法" },
        { level: 1, title: "2. 相关理论基础", desc: "介绍本文涉及的核心理论与技术" },
        { level: 1, title: "3. 研究方法/模型设计", desc: "详细描述你的方法或模型架构" },
        { level: 2, title: "3.1 数据来源与预处理", desc: "数据从哪来，怎么清洗" },
        { level: 2, title: "3.2 模型/方法描述", desc: "核心算法或框架" },
        { level: 1, title: "4. 实验与分析", desc: "实验设置、结果展示、对比分析" },
        { level: 2, title: "4.1 实验设置", desc: "环境、参数、评价指标" },
        { level: 2, title: "4.2 实验结果", desc: "表格和图表展示" },
        { level: 2, title: "4.3 结果分析", desc: "为什么是这个结果，意味着什么" },
        { level: 1, title: "5. 结论与展望", desc: "总结全文工作，指出不足与未来方向" },
        { level: 1, title: "参考文献", desc: "按 GB/T 7714 格式列出所有引用文献" },
      ],
    },
    novel: {
      title: `小说大纲：${topic}`,
      sections: [
        { level: 1, title: "一、核心设定", desc: "世界观、时代背景、力量体系/社会规则" },
        { level: 2, title: "世界观", desc: "故事发生的世界是怎样的" },
        { level: 2, title: "核心冲突", desc: "推动故事的主要矛盾" },
        { level: 1, title: "二、人物设定", desc: "主角、配角、反派的基本信息与人物弧光" },
        { level: 2, title: "主角", desc: "姓名、性格、目标、成长轨迹" },
        { level: 2, title: "重要配角", desc: "至少3个，各自的功能与关系" },
        { level: 2, title: "反派/对立面", desc: "动机、手段、与主角的关系" },
        { level: 1, title: "三、故事结构", desc: "起承转合 / 三幕结构" },
        { level: 2, title: "开篇（10%）", desc: "引入主角、世界观、日常状态" },
        { level: 2, title: "激励事件（15%）", desc: "打破日常，主角被迫行动" },
        { level: 2, title: "发展（25%-75%）", desc: "主角成长、遭遇挫折、获得资源" },
        { level: 2, title: "高潮（80%）", desc: "最终对决/最大冲突" },
        { level: 2, title: "结局（90%-100%）", desc: "收尾、留白、主题升华" },
        { level: 1, title: "四、章节规划", desc: "每章的核心事件与字数预估" },
        { level: 1, title: "五、伏笔与回收", desc: "提前埋下的线索及其回收节点" },
      ],
    },
    business: {
      title: `商业计划书大纲：${topic}`,
      sections: [
        { level: 1, title: "一、执行摘要", desc: "1-2页概括整个计划，投资人最先看的部分" },
        { level: 1, title: "二、项目背景与市场分析", desc: "行业现状、市场规模、增长趋势" },
        { level: 2, title: "目标市场", desc: "目标用户画像、市场规模（TAM/SAM/SOM）" },
        { level: 2, title: "竞争分析", desc: "竞品对比表格、差异化优势" },
        { level: 1, title: "三、产品与服务", desc: "核心功能、技术架构、用户价值" },
        { level: 1, title: "四、商业模式", desc: "怎么赚钱：定价策略、收入来源、成本结构" },
        { level: 1, title: "五、营销策略", desc: "获客渠道、推广方案、用户增长路径" },
        { level: 1, title: "六、团队介绍", desc: "核心成员背景与分工" },
        { level: 1, title: "七、财务预测", desc: "3-5年收入预测、成本预测、盈亏平衡点" },
        { level: 1, title: "八、融资需求", desc: "需要多少钱、用在哪、出让多少股份" },
        { level: 1, title: "九、风险与应对", desc: "主要风险及应对措施" },
      ],
    },
  };

  const template = templates[type] || templates.paper;
  const maxLevel = detailLevel === "detailed" ? 3 : detailLevel === "medium" ? 2 : 1;

  return {
    ...template,
    sections: template.sections.filter((s) => s.level <= maxLevel),
    generatedFor: topic,
    detailLevel,
    note: "这是结构化模板，请根据实际情况调整内容",
  };
}

// ─── GB/T 7714 参考文献格式化 ──────────────────
function optional(prefix, value, suffix = "") {
  return value ? `${prefix}${value}${suffix}` : "";
}

function formatGbt7714({ authors, title, journal, year, volume, issue, pages, doi, url, accessDate, type }) {
  const authorStr = Array.isArray(authors) ? authors.join("; ") : authors;
  const volIssue = volume ? `${volume}${optional("(", issue, ")")}` : "";

  const formats = {
    journal: `${authorStr}. ${title}[J]. ${journal}, ${year}${optional(", ", volIssue)}${optional(": ", pages)}.`,
    book: `${authorStr}. ${title}[M]. ${journal}, ${year}.`,
    thesis: `${authorStr}. ${title}[D]. ${journal}, ${year}.`,
    patent: `${authorStr}. ${title}[P]. ${year}.`,
    standard: `${authorStr}. ${title}[S]. ${journal}, ${year}.`,
    online: `${authorStr}. ${title}[EB/OL]. (${year})[${accessDate || "引用日期"}]${optional(". ", url)}.`,
    conference: `${authorStr}. ${title}[C]. ${journal}, ${year}${optional(": ", pages)}.`,
  };

  let result = formats[type] || formats.journal;
  if (doi) result += ` DOI: ${doi}.`;
  if (url && type !== "online") result += ` ${url}.`;
  return result;
}

// ─── 字频统计 ───────────────────────────────
function countFrequency(text, topN = 20) {
  const chineseOnly = text.match(/[\u4e00-\u9fff]/g) || [];
  const freq = {};
  for (const char of chineseOnly) {
    freq[char] = (freq[char] || 0) + 1;
  }
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([char, count]) => ({ char, count, percentage: ((count / chineseOnly.length) * 100).toFixed(2) + "%" }));

  return {
    totalChineseChars: chineseOnly.length,
    uniqueChars: Object.keys(freq).length,
    topFrequent: sorted,
  };
}

// ─── 创建 MCP Server ──────────────────────────
function createMcpServer() {
  const server = new Server(
    { name: "chinese-text-tools", version: "1.0.3" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "analyze_text",
        description:
          "分析中文/英文混合文本。返回 editorWordCount（与番茄/作家助手对齐的字数）、段落数、平均段长、预估阅读时间。适用于小说章节、论文章节的快速评估。",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "要分析的文本内容" },
          },
          required: ["text"],
        },
      },
      {
        name: "generate_outline",
        description:
          "根据主题生成结构化大纲。支持三种类型：paper（学术论文）、novel（小说）、business（商业计划书）。支持三级详细程度：brief（仅一级标题）、medium（二级）、detailed（三级）。",
        inputSchema: {
          type: "object",
          properties: {
            topic: { type: "string", description: "主题/标题" },
            type: {
              type: "string",
              enum: ["paper", "novel", "business"],
              description: "大纲类型，默认 paper",
            },
            detailLevel: {
              type: "string",
              enum: ["brief", "medium", "detailed"],
              description: "详细程度，默认 detailed",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "format_gbt7714",
        description:
          "将文献信息格式化为 GB/T 7714-2015 标准引用格式（中文毕业论文通用格式）。支持期刊论文、图书、学位论文、专利、标准、在线资源、会议论文。",
        inputSchema: {
          type: "object",
          properties: {
            authors: { type: "string", description: "作者，多人用分号分隔，如 '张三; 李四'" },
            title: { type: "string", description: "文献标题" },
            journal: { type: "string", description: "期刊名/出版社/学校名" },
            year: { type: "string", description: "出版年份" },
            volume: { type: "string", description: "卷号（期刊论文）" },
            issue: { type: "string", description: "期号（期刊论文）" },
            pages: { type: "string", description: "页码，如 '45-50'" },
            doi: { type: "string", description: "DOI 号" },
            url: { type: "string", description: "网址（在线资源）" },
            accessDate: { type: "string", description: "引用日期，如 '2025-07-17'（在线资源）" },
            type: {
              type: "string",
              enum: ["journal", "book", "thesis", "patent", "standard", "online", "conference"],
              description: "文献类型，默认 journal",
            },
          },
          required: ["authors", "title", "journal", "year"],
        },
      },
      {
        name: "count_frequency",
        description:
          "统计中文文本的字频分布。用于分析写作风格、检测重复用词、优化文本表达。默认返回前20个高频字。",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "要分析的文本" },
            topN: { type: "number", description: "返回前N个高频字，默认20" },
          },
          required: ["text"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "analyze_text": {
        const parsed = AnalyzeTextSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `参数错误：${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}` }],
            isError: true,
          };
        }
        const result = analyzeText(parsed.data.text);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "generate_outline": {
        const parsed = GenerateOutlineSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `参数错误：${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}` }],
            isError: true,
          };
        }
        const { topic, type, detailLevel } = parsed.data;
        const result = generateOutline(topic, type, detailLevel);
        let output = `# ${result.title}\n\n`;
        output += `> 类型: ${type} | 详细程度: ${result.detailLevel}\n`;
        output += `> ${result.note}\n\n`;
        for (const sec of result.sections) {
          const prefix = sec.level === 1 ? "\n## " : sec.level === 2 ? "### " : "#### ";
          output += `${prefix}${sec.title}\n`;
          output += `*${sec.desc}*\n\n`;
        }
        return { content: [{ type: "text", text: output }] };
      }

      case "format_gbt7714": {
        const parsed = FormatGbt7714Schema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `参数错误：${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}` }],
            isError: true,
          };
        }
        const result = formatGbt7714(parsed.data);
        return { content: [{ type: "text", text: result }] };
      }

      case "count_frequency": {
        const parsed = CountFrequencySchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `参数错误：${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}` }],
            isError: true,
          };
        }
        const { text, topN } = parsed.data;
        const result = countFrequency(text, topN);
        let output = `总中文字符: ${result.totalChineseChars}\n`;
        output += `不重复字符: ${result.uniqueChars}\n\n高频字 Top ${topN}:\n`;
        for (const item of result.topFrequent) {
          output += `  ${item.char} — ${item.count}次 (${item.percentage})\n`;
        }
        const overused = result.topFrequent.filter(
          (item) => parseFloat(item.percentage) > 3
        );
        if (overused.length > 0) {
          output += `\n⚠ 以下字占比超过 3%，可能存在过度使用：\n`;
          for (const item of overused) {
            output += `  ${item.char} (${item.percentage}) — 建议检查替换\n`;
          }
        }
        return { content: [{ type: "text", text: output }] };
      }

      default:
        return {
          content: [{ type: "text", text: `错误：未知工具 "${name}"。可用工具：analyze_text, generate_outline, format_gbt7714, count_frequency` }],
          isError: true,
        };
    }
  });

  return server;
}

// ─── 启动模式选择 ─────────────────────────────
const MODE = process.argv.includes("--http") || process.env.MCP_HTTP === "true" ? "http" : "stdio";
const rawPort = parseInt(process.env.PORT || "3000", 10);
const PORT = Number.isNaN(rawPort) || rawPort < 1 || rawPort > 65535 ? 3000 : rawPort;
const HOST = process.env.HOST || "127.0.0.1";

async function startStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("中文文本工具 MCP Server (stdio) 已启动");
}

async function startHttp() {
  const app = createMcpExpressApp({ host: HOST });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", name: "chinese-text-tools", version: "1.0.3" });
  });

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  app.post("/mcp", async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP 请求处理失败:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP GET 请求处理失败:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return new Promise((resolve, reject) => {
    const httpServer = app.listen(PORT, HOST, () => {
      console.error(`中文文本工具 MCP Server (HTTP) 已启动 → http://${HOST}:${PORT}/mcp`);
      console.error(`健康检查: http://${HOST}:${PORT}/health`);
      resolve();
    });
    httpServer.on("error", (err) => {
      console.error("HTTP 服务器启动失败:", err.message);
      reject(err);
    });
  });
}

try {
  if (MODE === "http") {
    await startHttp();
  } else {
    await startStdio();
  }
} catch (err) {
  console.error("MCP Server 启动失败:", err.message);
  process.exit(1);
}

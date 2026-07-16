# chinese-text-tools

> Claude Code 中文写作四合一工具箱 — 文本分析 · 大纲生成 · 引用格式 · 字频统计

[![npm version](https://img.shields.io/npm/v/chinese-text-tools)](https://www.npmjs.com/package/chinese-text-tools)
[![GitHub stars](https://img.shields.io/github/stars/Cail726/chinese-text-tools)](https://github.com/Cail726/chinese-text-tools)
[![AgentStore](https://img.shields.io/badge/AgentStore-install-blue)](https://agentstore.tools)

## 安装

### 方式一：AgentStore 一键安装（推荐）
```bash
agentstore install cail726.chinese-text-tools
```

### 方式二：npx 直接运行
```bash
claude mcp add chinese-text-tools -- npx chinese-text-tools
```

或者手动配置 `.mcp.json`：

```json
{
  "mcpServers": {
    "chinese-text-tools": {
      "command": "npx",
      "args": ["chinese-text-tools"]
    }
  }
}
```

### 方式三：克隆源码
```bash
git clone https://github.com/Cail726/chinese-text-tools.git
cd chinese-text-tools
npm install
node index.js
```

## 四个工具

| 工具 | 功能 | 适用场景 |
|------|------|---------|
| `analyze_text` | 文本分析：字数、段落、平均段长、阅读时间 | 小说章节评估、论文摘要检查 |
| `generate_outline` | 结构化大纲生成（论文/小说/商业计划书） | 写作前规划框架 |
| `format_gbt7714` | GB/T 7714-2015 参考文献格式化 | 毕业论文引用一键生成 |
| `count_frequency` | 中文字频统计 | 检查用词重复、分析写作风格 |

## 使用示例

### 分析文本
> "帮我分析一下这段小说的字数和节奏"

Claude 会调用 `analyze_text`，返回：中文字数（对齐番茄作家助手）、段落数、平均段长、预估阅读时间。

### 生成大纲
> "帮我生成一篇关于'深度学习在医疗影像中的应用'的论文大纲"

支持三种类型：`paper`（论文）、`novel`（小说）、`business`（商业计划书）。

### 格式化引用
> "帮我把这篇文献转成 GB/T 7714 格式：作者张三、李四，计算机学报，2025年"

自动输出符合国标的引用格式，支持期刊、图书、学位论文、专利、在线资源等七种类型。

### 字频分析
> "帮我看看这篇文章有没有用词重复的问题"

统计中文高频字排名，快速发现"的的的"、"了了了"等写作问题。

## 技术栈

- Node.js + @modelcontextprotocol/sdk
- 纯本地运行，不联网，数据不出设备

## License

MIT

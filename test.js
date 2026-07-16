// MCP Server 全面检验脚本
const testCases = [];

// ─── 测试 1: analyze_text - 正常中文 ───
testCases.push({
  name: "analyze_text - 正常中文段落",
  req: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "analyze_text", arguments: { text: "今天天气很好，我和朋友去公园散步。公园里有很多花，红的、黄的、白的，非常漂亮。我们走了大概两个小时，拍了很多照片。中午在附近的面馆吃了一碗牛肉面，味道不错。" } } }
});

// ─── 测试 2: analyze_text - 空文本 ───
testCases.push({
  name: "analyze_text - 空文本（边界测试）",
  req: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "analyze_text", arguments: { text: "" } } }
});

// ─── 测试 3: analyze_text - 英文混合 ───
testCases.push({
  name: "analyze_text - 中英混合 + 数字",
  req: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "analyze_text", arguments: { text: "本文使用 Python 3.11 和 PyTorch 2.0 实现了基于 Transformer 的模型。在 NLP 任务上取得了 95.6% 的准确率。" } } }
});

// ─── 测试 4: generate_outline - 小说模式 ───
testCases.push({
  name: "generate_outline - 小说大纲",
  req: { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "generate_outline", arguments: { topic: "穿越异世界成为炼药师", type: "novel", detailLevel: "medium" } } }
});

// ─── 测试 5: generate_outline - 商业计划书 ───
testCases.push({
  name: "generate_outline - 商业计划书",
  req: { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "generate_outline", arguments: { topic: "AI 校园共享打印服务", type: "business", detailLevel: "brief" } } }
});

// ─── 测试 6: format_gbt7714 - 学位论文 ───
testCases.push({
  name: "format_gbt7714 - 学位论文引用",
  req: { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "format_gbt7714", arguments: { authors: "李明", title: "基于深度学习的图像识别方法研究", journal: "清华大学", year: "2024", type: "thesis" } } }
});

// ─── 测试 7: format_gbt7714 - 在线资源 ───
testCases.push({
  name: "format_gbt7714 - 在线资源引用",
  req: { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "format_gbt7714", arguments: { authors: "OpenAI", title: "GPT-4 Technical Report", journal: "arXiv", year: "2024", url: "https://arxiv.org/abs/2303.08774", type: "online" } } }
});

// ─── 测试 8: count_frequency - 正常文本 ───
testCases.push({
  name: "count_frequency - 小说开头字频分析",
  req: { jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "count_frequency", arguments: { text: "夜色如墨，天空中没有一颗星星。林峰独自走在回家的路上，心里想着白天发生的事情。他不知道的是，身后有一双眼睛正在黑暗中注视着他。那是一个穿着黑色风衣的男人，他的手里握着一把闪着寒光的匕首。", topN: 10 } } }
});

// ─── 测试 9: 未知工具名（错误处理） ───
testCases.push({
  name: "错误处理 - 未知工具",
  req: { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "nonexistent_tool", arguments: {} } }
});

// ─── 测试 10: tools/list ───
testCases.push({
  name: "工具列表",
  req: { jsonrpc: "2.0", id: 10, method: "tools/list" }
});

// 运行所有测试
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

async function runTest(tc) {
  return new Promise((resolve) => {
    const child = spawn("node", ["index.js"], { cwd: __dirname });
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (d) => { output += d.toString(); });
    child.stderr.on("data", (d) => { errorOutput += d.toString(); });

    child.stdin.write(JSON.stringify(tc.req) + "\n");
    child.stdin.end();

    child.on("close", (code) => {
      try {
        const lines = output.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);

        if (result.error) {
          console.log(`  ❌ ${tc.name}: ${result.error.message || JSON.stringify(result.error)}`);
          failed++;
        } else {
          console.log(`  ✅ ${tc.name}`);
          passed++;
        }
      } catch (e) {
        console.log(`  ❌ ${tc.name}: 解析失败 - ${e.message}`);
        console.log(`     原始输出: ${output.substring(0, 200)}`);
        failed++;
      }
      resolve();
    });
  });
}

console.log("\n🔍 MCP Server 全面检验\n");
console.log("=" .repeat(50));

for (const tc of testCases) {
  await runTest(tc);
}

console.log("=" .repeat(50));
console.log(`\n📊 结果: ${passed} 通过 / ${passed + failed} 总计`);
if (failed === 0) {
  console.log("🎉 全部通过！可以上架。\n");
} else {
  console.log(`⚠️ ${failed} 个失败，需要修复。\n`);
}

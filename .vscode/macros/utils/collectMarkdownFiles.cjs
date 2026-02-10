const fs = require("fs");
const path = require("path");

function collectMarkdownFiles(rootDir) {
  const result = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    let entries;

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      // 読み取り不可ディレクトリはスキップ
      continue;
    }

    for (const entry of entries) {
      // 隠しディレクトリなどを簡易除外（必要なければ消して OK）
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

/**
 * 現在開いているファイルのディレクトリ配下の .md すべてに対して
 * embedLinkedFileContents を順番に実行する
 */

module.exports = { collectMarkdownFiles };

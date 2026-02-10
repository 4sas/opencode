const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function applyLinkedFileContentsFromDocument(document, { quiet = false } = {}) {
  // Markdown のみ対象
  if (document.languageId && document.languageId !== "markdown") {
    if (!quiet) vscode.window.showInformationMessage("This macro targets Markdown documents only.");
    return { hit: 0, updated: 0, created: 0, skipped: 0, warnings: ["Skip non-markdown document"] };
  }

  const original = document.getText();
  if (!original) return { hit: 0, updated: 0, created: 0, skipped: 0, warnings: [] };

  const docDir = path.dirname(document.uri.fsPath);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const writeRoot = workspaceFolder ? workspaceFolder.uri.fsPath : docDir;

  const eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";

  // EmbedLinkedFileContents と同じ検出条件（見出しリンク + 直下コードフェンス）
  const pattern = new RegExp(
    String.raw`(^#{1,6}\s+\[[^\]]+\]\((.*?)\)[^\r\n]*\r?\n(?:[ \t]*\r?\n)*)` +
      String.raw`([ \t]*)(([\x60~])\5{2,})[ \t]*([^\r\n]*)\r?\n` +
      String.raw`([\s\S]*?)^[ \t]*\5{3,}[ \t]*(?=\r?\n|$)`,
    "gm"
  );

  const warnings = [];
  let hit = 0;
  let updated = 0;
  let created = 0;
  let skipped = 0;

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isSubPath = (root, target) => {
    const rootNorm = path.resolve(root);
    const targetNorm = path.resolve(target);
    const rel = path.relative(rootNorm, targetNorm);
    return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
  };

  const matches = [...original.matchAll(pattern)];
  for (const m of matches) {
    // m[2] = link path
    let rawPath = (m[2] || "").trim();
    const bodyRaw = m[7] ?? "";

    // "(url \"title\")" のようなタイトル併記は URL 部だけに
    rawPath = rawPath.split(/\s+/)[0];

    if (!rawPath) {
      skipped++;
      continue;
    }

    hit++;

    // URL は対象外（ローカルファイルのみ）
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawPath)) {
      warnings.push(`Skip non-file URL: ${rawPath}`);
      skipped++;
      continue;
    }

    const resolved = path.isAbsolute(rawPath) ? path.normalize(rawPath) : path.normalize(path.join(docDir, rawPath));

    // 安全策: ワークスペース/ドキュメント配下のみ書き込み可
    if (!isSubPath(writeRoot, resolved) && path.resolve(writeRoot) !== path.resolve(resolved)) {
      warnings.push(`Skip out-of-root path: ${resolved}`);
      skipped++;
      continue;
    }

    const body = bodyRaw.replace(/\r?\n/g, eol);

    try {
      const exists = fs.existsSync(resolved);
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, body, "utf8");
      if (exists) updated++;
      else created++;
    } catch (e) {
      warnings.push(`Cannot write file: ${resolved}`);
    }
  }

  return { hit, updated, created, skipped, warnings };
}

module.exports = { applyLinkedFileContentsFromDocument };

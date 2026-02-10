const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function embedLinkedFileContents() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return "Editor is not opening.";
  const document = editor.document;

  // Markdownのみ対象（情報表示 → 警告に変更してもよいなら下行を showWarningMessage に）
  if (document.languageId && document.languageId !== "markdown") {
    vscode.window.showInformationMessage("This macro targets Markdown documents only.");
    return;
  }

  const original = document.getText();
  if (!original) return;

  const docDir = path.dirname(document.uri.fsPath);
  const eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";

  /**
   * キャプチャ:
   *  1: 見出し〜空行（複数可）を含むブロック
   *  2: リンクURL部（最短一致）
   *  3: コードフェンスのインデント
   *  4: 開きフェンス全文（例: ``` / ~~~~~）
   *  5: フェンス記号（` or ~）
   *  6: 言語/情報文字列（先頭の空白は除去して保持）
   *  7: 既存ブロック中身
   *
   * 閉じフェンス: 行頭の空白任意 + (5と同じ記号){3,}
   */
  const pattern = new RegExp(
    // 見出し行: `## [name](path)` を含む。末尾に追記あってもOK。直後の空行は 0〜n 行。
    String.raw`(^#{1,6}\s+\[[^\]]+\]\((.*?)\)[^\r\n]*\r?\n(?:[ \t]*\r?\n)*)` +
      // 開きフェンス行: インデント + ``` or ~~~（3本以上）。言語は任意。
      String.raw`([ \t]*)(([\x60~])\5{2,})[ \t]*([^\r\n]*)\r?\n` +
      // 本文（最短一致） + 閉じフェンス（同じ記号、3本以上）
      String.raw`([\s\S]*?)^[ \t]*\5{3,}[ \t]*(?=\r?\n|$)`,
    "gm"
  );

  const warnings = [];
  let hit = 0,
    replacedAny = false;

  const replaced = original.replace(pattern, (match, headerWithLinkBlock, rawPath, indent, openFence, fenceChar, lang, _body) => {
    hit++;

    let filePath = (rawPath || "").trim();

    // <path> 形式を許容
    if (filePath.startsWith("<") && filePath.endsWith(">")) {
      filePath = filePath.slice(1, -1);
    }
    // "(url \"title\")" のようなタイトル併記は URL 部だけに
    filePath = filePath.split(/\s+/)[0];

    const resolved = path.isAbsolute(filePath) ? filePath : path.normalize(path.join(docDir, filePath));

    let fileContent;
    try {
      fileContent = fs.readFileSync(resolved, "utf8");
    } catch (e) {
      warnings.push(`Cannot read file: ${resolved}`);
      return match; // 読めない場合は変更しない
    }

    // BOM 除去
    if (fileContent.charCodeAt(0) === 0xfeff) fileContent = fileContent.slice(1);

    // 改行を編集中ドキュメントの EOL に統一
    fileContent = fileContent.replace(/\r\n|\r|\n/g, eol);
    if (!fileContent.endsWith(eol)) fileContent += eol;

    replacedAny = true;
    const langOut = lang ? lang.trim() : "";
    // フェンスは開きの文字列(openFence)をそのまま再利用（本数/記号を保持）
    return `${headerWithLinkBlock}${indent}${openFence}${langOut}${eol}${fileContent}${indent}${openFence}`;
  });

  if (replacedAny) {
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(original.length));
    editor.edit((eb) => eb.replace(fullRange, replaced));
  }

  // 表示仕様：エラーではなく警告
  if (!hit) {
    vscode.window.showWarningMessage("置換対象の '## [name](path)' + コードフェンス（``` または ~~~）が見つかりませんでした。");
  } else if (warnings.length) {
    vscode.window.showWarningMessage(`更新: ${replacedAny ? "あり" : "なし"} / 警告: ${warnings.length}件 - ${warnings.join(" / ")}`);
  } else {
    vscode.window.showInformationMessage(`更新: ${replacedAny ? "あり" : "なし"} / 警告: 0件`);
  }
}

module.exports = { embedLinkedFileContents };

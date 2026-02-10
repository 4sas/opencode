const vscode = require("vscode");
const { applyLinkedFileContentsFromDocument } = require("../utils/linkedFileContents.cjs");

function applyLinkedFileContents() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return "Editor is not opening.";
  const document = editor.document;

  const result = applyLinkedFileContentsFromDocument(document, { quiet: false });

  if (!result.hit) {
    vscode.window.showWarningMessage("反映対象の '## [name](path)' + コードフェンス（``` または ~~~）が見つかりませんでした。");
    return;
  }

  const summary = `更新: ${result.updated} / 新規作成: ${result.created} / スキップ: ${result.skipped} / 警告: ${result.warnings.length}`;
  if (result.warnings.length) {
    vscode.window.showWarningMessage(`${summary} - ${result.warnings.join(" / ")}`);
  } else {
    vscode.window.showInformationMessage(summary);
  }
}

module.exports = { applyLinkedFileContents };

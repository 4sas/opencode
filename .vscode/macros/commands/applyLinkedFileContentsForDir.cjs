const vscode = require("vscode");
const path = require("path");
const { collectMarkdownFiles } = require("../utils/collectMarkdownFiles.cjs");
const { applyLinkedFileContentsFromDocument } = require("../utils/linkedFileContents.cjs");

function applyLinkedFileContentsForDir() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    vscode.window.showErrorMessage("アクティブなエディタがありません。");
    return;
  }

  const originalUri = activeEditor.document.uri;
  const baseDir = path.dirname(originalUri.fsPath);

  const targets = collectMarkdownFiles(baseDir);
  if (!targets.length) {
    vscode.window.showInformationMessage(`"${baseDir}" 配下に .md ファイルが見つかりませんでした。`);
    return;
  }

  let index = 0;
  let processed = 0;
  let failed = 0;

  let totalUpdated = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalWarnings = 0;

  const runNext = () => {
    if (index >= targets.length) {
      vscode.window.showInformationMessage(`applyLinkedFileContentsForDir: ${processed}/${targets.length} ファイル処理 / 更新 ${totalUpdated} / 新規作成 ${totalCreated} / スキップ ${totalSkipped} / 警告 ${totalWarnings} / エラー ${failed}`);
      return;
    }

    const filePath = targets[index++];

    vscode.workspace.openTextDocument(filePath).then(
      (doc) => {
        try {
          const result = applyLinkedFileContentsFromDocument(doc, { quiet: true });
          processed++;
          totalUpdated += result.updated || 0;
          totalCreated += result.created || 0;
          totalSkipped += result.skipped || 0;
          totalWarnings += (result.warnings || []).length;
        } catch (e) {
          failed++;
        }
        runNext();
      },
      () => {
        failed++;
        runNext();
      }
    );
  };

  runNext();
}

module.exports = { applyLinkedFileContentsForDir };

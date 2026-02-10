const vscode = require("vscode");
const path = require("path");
const { collectMarkdownFiles } = require("../utils/collectMarkdownFiles.cjs");
const { embedLinkedFileContents } = require("./embedLinkedFileContents.cjs");

/**
 * 現在開いているファイルのディレクトリ配下の .md すべてに対して applyLinkedFileContents を順番に実行する
 */
function embedLinkedFileContentsForDir() {
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

  const processNext = () => {
    if (index >= targets.length) {
      // 元のドキュメントに戻す
      vscode.workspace.openTextDocument(originalUri).then((doc) => {
        vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(`embedLinkedFileContents: ${processed} ファイル処理 / エラー ${failed} 件`);
      });
      return;
    }

    const filePath = targets[index++];

    vscode.workspace.openTextDocument(filePath).then(
      (doc) => {
        vscode.window.showTextDocument(doc, { preview: false }).then(
          () => {
            try {
              // 既存の単体マクロをそのまま呼び出し
              embedLinkedFileContents();
              processed++;
            } catch (error) {
              failed++;
            }
            // 次のファイルへ
            processNext();
          },
          () => {
            failed++;
            processNext();
          }
        );
      },
      () => {
        failed++;
        processNext();
      }
    );
  };

  processNext();
}

module.exports = { embedLinkedFileContentsForDir };

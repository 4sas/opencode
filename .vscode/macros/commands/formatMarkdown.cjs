const vscode = require("vscode");

function formatMarkdown() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "Editor is not opening.";
  }

  const document = editor.document;
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
  const text = document.getText();
  if (text.length > 0) {
    let replaced = text.replace(/  +\|/g, " |");
    replaced = replaced.replace(/\|  +/g, "| ");
    replaced = replaced.replace(/----+/g, "---");
    replaced = replaced.replace(/(#+ )\*\*([^\*]+)\*\*/g, "$1$2");
    replaced = replaced.replace(/(#+ )\d+\. (.+)/g, "$1$2");
    replaced = replaced.replace(/\| なし \|/g, "| |");
    replaced = replaced.replace(/(.+) --> ([^：]+)：(.+)/g, "$1 --> $2: $3");
    replaced = replaced.replace(/\[＊\] --> /g, "[*] --> ");
    editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, replaced);
    });
  }
}

module.exports = { formatMarkdown };

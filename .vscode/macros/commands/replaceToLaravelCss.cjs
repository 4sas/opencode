const vscode = require("vscode");

function replaceToLaravelCss() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "Editor is not opening.";
  }

  const document = editor.document;
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
  const text = document.getText();
  if (text.length > 0) {
    let replaced = text.replace(/src\: url\("\.\.(.*)"\)/g, `src: asset("$1")`);
    editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, replaced);
    });
  }
}

module.exports = { replaceToLaravelCss };

const vscode = require("vscode");

function convertDirListToMarkdown() {
  const rawText = getSelectedOrAllText();
  const isWindows = /^PS\s+/m.test(rawText);
  const result = isWindows ? convertWindowsOutput(rawText) : convertUnixOutput(rawText);
  replaceEditorContent(rawText, result);
}

/**
 * Handle PowerShell 'ls -R' output using Windows-specific logic
 * Adapted from working single-block implementation
 */

function convertWindowsOutput(text) {
  const lines = text.split(/\r?\n/);
  const sep = "\\";
  const outputBlocks = [];
  let currentBlock = null;
  let baseDir = "";
  let indent = 0;

  function pushBlock() {
    if (currentBlock) {
      outputBlocks.push(currentBlock.join("\n"));
      currentBlock = null;
    }
  }

  for (const line of lines) {
    // Detect 'ls -R' header
    const cmdMatch = line.match(/^PS\s+(.+?)>\s*ls\s+-R\s+(.+?)\s*$/);
    if (cmdMatch) {
      // finish previous
      pushBlock();
      const workspacePath = cmdMatch[1] || (vscode.workspace.workspaceFolders ? [0].uri.fsPath : "");
      let targetPath = cmdMatch[2] || ".";
      targetPath = targetPath.replace(/^\.\\/, "").replace(/\\+$/, "");
      baseDir = workspacePath + sep + targetPath;
      const displayRoot = `${targetPath}${sep}`;
      currentBlock = [];
      currentBlock.push(`* ${displayRoot.replaceAll("\\", "/")}`);
      indent = 0;
      continue;
    }
    if (!currentBlock) continue;
    // Directory entries
    const dirMatch = line.match(/ディレクトリ: (.+)$/);
    if (dirMatch) {
      const full = dirMatch[1].replace(/\\+$/, "");
      if (full !== baseDir) {
        let rel = full.startsWith(baseDir + sep) ? full.slice(baseDir.length + 1) : full;
        rel = rel.replace(/\\+$/, "");
        if (rel && rel !== ".") {
          const parts = rel.split(sep);
          indent = parts.length;
          currentBlock.push(`${"  ".repeat(indent)}* ${parts.join("/")}/`);
        }
      }
      continue;
    }
    // File entries
    const fileMatch = line.match(/-a----\s+\d+\/\d+\/\d+\s+\d+:\d+\s+\d+\s+(.+)$/);
    if (fileMatch) {
      currentBlock.push(`${"  ".repeat(indent + 1)}* ${fileMatch[1]}`);
    }
  }
  // finalize
  pushBlock();
  return outputBlocks.join("\n\n");
}

/**
 * Handle Unix 'ls -R' output
 */

function convertUnixOutput(text) {
  const lines = text.split(/\r?\n/);
  const sep = "/";
  const blocks = [];
  let current = null;
  let baseDir = "";
  let indent = 0;

  function finish() {
    if (current) {
      blocks.push(current.join("\n"));
      current = null;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    // Detect new block: header 'ls -al -R <path>'
    const hdr = line.match(/^ls\b.*-R\s+(.+)$/);
    if (hdr) {
      finish();
      current = [];
      let target = hdr[1].replace(/^\.\//, "").replace(/\/+$|\\+$/g, "");
      baseDir = target;
      indent = 0;
      current.push(`* ${target}${sep}`);
      continue;
    }
    if (!current) continue;
    // Skip total lines
    if (/^total\s+\d+/.test(line)) continue;
    // Skip '.' and '..' entries
    if (/^drwx.*\s+\.$/.test(line) || /^drwx.*\s+\.\.$/.test(line)) continue;
    // Subdirectory header 'path/to/dir:'
    const sub = line.match(/^(.+?):$/);
    if (sub) {
      const full = sub[1].replace(/\/+$|\\+$/g, "");
      let rel = full.startsWith(baseDir + "/") ? full.slice(baseDir.length + 1) : full;
      rel = rel.replace(/\/+$|\\+$/g, "");
      if (rel && rel !== ".") {
        const parts = rel.split("/");
        indent = parts.length;
        current.push(`${"  ".repeat(indent)}* ${rel}${sep}`);
      }
      continue;
    }
    // File entry: last token with extension
    const fm = line.match(/\s+(\S+\.\w+)$/);
    if (fm) {
      current.push(`${"  ".repeat(indent + 1)}* ${fm[1]}`);
    }
  }
  finish();
  return blocks.join("\n\n");
}

/** Utility: get selection or whole document */

function getSelectedOrAllText() {
  const editor = vscode.window.activeTextEditor;
  const doc = editor.document;
  const sel = editor.selection;
  return sel.isEmpty ? doc.getText() : doc.getText(sel);
}

/** Utility: replace content in editor */

function replaceEditorContent(original, result) {
  const editor = vscode.window.activeTextEditor;
  const doc = editor.document;
  const sel = editor.selection;
  const range = sel.isEmpty ? new vscode.Range(doc.positionAt(0), doc.positionAt(original.length)) : sel;
  editor.edit((e) => e.replace(range, result));
}

module.exports = { convertDirListToMarkdown };

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * 対象フォルダ配下のファイルを再帰的に収集し、「パス一覧（リンク）」の Markdown を現在表示しているファイルへ上書き出力する。
 *
 * - 引数: 対象フォルダ（string / array / object{dir|path|folder} を吸収）
 * - 相対パス:
 *   - 見出しラベル: プロジェクトルート（ワークスペースルート）からの相対
 *   - リンク: 現在表示ファイルからの相対
 *
 * 出力フォーマット:
 *   ## [<projectRootRelative>](<fromDocRelative>)
 *
 *   ```<rouge language>
 *   ```
 */
async function generateLinkedFileIndexForDir(args) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return "Editor is not opening.";

  const document = editor.document;
  const docPath = document.uri.fsPath;
  const docDir = path.dirname(docPath);

  const workspaceFolder =
    vscode.workspace.getWorkspaceFolder(document.uri) ||
    (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null);
  const workspaceRoot = workspaceFolder ? workspaceFolder.uri.fsPath : docDir;

  // ---- 引数の解決（macro runner により string / array などがあり得る）
  let inputDir = null;
  if (typeof args === "string") inputDir = args;
  else if (Array.isArray(args) && typeof args[0] === "string") inputDir = args[0];
  else if (args && typeof args === "object") {
    if (typeof args.dir === "string") inputDir = args.dir;
    else if (typeof args.path === "string") inputDir = args.path;
    else if (typeof args.folder === "string") inputDir = args.folder;
  }

  if (!inputDir) {
    inputDir = await vscode.window.showInputBox({
      prompt: "対象フォルダを入力（ワークスペース相対 or 絶対パス）",
      value: ".",
    });
  }
  if (!inputDir) return;

  const targetDir = path.isAbsolute(inputDir)
    ? path.normalize(inputDir)
    : path.normalize(path.join(workspaceRoot, inputDir));

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    vscode.window.showErrorMessage(`対象フォルダが存在しません: ${targetDir}`);
    return;
  }

  // ---- 収集（必要最低限の安全策あり）
  // 収集対象外のディレクトリ / ファイル
  // prettier-ignore
  const excludes = new Set([
    ".DS_Store",
    ".cache",
    ".git",
    ".gitattributes",
    ".gitignore",
    ".gitkeep",
    ".npmrc",
    ".pnpm-store",
    ".svelte-kit",
    ".terraform",
    ".terraform.lock.hcl",
    ".venv",
    ".vscode",
    "Chart.lock",
    "Makefile",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "package.json",
    "pnpm-lock.yaml",
    "temp",
    "terraform.tfstate.d",
    "vendor",
  ]);

  // 収集対象外の拡張子
  // prettier-ignore
  const skipExt = new Set([
    ".7z",
    ".avi",
    ".gif",
    ".gz",
    ".ico",
    ".jpeg",
    ".jpg",
    ".log",
    ".mov",
    ".mp3",
    ".mp4",
    ".pdf",
    ".png",
    ".sqlite",
    ".sst",
    ".svg",
    ".tar",
    ".tgz",
    ".webp",
    ".zip",
  ]);

  const MAX_BYTES = 2 * 1024 * 1024; // 2MB超はスキップ（事故防止）

  const files = [];
  const stack = [targetDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (excludes.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (skipExt.has(ext)) continue;

      try {
        const st = fs.statSync(full);
        if (st.size > MAX_BYTES) continue;
      } catch {
        continue;
      }

      files.push(full);
    }
  }

  files.sort((a, b) => a.localeCompare(b));

  const toPosix = (p) => p.split(path.sep).join("/");
  const escapeMdLink = (p) => p.replace(/ /g, "%20");

  const getRougeLang = (filePath) => {
    const base = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // よくある "拡張子なし" を優先
    if (base === "dockerfile") return "dockerfile";
    if (base === "makefile") return "make";
    if (base === "go.mod" || base === "go.sum") return "go";
    if (base === "package.json") return "json";
    if (
      base === "compose.yml" ||
      base === "compose.yaml" ||
      base === "docker-compose.yml" ||
      base === "docker-compose.yaml"
    )
      return "yaml";

    const map = {
      ".js": "javascript",
      ".cjs": "javascript",
      ".mjs": "javascript",
      ".ts": "typescript",
      ".tsx": "tsx",
      ".jsx": "jsx",
      ".json": "json",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".md": "markdown",
      ".sh": "bash",
      ".zsh": "bash",
      ".ps1": "powershell",
      ".py": "python",
      ".go": "go",
      ".rb": "ruby",
      ".php": "php",
      ".java": "java",
      ".kt": "kotlin",
      ".swift": "swift",
      ".sql": "sql",
      ".html": "html",
      ".htm": "html",
      ".css": "css",
      ".scss": "scss",
      ".sass": "sass",
      ".less": "less",
      ".xml": "xml",
      ".csv": "csv",
      ".tsv": "tsv",
      ".tf": "hcl",
      ".tfvars": "hcl",
      ".hcl": "hcl",
      ".dockerignore": "text",
      ".gitignore": "text",
      ".env": "conf",
      ".cnf": "conf",
      ".conf.template": "conf",
    };
    return map[ext] || "text";
  };

  const lines = [];
  for (const abs of files) {
    const projectRel = toPosix(path.relative(workspaceRoot, abs));
    const docRel = toPosix(path.relative(docDir, abs));
    const lang = getRougeLang(abs);

    lines.push(`## [${projectRel}](${escapeMdLink(docRel)})`);
    lines.push("");
    lines.push("```" + lang);
    lines.push("```");
    lines.push("");
  }

  const out = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
  await editor.edit((eb) => eb.replace(fullRange, out));

  vscode.window.showInformationMessage(
    `GenerateLinkedFileIndexForDir: ${files.length} 件（${toPosix(path.relative(workspaceRoot, targetDir))}）`,
  );
}

module.exports = { generateLinkedFileIndexForDir };

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function fixRepositorySymlinks() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }

  const platform = process.platform;
  if (platform !== "darwin" && platform !== "win32") {
    vscode.window.showWarningMessage("このマクロは macOS と Windows のみをサポートしています。");
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const symlinks = collectSymlinks(workspaceRoot);
  if (symlinks.length === 0) {
    vscode.window.showInformationMessage("シンボリックリンクは見つかりませんでした。");
    return;
  }

  const repoName = path.basename(workspaceRoot);
  const summary = { updated: 0, skipped: 0, errors: [] };

  for (const linkPath of symlinks) {
    try {
      const rawTarget = fs.readlinkSync(linkPath);
      const targetAbs = resolveLinkTarget(linkPath, rawTarget, workspaceRoot, repoName);
      if (!targetAbs) {
        summary.skipped++;
        continue;
      }

      if (!isWithinWorkspace(targetAbs, workspaceRoot)) {
        summary.skipped++;
        continue;
      }

      if (targetAbs === linkPath) {
        summary.skipped++;
        continue;
      }

      if (!fs.existsSync(targetAbs)) {
        summary.errors.push(`${path.relative(workspaceRoot, linkPath)} -> 参照先が存在しません`);
        continue;
      }

      const stats = fs.statSync(targetAbs);
      if (platform === "darwin") {
        const changed = rewriteSymlinkForMac(linkPath, rawTarget, targetAbs, stats.isDirectory());
        summary[changed ? "updated" : "skipped"]++;
      } else {
        if (stats.isDirectory()) {
          summary.skipped++;
          continue;
        }
        replaceSymlinkWithFile(linkPath, targetAbs);
        summary.updated++;
      }
    } catch (error) {
      summary.errors.push(`${path.relative(workspaceRoot, linkPath)} -> ${error.message}`);
    }
  }

  const baseMessage = `処理対象: ${symlinks.length} / 更新: ${summary.updated} / スキップ: ${summary.skipped}`;
  if (summary.errors.length) {
    const detail = summary.errors.slice(0, 5).join(" | ");
    vscode.window.showErrorMessage(`${baseMessage} / エラー: ${summary.errors.length}件 - ${detail}`);
  } else {
    vscode.window.showInformationMessage(baseMessage);
  }
}

function collectSymlinks(rootDir) {
  const result = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        result.push(fullPath);
        continue;
      }
      if (entry.isDirectory()) {
        if (entry.name === ".git") {
          continue;
        }
        stack.push(fullPath);
      }
    }
  }
  return result;
}

function resolveLinkTarget(linkPath, rawTarget, workspaceRoot, repoName) {
  if (!rawTarget) return null;

  const linkDir = path.dirname(linkPath);
  const normalized = rawTarget.replace(/\\/g, "/");
  const marker = `/${repoName}/`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex !== -1) {
    const suffix = normalized.slice(markerIndex + marker.length);
    return path.resolve(workspaceRoot, suffix);
  }

  if (normalized.endsWith(`/${repoName}`)) {
    return path.resolve(workspaceRoot);
  }

  if (process.platform === "win32" && path.win32.isAbsolute(rawTarget)) {
    return path.normalize(rawTarget);
  }

  if (path.isAbsolute(rawTarget)) {
    return path.normalize(rawTarget);
  }

  return path.resolve(linkDir, rawTarget);
}

function isWithinWorkspace(targetPath, workspaceRoot) {
  const relative = path.relative(workspaceRoot, targetPath);
  if (!relative) return true;
  if (relative.startsWith("..")) return false;
  if (path.isAbsolute(relative)) return false;
  if (/^[a-zA-Z]:/.test(relative)) return false;
  return true;
}

function rewriteSymlinkForMac(linkPath, rawTarget, targetAbs, isDirectory) {
  if (rawTarget === targetAbs) {
    return false;
  }
  fs.unlinkSync(linkPath);
  if (isDirectory) {
    fs.symlinkSync(targetAbs, linkPath, "dir");
  } else {
    fs.symlinkSync(targetAbs, linkPath);
  }
  return true;
}

function replaceSymlinkWithFile(linkPath, targetAbs) {
  fs.unlinkSync(linkPath);
  fs.copyFileSync(targetAbs, linkPath);
}

module.exports = { fixRepositorySymlinks };

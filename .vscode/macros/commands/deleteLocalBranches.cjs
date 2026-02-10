const vscode = require("vscode");
const { exec } = require("child_process");

function deleteLocalBranches() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }
  const cwd = workspaceFolders[0].uri.fsPath;
  const command = "git branch | grep -vE '(develop|main|master)' | xargs git branch -D";
  exec(command, { cwd }, (error, stdout, stderr) => {
    if (error) {
      vscode.window.showErrorMessage("Error: " + error.message);
      return;
    }
    if (stderr) {
      vscode.window.showWarningMessage("Stderr: " + stderr);
    }
    vscode.window.showInformationMessage("Local branches deletion completed.");
  });
}

module.exports = { deleteLocalBranches };

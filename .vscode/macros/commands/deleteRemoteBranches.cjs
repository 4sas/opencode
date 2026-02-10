const vscode = require("vscode");
const { exec } = require("child_process");

function deleteRemoteBranches() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }
  const cwd = workspaceFolders[0].uri.fsPath;
  const command = "git branch -r | grep -vE 'origin/(develop|main|master)' | sed 's/origin\\///' | xargs -I {} git push origin --delete {}";
  exec(command, { cwd }, (error, stdout, stderr) => {
    if (error) {
      vscode.window.showErrorMessage("Error: " + error.message);
      return;
    }
    if (stderr) {
      vscode.window.showWarningMessage("Stderr: " + stderr);
    }
    vscode.window.showInformationMessage("Remote branches deletion completed.");
  });
}

module.exports = { deleteRemoteBranches };

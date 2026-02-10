/**
 * Macro entry point (refactored).
 * - macroCommands のみを公開し、各マクロ本体は ./macros/commands 配下に分割。
 */

const { formatMarkdown } = require("./macros/commands/formatMarkdown.cjs");
const { deleteRemoteBranches } = require("./macros/commands/deleteRemoteBranches.cjs");
const { deleteLocalBranches } = require("./macros/commands/deleteLocalBranches.cjs");
const { replaceToBladeFromHtml } = require("./macros/commands/replaceToBladeFromHtml.cjs");
const { replaceToLaravelCss } = require("./macros/commands/replaceToLaravelCss.cjs");
const { convertDirListToMarkdown } = require("./macros/commands/convertDirListToMarkdown.cjs");
const { embedLinkedFileContents } = require("./macros/commands/embedLinkedFileContents.cjs");
const { embedLinkedFileContentsForDir } = require("./macros/commands/embedLinkedFileContentsForDir.cjs");
const { fixRepositorySymlinks } = require("./macros/commands/fixRepositorySymlinks.cjs");
const { applyLinkedFileContents } = require("./macros/commands/applyLinkedFileContents.cjs");
const { applyLinkedFileContentsForDir } = require("./macros/commands/applyLinkedFileContentsForDir.cjs");
const { generateLinkedFileIndexForDir } = require("./macros/commands/generateLinkedFileIndexForDir.cjs");

module.exports.macroCommands = {
  FormatMarkdown: { no: 1, func: formatMarkdown },
  DeleteRemoteBranches: { no: 2, func: deleteRemoteBranches },
  DeleteLocalBranches: { no: 3, func: deleteLocalBranches },
  ReplaceToBladeFromHtml: { no: 4, func: replaceToBladeFromHtml },
  ReplaceToLaravelCss: { no: 5, func: replaceToLaravelCss },
  ConvertDirListToMarkdown: { no: 6, func: convertDirListToMarkdown },
  EmbedLinkedFileContents: { no: 7, func: embedLinkedFileContents },
  EmbedLinkedFileContentsForDir: { no: 8, func: embedLinkedFileContentsForDir },
  FixRepositorySymlinks: { no: 9, func: fixRepositorySymlinks },
  ApplyLinkedFileContents: { no: 10, func: applyLinkedFileContents },
  ApplyLinkedFileContentsForDir: { no: 11, func: applyLinkedFileContentsForDir },
  GenerateLinkedFileIndexForDir: { no: 12, func: generateLinkedFileIndexForDir },
};

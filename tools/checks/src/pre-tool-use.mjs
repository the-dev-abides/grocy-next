// The Claude Code PreToolUse hook. ADR 0016 records the decision. The hook
// reads one tool call as JSON on stdin. It rejects a write that contains a
// suppression comment, a write to a check configuration file, a project lint
// configuration that is not the one identical form, and a shell command that
// bypasses a hook or a check. The reply says what to do instead. The script
// has no dependency. `.claude/settings.json` runs it with Node.
import { readFileSync } from 'node:fs';
import path from 'node:path';

// The maintainer sets this constant to `true` by hand to edit a check
// configuration file, and sets it back to `false` after the edit. The
// pre-commit hook refuses a commit of this file with the value `true`.
/**
@type {boolean}
*/
const IS_UNLOCKED = false;

const WRITE_TOOLS = new Set(['Edit', 'MultiEdit', 'NotebookEdit', 'Write']);

// A comment that turns a check off. No file gets one.
const SUPPRESSION_COMMENTS = [
  'eslint-disable',
  '@ts-ignore',
  '@ts-expect-error',
  '@ts-nocheck',
  'prettier-ignore',
  'nx-ignore-next-line',
  'knip-ignore',
  'v8 ignore',
  'istanbul ignore',
];

// The check configuration, relative to the repo root. Only the maintainer
// changes these files.
const GUARDED_FILES = new Set([
  'eslint.config.mjs',
  'nx.json',
  'tsconfig.base.json',
  '.prettierrc',
  'knip.json',
  'lefthook.yml',
  'tools/checks/src/pre-tool-use.mjs',
]);
const GUARDED_FOLDERS = ['.claude'];

// This script lists the suppression strings, so the text check skips it. The
// file guard above still covers it.
const HOOK_SCRIPT = 'tools/checks/src/pre-tool-use.mjs';

// The one form of a project lint configuration. The relative path is the
// only part that changes.
const PROJECT_CONFIG_FORM =
  /^export \{ default \} from '(?:\.\.\/)+eslint\.config\.mjs';\n$/u;

const REPLY_SUPPRESSION =
  'Fix the error in the code instead of a comment that turns the check off.';
const REPLY_GUARDED =
  'Tell the maintainer what the check configuration must change and why.';
const REPLY_PROJECT_CONFIG =
  'Add the rule to the root eslint.config.mjs, because a project configuration is one re-export of it.';
const REPLY_COMMIT =
  'Fix the error that the pre-commit hook reports, then commit.';
const REPLY_MAX_WARNINGS = 'Run the lint with --max-warnings 0.';
const REPLY_INPUT = 'The hook could not read the tool input.';

// A shell command that bypasses a hook or a check.
const BASH_PATTERNS = [
  { pattern: /--no-verify\b/u, reply: REPLY_COMMIT },
  { pattern: /\bLEFTHOOK=0\b/u, reply: REPLY_COMMIT },
  {
    pattern: /core\.hooksPath/u,
    reply: 'Keep the git hooks path and fix the error that the hook reports.',
  },
  {
    pattern: /--rule\b/u,
    reply: 'Run the lint with the rules of the configuration file.',
  },
  {
    pattern: /--no-config-lookup\b/u,
    reply: 'Run the lint with the configuration file of the repo.',
  },
];
const MAX_WARNINGS = /--max-warnings(?:=|\s*)(?<value>\S*)/gu;
const FILE_COMMANDS = /\b(?:sed|tee|mv|rm|cp)\b/u;
// A redirect operator. `2>&1`, `=>`, and `->` are not redirects.
const REDIRECT = /(?<![=\-])>(?!&)/u;

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

/**
@param {unknown} value
@returns {string}
*/
function asText(value) {
  return typeof value === 'string' ? value : '';
}

/**
@param {string} text
@returns {boolean}
*/
function hasSuppressionComment(text) {
  return SUPPRESSION_COMMENTS.some((comment) => text.includes(comment));
}

/**
@param {string} relativePath
@returns {boolean}
*/
function isGuarded(relativePath) {
  return (
    GUARDED_FILES.has(relativePath) ||
    GUARDED_FOLDERS.some((folder) => relativePath.startsWith(`${folder}/`))
  );
}

/**
The edits of a write. `MultiEdit` carries a list. `Edit` is one edit.
@param {Record<string, unknown>} toolInput
@returns {Record<string, unknown>[]}
*/
function editsOf(toolInput) {
  /**
  @type {unknown[]}
  */
  const edits = Array.isArray(toolInput['edits']) ? toolInput['edits'] : [];
  return [toolInput, ...edits].filter((edit) => isRecord(edit));
}

/**
The content of a file after the write. `Write` replaces the file. `Edit` and
`MultiEdit` replace one string, or every occurrence of it.
@param {Record<string, unknown>} toolInput
@param {string} file
@returns {string}
*/
function contentAfterWrite(toolInput, file) {
  if (typeof toolInput['content'] === 'string') {
    return toolInput['content'];
  }
  let after = readFileOrEmpty(file);
  for (const edit of editsOf(toolInput)) {
    const oldString = asText(edit['old_string']);
    const replacement = asText(edit['new_string']);
    after =
      edit['replace_all'] === true
        ? after.replaceAll(oldString, () => replacement)
        : after.replace(oldString, () => replacement);
  }
  return after;
}

/**
@param {string} file
@returns {string}
*/
function readFileOrEmpty(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
The reply for a write, or an empty string when the write is allowed.
@param {Record<string, unknown>} toolInput
@param {string} cwd
@returns {string}
*/
function checkWrite(toolInput, cwd) {
  const file = path.resolve(
    cwd,
    asText(toolInput['file_path'] ?? toolInput['notebook_path']),
  );
  const relativePath = path.relative(cwd, file);
  const addedText = [
    asText(toolInput['content']),
    asText(toolInput['new_source']),
    ...editsOf(toolInput).map((edit) => asText(edit['new_string'])),
  ].join('\n');
  if (relativePath !== HOOK_SCRIPT && hasSuppressionComment(addedText)) {
    return REPLY_SUPPRESSION;
  }
  if (!IS_UNLOCKED && isGuarded(relativePath)) {
    return REPLY_GUARDED;
  }
  const isProjectConfig =
    relativePath !== 'eslint.config.mjs' &&
    relativePath.endsWith('/eslint.config.mjs');
  return isProjectConfig &&
    !PROJECT_CONFIG_FORM.test(contentAfterWrite(toolInput, file))
    ? REPLY_PROJECT_CONFIG
    : '';
}

/**
@param {string} command
@returns {boolean}
*/
function hasBadMaxWarnings(command) {
  for (const match of command.matchAll(MAX_WARNINGS)) {
    if (match.groups?.['value'] !== '0') {
      return true;
    }
  }
  return false;
}

/**
The reply for a shell command, or an empty string when it is allowed.
@param {string} command
@returns {string}
*/
function checkBash(command) {
  const bypass = BASH_PATTERNS.find(({ pattern }) => pattern.test(command));
  if (bypass !== undefined) {
    return bypass.reply;
  }
  if (hasBadMaxWarnings(command)) {
    return REPLY_MAX_WARNINGS;
  }
  if (hasSuppressionComment(command)) {
    return REPLY_SUPPRESSION;
  }
  const isFileWrite = FILE_COMMANDS.test(command) || REDIRECT.test(command);
  const hasGuardedName = [...GUARDED_FILES, ...GUARDED_FOLDERS].some((name) =>
    command.includes(name),
  );
  return isFileWrite && hasGuardedName && !IS_UNLOCKED ? REPLY_GUARDED : '';
}

/**
The reply for one tool call, or an empty string when it is allowed.
@param {unknown} toolCall
@returns {string}
*/
function check(toolCall) {
  if (!isRecord(toolCall)) {
    return REPLY_INPUT;
  }
  const toolInput = isRecord(toolCall['tool_input'])
    ? toolCall['tool_input']
    : {};
  const toolName = asText(toolCall['tool_name']);
  if (WRITE_TOOLS.has(toolName)) {
    return checkWrite(toolInput, asText(toolCall['cwd']) || process.cwd());
  }
  return toolName === 'Bash' ? checkBash(asText(toolInput['command'])) : '';
}

/**
@param {string} input
@returns {unknown}
*/
function parseJson(input) {
  try {
    return JSON.parse(input);
  } catch {
    return;
  }
}

const reply = check(parseJson(readFileSync(0, 'utf8')));
if (reply !== '') {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reply,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

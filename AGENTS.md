# AGENTS.md

## Language

Write all documentation, comments, commit messages, and PR text in ASD-STE100
Simplified Technical English (STE). STE is a controlled language with a fixed
rule set. Code identifiers, syntax, and quoted text are exempt.

## Decisions

Agents do not make decisions. A decision is any choice that another option
could replace: a tool, a library, a setting, a merge method, a naming scheme,
a schema shape. When a task contains a decision, stop and give the human:

- The options.
- The cost and the benefit of each option.
- One recommendation, with the reason.

Then wait for the answer. Do not apply a recommendation on your own. Do not
hide a decision inside a config value, a default, or a flag. When a checklist
or a plan names a choice, confirm it before you apply it.

## Names

Use plain names. A name says what a thing is. Do not give a part of the
system a name that makes it sound like a separate component, a pattern, or a
process when it is not one. `GLOSSARY.md` has the approved names.

## Dependency rule

Before you add a package, run `npm view <name> version`. Do not use a version
from memory. The lockfile is the pin.

## Commits

Work on a branch. Make one small commit for each logical change. Do not amend
a commit. Do not squash commits on the branch. Do not rebase. The PR is
squash-merged, and the PR title becomes the commit message on `main`. Small
branch commits are easier to review.

## Agent skills

### Issue tracker

Issues are GitHub issues in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.

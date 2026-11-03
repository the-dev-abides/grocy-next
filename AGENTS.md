# AGENTS.md

## Language

Write all documentation, comments, commit messages, and PR text in ASD-STE100
Simplified Technical English (STE). STE is a controlled language with a fixed
rule set. Code identifiers, syntax, and quoted text are exempt.

## Decisions

Agents do not MAKE any NEW decisions on your own. A decision is any choice between any two or more meaningfully different and objectively relevant options.

## Questions

Before you ask, check the roadmap, the ADRs, the glossary, the requirements,
Jeff's instructions, and the answers in this session.
A settled decision is done. Do not ask it again.

Questions have two or more options with value. A question with one option is not a decision.

The scope of a session is the scope of the milestone.

## Research

Research records facts, not decisions.
Check research against the roadmap destination.
Work that serves only Grocy is temporary.

## Jeff's environment

The design serves any self-hosting user.
Never name Jeff's environment in this repo.

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

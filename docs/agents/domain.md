# Domain docs

This file tells the engineering skills how to read the domain documentation
of this repo.

## Read these files before you explore the code

- `GLOSSARY.md` at the repo root.
- `docs/adr/`. Read each ADR that touches the area of your task.

If a file does not exist, continue without comment. Do not report that the
file is missing. Do not suggest that someone creates it. The `/domain-modeling`
skill creates these files when a term or a decision is resolved.

## File structure

This repo is single-context. The structure is:

```
/
├── GLOSSARY.md
└── docs/adr/
```

## Use the vocabulary of the glossary

When your output names a domain concept, use the term that `GLOSSARY.md`
defines. This applies to issue titles, refactor proposals, hypotheses, and
test names. Do not use a synonym that the glossary rejects.

If the glossary does not have the concept, one of two conditions is true.
You invented a term that the project does not use. Or the glossary has a gap.
In the first case, use an existing term. In the second case, note the gap for
`/domain-modeling`.

## Report ADR conflicts

If your output contradicts an ADR, say so. Do not override the ADR in silence.
Example: "This contradicts ADR-0001, but the decision needs a review because..."

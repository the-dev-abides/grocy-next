# Issue tracker: GitHub

Issues and specs for this repo are GitHub issues. Use the `gh` CLI for all
operations. `gh` finds the repo from `git remote -v` when you run it in a clone.

## Commands

- Create an issue: `gh issue create --title "..." --body "..."`. Use a heredoc for a body with more than one line.
- Read an issue: `gh issue view <number> --json number,title,body,labels,comments`.
- List issues: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`. Add `--label` and `--state` filters when you need them.
- Make an issue a sub-issue of a parent: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` after creation. If sub-issues are not available, put `Part of #<parent>` at the top of the child body.
- Comment on an issue: `gh issue comment <number> --body "..."`.
- Add or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close an issue: `gh issue close <number> --comment "..."`.

## Pull requests as a request surface

PRs as a request surface: yes. The `/triage` skill reads this flag. PRs use
the same labels and states as issues, with the `gh pr` commands:

- Read a PR: `gh pr view <number> --comments`. Read the diff with `gh pr diff <number>`.
- List external PRs for triage: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- Comment, label, or close: `gh pr comment`, `gh pr edit --add-label` or `--remove-label`, `gh pr close`.

Issues and PRs share one number space. A bare `#42` can be an issue or a PR.
Run `gh pr view 42` first. If that fails, run `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read the issue with the command in **Read an issue**.

## Wayfinding operations

The `/wayfinder` skill uses these operations. The map is one issue. Its child
issues are the tickets.

- Map: one issue with the label `wayfinder:map`. The body holds the Notes, the Decisions so far, and the Fog. Create it with `gh issue create --label wayfinder:map`.
- Child ticket: an issue that is a GitHub sub-issue of the map. If sub-issues are not available, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Label: `wayfinder:<type>`, where the type is `research`, `prototype`, `grilling`, or `task`. When a developer claims a ticket, assign the ticket to that developer.
- Blocking: use GitHub issue dependencies. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. The blocker database id comes from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`. It is not the `#number` and not the `node_id`. GitHub reports open blockers in `issue_dependencies_summary.blocked_by`. If dependencies are not available, put a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- Frontier query: list the open children of the map with `gh issue list --state open`. Remove each child that has an open blocker or an assignee. The first child in map order wins.
- Claim: `gh issue edit <n> --add-assignee @me`. This is the first write of the session.
- Resolve: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`. Then add a context pointer, a gist and a link, to the Decisions so far in the map.

# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues on the fork **jvloo/se-take-home-assignment**. Use the `gh` CLI for all operations.

> **Fork note:** this clone has two remotes — `origin` (jvloo/se-take-home-assignment, your fork) and `upstream` (feedmepos/se-take-home-assignment). `gh` resolves issues to the *parent* repo by default for forks, which is **not** what you want here. Always pass `--repo jvloo/se-take-home-assignment` (or run `gh repo set-default jvloo/se-take-home-assignment` once) so issues land on your fork, never on FeedMe's upstream.

## Conventions

- **Create an issue**: `gh issue create --repo jvloo/se-take-home-assignment --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --repo jvloo/se-take-home-assignment --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --repo jvloo/se-take-home-assignment --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --repo jvloo/se-take-home-assignment --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --repo jvloo/se-take-home-assignment --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --repo jvloo/se-take-home-assignment --comment "..."`

## When a skill says "publish to the issue tracker"

Create a GitHub issue on the fork.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo jvloo/se-take-home-assignment --comments`.

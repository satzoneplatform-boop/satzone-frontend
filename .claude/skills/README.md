# Claude Code Skills — SAT Zone project

This folder contains **skills**: reusable instruction packs that Claude Code loads
when they're relevant to the task. Because they live inside the repo
(`.claude/skills/`), everyone who clones this project gets them automatically —
no setup needed beyond having [Claude Code](https://claude.com/claude-code) installed.

## Skills installed in this project

| Skill | What it does | Try saying |
|---|---|---|
| `frontend-design` | Pushes Claude toward distinctive, intentional visual design instead of generic "AI-looking" UI. Guides palette, typography, and layout choices. | "Redesign the hero section" or `/frontend-design` |
| `webapp-testing` | Lets Claude launch the app and drive it in a real browser with Playwright — click through flows, take screenshots, read console errors — to verify UI changes actually work. | "Run the app and verify the landing page renders" |
| `skill-creator` | Interactive helper for writing **new** skills — asks about your workflow, then generates a proper `SKILL.md` for it. | `/skill-creator` or "help me create a skill for X" |

## How skills work

1. **Discovery** — when a Claude Code session starts, it scans:
   - `.claude/skills/` in the repo → *project skills* (shared with the team, this folder)
   - `~/.claude/skills/` → *personal skills* (only on your machine, all projects)
2. **Activation** — a skill activates in two ways:
   - **Automatically**: each `SKILL.md` has a `description` in its frontmatter;
     when your request matches it, Claude pulls the skill in on its own.
   - **Manually**: type `/skill-name` in the chat (e.g. `/frontend-design`).
3. **Effect** — the skill's instructions are injected into Claude's context for
   that task, steering how it works. Skills can also bundle scripts and examples
   (see `webapp-testing/scripts/`).

> Skills are read at session start. After adding or editing one, start a new
> session (or restart the extension) for changes to take effect.

## Anatomy of a skill

A skill is just a folder with a `SKILL.md`:

```
.claude/skills/
  my-skill/
    SKILL.md        <- required: frontmatter + instructions
    scripts/        <- optional helper scripts
    examples/       <- optional reference material
```

`SKILL.md` starts with YAML frontmatter:

```markdown
---
name: my-skill
description: One line saying WHEN Claude should use this. This is what
  triggers automatic activation, so make it specific.
---

# My Skill

Instructions Claude follows when the skill is active...
```

## Creating your own skill

Easiest way: type `/skill-creator` and describe the workflow you want to capture
(e.g. "deploying this app to EC2", "our translation/i18n conventions").
It interviews you and writes the skill for you.

Manual way: copy the structure above into a new folder here, commit, done.

Good candidates for this project: a deploy checklist, i18n string conventions,
the headless screenshot-verification recipe.

## Installing more ready-made skills

Anthropic publishes open-source skills at
<https://github.com/anthropics/skills> (document editing, PDF/XLSX handling,
MCP server building, and more). To add one:

```bash
git clone --depth 1 https://github.com/anthropics/skills /tmp/skills
cp -r /tmp/skills/skills/<skill-name> .claude/skills/     # shared with the team
# or: cp -r /tmp/skills/skills/<skill-name> ~/.claude/skills/   # just for you
```

Commit anything placed in `.claude/skills/` so teammates get it on `git pull`.

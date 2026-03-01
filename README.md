# lafabrique.ai

Personal tech blog and landing page. Built with MkDocs Material, deployed to Cloudflare Pages.

**Live**: https://lafabrique.ai

## Quick Start

```bash
# Install task runner (if needed)
# https://taskfile.dev/installation/

# Setup venv + dependencies
task setup

# Local dev server (http://localhost:8000)
task serve

# Deploy to Cloudflare Pages
task cf:deploy
```

## Deployment

**Platform**: Cloudflare Pages (project name: `lafabrique-ai`)
**Method**: `task cf:deploy` (uses `npx wrangler pages deploy`)
**Pipeline**: `mkdocs build` → `wrangler pages deploy site/`

```bash
task cf:deploy        # Deploy (preview)
task cf:deploy:prod   # Deploy to production (--branch=main)
task deploy           # Build + deploy to production
```

> **WARNING**: `mkdocs gh-deploy` pushes to the `gh-pages` branch on GitHub Pages.
> This is NOT what serves lafabrique.ai. Always use `task cf:deploy`.

## Project Structure

```
.
├── mkdocs.yml                    # Site config (nav, plugins, theme)
├── Taskfile.yml                  # Build/deploy tasks
├── overrides/
│   ├── home.html                 # Landing page hero section
│   └── main.html                 # Base template override
├── docs/
│   ├── index.md                  # Homepage content
│   ├── resume.md                 # Resume page (not in nav)
│   ├── blog/
│   │   ├── index.md              # Blog index
│   │   ├── .authors.yml          # Author definitions
│   │   └── posts/                # Blog posts
│   │       └── YYYY-MM-DD-slug.md
│   ├── assets/
│   │   ├── images/
│   │   │   ├── banner/           # Hero banners (6 themes × 2 characters)
│   │   │   ├── llm-bench-lab/    # Benchmark post images
│   │   │   └── .../              # Per-post image directories
│   │   └── theme-config.json     # Active theme + all theme definitions
│   ├── stylesheets/
│   │   └── extra.css             # Custom styles (hero, colors, responsive)
│   └── javascripts/
│       └── extra.js              # Theme rotation logic
├── tools/
│   └── hero-gen/                 # Imagen 4 banner generator
│       ├── generate_hero.py
│       ├── weekly-refresh.sh     # Cron: generates 12 banners weekly
│       └── prompts/
└── .ai/                          # AI assistant guidelines
    ├── CLAUDE.md
    ├── BLOG_QUALITY_GUIDELINES.md
    ├── BLOG_REVIEW_TEMPLATE.md
    └── instructions.md
```

## Theme Rotation System

The site rotates color themes on each page load:

1. `extra.js` fetches `assets/theme-config.json` on load
2. Picks a random color variant (3 per theme) different from last session
3. Sets CSS variables (`--md-primary-fg-color`, `--md-accent-fg-color`)
4. Shows the matching hero banner
5. Updates site title with theme name + icon

**Available themes**: Primary RGB, CMY, Dracula, Catppuccin, Nord, Warm, Cool, Legacy

The active theme is set in `theme-config.json` and rotated weekly by a cron job (`tools/hero-gen/weekly-refresh.sh`).

## Hero Banners

Generated with Google Imagen 4. 6 color themes × 2 characters (man/woman) = 12 banners stored in `docs/assets/images/banner/`. Plus 3 legacy banners (blue, red, yellow).

Weekly cron regenerates banners, commits, and deploys.

## Blog Posts

### Creating a new post

Create `docs/blog/posts/YYYY-MM-DD-slug.md`:

```markdown
---
date: YYYY-MM-DD
authors:
  - coulof
categories:
  - AI          # AI, Development, Tools, Kubernetes, DevOps, Storage, etc.
title: "Your Title Here"
description: "Short description for SEO and social cards."
---

# Your Title Here

Content here. Use `<!-- more -->` for excerpt break.
```

### Writing style

- American English
- No em dashes (use commas, colons, or split sentences)
- French punctuation on French content (space before : ; ! ?)
- Active voice, concise sentences
- External links: use `:material-open-in-new:` icon (skip if brand icon already present)
- See `.ai/BLOG_QUALITY_GUIDELINES.md` for full guidelines

### Images

Store in `docs/assets/images/<post-directory>/`. Reference with relative paths:

```markdown
![Alt text](../../assets/images/my-post/image.png)
```

## Navigation

Defined in `mkdocs.yml`. Includes external links to companion services:

| Entry | Target |
|-------|--------|
| Home | Landing page |
| Blog | Blog index + archives + categories |
| Chat my Resume | HuggingFace Space (Mistral AI) |
| GIA | gia.lafabrique.ai |
| Live Poll | poll.lafabrique.ai |
| Pastebin | pb.lafabrique.ai |

## Infrastructure

- **DNS**: Cloudflare (nameservers)
- **Hosting**: Cloudflare Pages (direct upload via wrangler, no git integration)
- **Domain**: lafabrique.ai
- **Source**: GitHub (coulof/lafabrique.ai)
- **Build machine**: bestcow (openSUSE Leap)

## Important Notes

- **No Git LFS.** Images are stored as regular files in git. Do not enable LFS.
- **No auto-deploy.** Cloudflare Pages is not connected to GitHub. Deploys are manual via `task cf:deploy`.
- **`mkdocs gh-deploy` is not the deploy command.** It pushes to GitHub Pages which is not the live site.
- MkDocs 2.0 breaks compatibility with Material for MkDocs. Pinned to MkDocs 1.x. Hugo migration planned.

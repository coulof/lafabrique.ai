# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website built with **MkDocs Material** theme. The site is a modern, minimal landing page with blog functionality.

## Build Commands

```bash
# Install dependencies
pip install mkdocs-material

# Local development server with live reload
mkdocs serve

# Build static site for production
mkdocs build

# Deploy to GitHub Pages
mkdocs gh-deploy
```

## Architecture

### Site Structure

- **Landing page** (`docs/index.md`) - Hero section with parallax effect, smooth scrolling sections, "Get Started" CTA linking to blog
- **Blog** (`docs/blog/`) - Regular blog posts using MkDocs Material blog plugin
- **Resume** (`docs/resume.md`) - Professional background page
- **GIA** (`docs/gia.md`) - Standalone content page

### Visual Identity

Three banner images provided (1.png, 2.png, 3.png) with color themes:
- Blue, Red, Yellow variants
- Session-based theme selection that changes on reload
- Light parallax effect between characters and background

### Configuration

Main config in `mkdocs.yml`. Follow Material for MkDocs conventions:
- Prefer configuration over custom code
- No external JS/CSS frameworks
- Minimal client-side complexity

### Design Constraints

- No backend logic or authentication
- No JavaScript frameworks beyond what Material provides
- Optimize for readability, fast loading, long-term maintainability

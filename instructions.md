# instructions.md

## Objective

Build a personal website using **MkDocs with the Material theme**, inspired by  
<https://squidfunk.github.io/mkdocs-material/>

The site should feel modern, minimal, and content‑first, following Material for MkDocs best practices.

## Core requirements

### 1. Landing page

*   The homepage acts as a **landing page**, not a documentation index
*   Visual identity:
    *   A strong hero section using a **predefined visual** (already provided)
    *   Clean typography, plenty of whitespace
*   Behavior:
    *   Smooth **scrolling between sections** of the landing page
    *   Sections should feel cohesive and guide the reader naturally downward

### 2. Get Started CTA

*   A clearly visible **“Get started”** button on the landing page
*   The button must:
    *   Visually stand out as the primary call to action
    *   Link directly to the **Blog section**
*   The user journey should be:
    *   Arrival on landing page
    *   Immediate understanding of purpose
    *   One click to reach blog content

### 3. Navigation bar

A persistent top navigation bar with the following entries:

*   **Home**
    *   Links to the landing page
*   **Blog**
    *   Entry point to blog posts
*   **Resume**
    *   A dedicated page for professional background
*   **GIA**
    *   A standalone page explaining or presenting GIA content

Navigation should:

*   Match Material for MkDocs styling
*   Be simple and uncluttered
*   Work consistently across desktop and mobile

## Content structure (conceptual)

The site is composed of:

*   A single **landing page** (Home)
*   A **Blog section** suitable for regular posts
*   Static pages:
    *   Resume
    *   GIA

The structure must remain simple and easy to extend later.

## Design principles

*   Follow Material for MkDocs conventions wherever possible
*   Prefer configuration over customization
*   No JavaScript frameworks
*   No client‑side complexity beyond what Material provides
*   Optimize for:
    *   Readability
    *   Fast loading
    *   Long‑term maintainability

## Non‑goals

*   No backend logic
*   No authentication
*   No external JS/CSS frameworks
*   No redesign of Material components beyond light theming

## Success criteria

The implementation is considered complete when:

*   The homepage looks and behaves like a modern product landing page
*   “Get started” reliably leads to the blog
*   Navigation matches the required structure
*   The site visually aligns with MkDocs Material inspiration
*   The whole setup remains clean, minimal, and idiomatic


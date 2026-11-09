# Blog Post Quality Guidelines

Reference voice : the 2025-2026 posts in `docs/blog/posts/`. Older posts are terser but share the same bones.

## Voice & Tone

A practitioner who built the thing in a lab, hit the wall, and writes down the shortest path. Peer to peer : "here is what I did, here is what broke". Not a marketer, not a teacher.

1. **Lead with the answer.** The first paragraph says what the reader gets : the trick, the config, the verdict. Put the key mechanism in bold or code format.
2. **First person, plain.** "I needed...", "I hit a few networking bugs". Use "we" only when walking through steps with the reader. No "In this article, we will delve...".
3. **Motivation in one beat.** One concrete situation (a customer bug, a missing license, docs "too long and too shallow"), then the solution. No scene-setting about how important Kubernetes is.
4. **Honest about failure.** Say what failed, what was wrong, what is unverified ("Spoiler alert: It failed", "That was wrong", "(I guess)"). Flag pre-release, workaround or unsupported setups in a `!!! warning`.
5. **Opinions stated once**, backed by a number or a mechanism, then move on.
6. **Dry humor, light.** One wink per post at most. French touches are welcome ("Et voila", "Vive la révolution").
7. **Name the lesson.** In field reports, use a bold **Lesson : ...** line per section.
8. **Disclose AI use.** Say when a post or tool was vibe-coded or proofread by an agent, and that it was audited.
9. **Credit co-authors and sources.** `*Co-authored with Name.*` under the H1. End with Sources or Further reading.

## General Structure

### Front Matter
- **Date**: `YYYY-MM-DD`
- **Authors**: valid authors from `.authors.yml`
- **Categories**: reuse existing ones (Kubernetes, Storage, Networking, Harvester, Linux, SUSE, AI, Dell, DevOps)
- **Title**: 60 characters or less, clear, concise, engaging
- **Description**: one sentence for the card (recent posts)
- `draft: true` until the post is ready to publish

### Content Structure
1. **Hook** : what the reader gets plus the key mechanism, 1 to 3 sentences, then `<!-- more -->`
2. **The premise / The problem** : one concrete situation
3. **The solution / Setup** : numbered `Step N :` for procedures
4. **Verification** : commands and expected output or a screenshot
5. **Conclusion** : 2 to 3 sentences. End on the state of things, a limit or the next step, not a restatement of the intro
6. **Further reading / Sources** : links, repo, original article

Variants :
- Benchmarks open with a **TL;DR** list of bolded headlines before `<!-- more -->`.
- Lab posts include a table of the setup (nodes, versions, IPs).
- Troubleshooting is a first-class section : symptom, what was really happening, fix. Show the failing output, then the diff or YAML that fixes it.
- A "Trade-offs and what's left" or "Sidenotes" section is normal. Do not oversell.
- Keep the repo link (`github.com/coulof/...`) near the end.

## Writing Style

### Language & Grammar
- American English spelling
- Active voice where possible
- Short declarative sentences, aim for 15-20 words max. Fragments are fine for rhythm ("Nothing does that today.")
- Bullet points and lists for complex information
- Avoid jargon unless necessary, and explain technical terms

### Anti-patterns
- "In today's fast-paced world", "delve", "robust", "seamless", "leverage", "game-changer", "unlock", "it's important to note", "Let's dive in"
- Generic conclusions ("By implementing X, you can significantly improve...")
- Rhetorical questions as section openers, three-adjective lists
- Bold labels in bullets that say nothing
- Claims without a version, number or command
- Hiding uncertainty. Write "I guess", "heuristic" or "not tested" instead
- Invented numbers, versions or outputs. Mark gaps with `TODO`

### Technical Content
- Code snippets formatted with a language tag, commands clearly marked and testable
- Show both the command and the expected output
- Include version information for tools and frameworks (Kube-OVN v1.15.4, Harvester v1.8.0-rc2, CSM 1.15)
- Explain the non-obvious *why* in a short bold paragraph ("Why a dedicated NIC?")
- Use comparison tables for design choices (approach / complexity / support)
- Silent failures get a warning admonition
- Link to official documentation where relevant
- Code identifiers, CRDs, flags and file names in backticks, always

### Formatting
- Markdown headers (`##`, `###`, `####`), sentence case, descriptive ("The packet OVN never saw")
- `<!-- more -->` for the excerpt separator
- Images : descriptive alt text plus an italic caption line directly under (`*Fig 1 : ...*` in benchmark posts)
- Videos : `:simple-youtube:` lead-in ("Here is the video walkthrough :") then the embed
- Admonitions : `!!! tip`, `!!! note`, `!!! warning "Title"`, `??? example` for long verification commands
- Emojis and icons sparse and consistent, prefer mkdocs-material-icons. Use emoji as category markers (🔖 🧪 🔥) or a closing 🚀, not on every heading
- Straight quotes `'` `"`
- **No em dash.** Use a comma, colon, period or ` : `
- Ranges written as "5 to 15%"
- **French punctuation** : space before two-part marks (`;` `!` `:` `?`) in prose. Not inside code, URLs or YAML
- Horizontal rule `---` between sections is acceptable in Dell-era posts, newer lab posts mostly skip it

### Links
- HTTPS only, descriptive link text (no "click here")
- External links : `{target="_blank"}`
- Brand icon after the link when one exists (`:simple-github:`, `:simple-dell:`, `:simple-suse:`, `:simple-redhat:`, `:simple-youtube:`). When a brand icon is used, drop `:material-open-in-new:`. Use `:material-open-in-new:` only for generic externals
- Internal links use relative paths to the `.md` file
- Check for broken links regularly

## SEO & Readability

- Include relevant keywords naturally, use descriptive headings
- Flesch Reading Ease 60-70
- Subheading every 300 words or so
- Paragraphs of 3-4 sentences max
- Use visual elements (images, diagrams, code blocks)

## Review Checklist

- [ ] Front matter complete, title 60 characters or less, `draft` flag correct
- [ ] First paragraph leads with the answer
- [ ] Premise is one concrete situation, not generic context
- [ ] Failures, workarounds and unverified claims are stated
- [ ] Versions given for every tool, no invented numbers or outputs
- [ ] Commands copy-pasteable with language tags, expected output shown
- [ ] Images have alt text and captions
- [ ] No em dash (`rg -n '—' <file>`)
- [ ] French spacing in prose, none inside code
- [ ] Links work, icons follow the rules above
- [ ] No anti-pattern phrases, no leftover notes to self (e.g. "Recommended Visual Asset", `TODO_VIDEO_ID`)
- [ ] Conclusion ends on state, limit or next step
- [ ] AI assistance disclosed where relevant

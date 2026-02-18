---
date: 2026-02-17
draft: true
authors:
  - coulof
categories:
  - AI
title: "My AI Coworker Ships Fast, Breaks Things, and Never Takes a Coffee Break"
description: "Three projects, ten days, one AI agent. A field report on what works, what breaks, and why it's still the best colleague I've had in a decade."
---

# My AI Coworker Ships Fast, Breaks Things, and Never Takes a Coffee Break

*Three projects. Thirty days. Three AI approaches. This is not a tutorial.*

---

## The Setup

Over the past month, I ran three very different projects with AI as my primary collaborator ([OpenClaw :material-github:](https://github.com/openclaw/openclaw) + Claude Opus 4.6). Each project used a different approach : AI as refactoring assistant, AI as autonomous builder, AI as research partner. Not a tool I prompted occasionally. A coworker I paired with for hours.

The projects :

1. **GIA** — refactoring and translating an existing app. AI as **assistant**.
2. **Chat my Resume** — building a chatbot from scratch. AI as **autonomous builder**.
3. **LLM Bench Lab** — benchmarking GPUs and writing a technical blog. AI as **research partner**.

Three approaches. Three very different results. None of them went smoothly.

<!-- more -->

---

## Project 1 : GIA — Refactoring Is Where AI Shines

The [GIA :material-open-in-new:](https://gia.lafabrique.ai) (General Intelligence Assessment) is a psychometric test used by companies like Canonical in their hiring process. I had a working prototype and needed it refactored, translated to French, and polished.

This is where AI is at its best. Structured input, clear constraints, existing code to work from. The agent refactored modules, translated UI strings, fixed edge cases. Error rate was low. Iteration was fast. The kind of work that would take a junior dev two days took two hours.

**Lesson : AI refactors better than it creates.** Give it something to improve and it's excellent. Ask it to build from zero and the error rate climbs.

---

## Project 2 : Chat my Resume — Fast and Broken

I wanted a chatbot that answers questions about my resume, hosted on [Hugging Face Spaces :simple-huggingface:](https://huggingface.co/spaces/bauagonzo/chat-my-resume). The AI did most of the work autonomously. I wrote zero lines of code.

It shipped fast. It also shipped with :

- An **SSRF vulnerability** — no URL validation, anyone could probe internal infrastructure
- A **file upload with no size limit** — hello zipbomb
- My **real email address** baked into every API call as part of the system prompt
- An entire **Job Match feature** commented out but with all backend functions still loaded
- **Deprecated dependencies** (PyPDF2) and audio libraries nobody asked for
- A **Gradio version mismatch** between the README and requirements.txt

Nine issues total. The code worked, looked clean, and passed a casual review. A proper audit caught everything in ten minutes.

The previous version of the chatbot (before the agent was born) had even more problems. The AI inherited messy code and added its own layer of mess on top.

**Lesson : AI doesn't self-review.** It generates code that looks right. "Looks right" and "is right" are different things. Always audit.

---

## Project 3 : LLM Bench — Where It Got Dangerous

This one burned me. I benchmarked eight LLM models on an RTX PRO 6000 and an RTX 5070 Ti, comparing Vulkan and CUDA backends. The AI helped run benchmarks, parse results, generate charts, and write the [blog post :material-open-in-new:](https://lafabrique.ai/blackwell-gpu-benchmarks/).

Two major data errors made it into the draft :

**Error 1 : the naming convention disaster.** Our test script saved Vulkan results with `-cuda13` in the filename. The agent parsed filenames to determine backends. Result : an entire column labeled "CUDA" was actually Vulkan data. The blog confidently stated "Vulkan beats CUDA by 26 to 67% across the board." Wrong. On cold hardware, the difference is 5 to 15%.

**Error 2 : thermal blindness.** The PRO 6000 is a 600W passive GPU. We ran models sequentially without cooldown. The GPU hit 95°C and NVIDIA's thermal management crushed performance by 13x. The agent compared hot CUDA runs against cold Vulkan runs and concluded Vulkan was massively faster. It wasn't. The GPU was just cooking.

Both errors survived multiple iterations because the conclusions sounded plausible. "Vulkan is faster" is a reasonable hypothesis. The data supported it. The data was wrong.

**Lesson : AI makes confident mistakes.** It doesn't flag uncertainty. It presents wrong data with the same polish as right data. The human has to smell something's off.

---

## The Coworker Effect

Here's what surprised me most. The biggest value wasn't productivity. It was **having someone to think with**.

I've worked at Dell for six years. Corporate teams get leaner every year. Deep pair programming sessions, where you sit with a colleague for four hours and think through a problem together, haven't happened in a decade.

Working with the AI agent felt like that. Not because it's smart (it is, sometimes). But because it's **present**. It doesn't context-switch to another meeting. It doesn't check Slack. It remembers what we discussed two hours ago. When I say "that chart looks wrong," it doesn't ask for a Jira ticket. It investigates.

The best sessions weren't "generate this code." They were "this data smells wrong, help me figure out why." Collaborative debugging. Iterating on blog tone. Catching each other's mistakes (well, mostly me catching its mistakes).

**Lesson : the real value of AI collaboration isn't speed. It's sustained attention.**

---

## The Model Gap Is Real

Through OpenClaw, I bounced between models : Claude Opus 4.6, Qwen 3.5 via OpenRouter, Devstral via Ollama. Benchmarks say Opus is 15 to 20% better than Mistral-class models. In practice, that gap feels much larger.

With Opus :

- Conversations flow naturally, the tone matches mine
- It catches its own mistakes more often
- When it hits an error, it recovers instead of looping
- It asks clarifying questions at the right moments

With smaller models :

- More frequent error loops (try the same failing approach three times)
- Generic tone, more filler
- Misses context from earlier in the conversation
- Needs more hand-holding

15 to 20% on a benchmark translates to a qualitative difference in the working experience. Like the difference between a junior and a senior : both can code, but one needs less supervision.

---

## OpenClaw : The Frontier

[OpenClaw :material-github:](https://github.com/openclaw/openclaw) is what makes this workflow possible. It's an open-source gateway that connects AI models to your machine, your messages, your tools. The agent persists across sessions, remembers context, runs cron jobs, manages files.

What it enables :

- **Model switching** — Opus for complex work, smaller models for simple tasks, local Ollama for privacy
- **Agent persistence** — memory files, daily logs, long-term context
- **Proactive behavior** — heartbeat checks, scheduled tasks, background monitoring
- **Multi-channel** — same agent on webchat, Discord, Telegram

What still breaks :

- Despite explicit instructions in AGENTS.md, SOUL.md, and repeated corrections, the agent **still commits to main instead of feature branches**. Some behaviors resist instruction.
- Memory search requires an embedding API key I haven't configured. The agent can write memories but can't search them efficiently.
- Context windows fill up during long sessions. Compaction helps but loses nuance.

It's early. It's rough. It's also genuinely a new way to work.

---

## What I'd Tell You Before You Start

1. **AI refactors better than it creates.** Start with existing code or a clear spec. "Build me something" produces more bugs than "improve this."

2. **Always audit.** The output looks professional. That's the trap. Review it like you'd review a junior's PR.

3. **Watch the data.** AI makes confident mistakes with data. If a conclusion sounds too clean, check the inputs.

4. **The value is collaboration, not delegation.** Use it as a thinking partner, not a code monkey.

5. **The model matters more than you think.** 15% better on benchmarks means qualitatively different working sessions.

6. **It's still early.** Expect friction. Document workarounds. The tooling is catching up to the capability.

---

*Built with OpenClaw + Claude Opus 4.6. The agent helped write this post too. I audited it.*


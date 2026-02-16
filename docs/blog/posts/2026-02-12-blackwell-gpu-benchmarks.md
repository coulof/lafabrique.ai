---
date: 2026-02-12
draft: true
authors:
  - coulof
categories:
  - AI
title: "Blackwell GPUs for Local LLMs : RTX PRO 6000 vs RTX 5070 Ti"
description: "Eight LLM models, two Blackwell GPUs, two backends, two operating systems. The $950 card punches way above its weight."
---

# Blackwell GPUs for Local LLMs : RTX PRO 6000 vs RTX 5070 Ti

*Tested on AMD Ryzen 7 9800X3D with llama.cpp b7966 via localscore-bench, February 2026*

---

## TL;DR

We benchmarked eight LLM models (1B to 70B parameters) on two Blackwell GPUs with Vulkan and CUDA 13.1, on both Linux and Windows.

**The headlines :**

- :material-cash-multiple: **The $950 card delivers 4 to 7x more tokens per dollar.** For models under 12B, the 5070 Ti is the rational choice.
- :material-scale-balance: **Vulkan and CUDA perform within 5 to 15% on cold hardware.** Pick whichever works for your setup.
- :material-snowflake: **The 5070 Ti just works. The PRO 6000 needs server cooling.** Active fans vs passive heatsink is the real differentiator.
- :material-check-all: **OS barely matters.** Linux and Windows within 5 to 10%.
- :material-memory: **VRAM is the only reason to buy the PRO 6000.** It earns its price at 32B+, not at 12B.

<!-- more -->

---

## The Setup

![Our test bench : RTX PRO 6000 Blackwell Server Edition in an Antec case](../../assets/images/llm-bench-lab/psyche-build.jpg){ width="600" }

*The Antec C5 mid-tower with seven case fans, doing its best to cool a 600W passive GPU.*

| Component | Detail |
|-----------|--------|
| CPU | AMD Ryzen 7 9800X3D |
| RAM | 60 GB DDR5 |
| GPU 1 | [NVIDIA RTX PRO 6000 Blackwell SE :simple-nvidia:](https://www.nvidia.com/en-us/design-visualization/rtx-pro-6000/), 96 GB GDDR7, 600W TDP, passive |
| GPU 2 | NVIDIA GeForce RTX 5070 Ti, 16 GB GDDR7, 300W TDP, active cooling |
| OS | openSUSE Tumbleweed :simple-opensuse: + Windows 11 Pro :material-microsoft-windows: (same hardware) |
| Engine | [llama.cpp :material-github:](https://github.com/ggml-org/llama.cpp) b7966 (Vulkan with coopmat2, CUDA 13.1) |
| Benchmark | [localscore-bench :material-github:](https://github.com/mozilla-ai/llamafile/tree/main/localscore) : pp1024+tg1024 primary config |

Both GPUs share Blackwell architecture and GDDR7 memory. The PRO 6000 has 6x the VRAM, 2x the power budget, and zero fans. All models use Q4_K_M quantization.

---

## The Results : PRO 6000 vs 5070 Ti

### Prompt Processing

![Prompt Processing comparison](../../assets/images/llm-bench-lab/merged-pp-comparison.png)

*Fig 1 : Prompt processing throughput. The PRO 6000 leads by 1.5 to 2x, matching its 2:1 memory bandwidth advantage (~1,792 GB/s vs ~896 GB/s).*

| Model | PRO 6000 Vulkan | PRO 6000 CUDA | 5070 Ti Vulkan | 5070 Ti CUDA | PRO 6000 lead |
|-------|-----------------|---------------|----------------|--------------|---------------|
| [Gemma 3 1B :material-open-in-new:](https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF) | 47,925 | 42,075 | 32,064 | 29,862 | 1.5x |
| [Llama 3.2 1B :material-open-in-new:](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF) | 49,329 | 44,046 | 28,768 | 23,843 | 1.7x |
| [Phi-4 Mini 3.8B :material-open-in-new:](https://huggingface.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF) | 19,917 | 20,525 | 10,212 | 10,705 | 1.9x |
| [Ministral 8B :material-open-in-new:](https://huggingface.co/bartowski/Ministral-8B-Instruct-2410-GGUF) | 10,692 | — | 6,041 | 5,901 | 1.8x |
| [Gemma 3 12B :material-open-in-new:](https://huggingface.co/bartowski/google_gemma-3-12b-it-GGUF) | 7,668 | 8,026 | 3,950 | 4,127 | 1.9x |

> PP = Prompt Processing (tokens/sec). PRO 6000 Vulkan from Feb 11 cold runs. PRO 6000 CUDA from Feb 15 cold runs where available (1B to 3.8B and 12B validation). 5070 Ti from Feb 12 runs. Ministral 8B CUDA on PRO 6000 crashed mid-run, excluded.

The PRO 6000's wider memory bus shows up clearly in prefill workloads. The 2:1 bandwidth ratio maps directly to the observed 1.5 to 2x performance gap.

### Token Generation

![Token Generation comparison](../../assets/images/llm-bench-lab/merged-tg-comparison.png)

*Fig 2 : Token generation throughput. The gap narrows to 1.1 to 1.6x. Both cards are faster than anyone can read.*

| Model | PRO 6000 (best) | 5070 Ti (best) | PRO 6000 lead |
|-------|-----------------|----------------|---------------|
| Gemma 3 1B | 484 t/s | 436 t/s | 1.1x |
| Llama 3.2 1B | 836 t/s | 615 t/s | 1.4x |
| Phi-4 Mini 3.8B | 331 t/s | 229 t/s | 1.4x |
| Ministral 8B | 212 t/s | 137 t/s | 1.5x |
| Gemma 3 12B | 123 t/s | 92 t/s | 1.3x |

Token generation is what you feel during a conversation. Mistral Nemo 12B at 92 t/s on the 5070 Ti produces roughly 70 words per second. Average reading speed is about 4 words per second. Both cards have a 16x margin over human reading speed. The delta between them is measurable but imperceptible.

### Performance per Dollar

![Value comparison](../../assets/images/llm-bench-lab/merged-perf-per-dollar.png)

*Fig 3 : Token generation per $1,000 invested. The 5070 Ti delivers 4 to 7x more tokens per dollar across every model tested.*

At roughly $950 versus $10,000, the 5070 Ti generates 4 to 7x more tokens per dollar spent. The PRO 6000 justifies its price through VRAM capacity, not throughput on small models. If your workload fits in 16GB, the math is clear.

### PRO 6000 : Large Models (32B+)

This is where the PRO 6000 earns its keep. These models do not fit in 16GB :

| Model | PRO 6000 Vulkan PP | PRO 6000 Vulkan TG | 5070 Ti |
|-------|--------------------|--------------------|---------|
| [Qwen3 32B :material-open-in-new:](https://huggingface.co/bartowski/Qwen_Qwen3-32B-GGUF) | 2,865 | 59 | Does not fit |
| [Llama 3.3 70B :material-open-in-new:](https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF) | 1,394 | 30 | Does not fit |

> Qwen3 32B at Q4_K_M needs ~20GB VRAM. Llama 3.3 70B at Q4_K_M needs ~42GB. These are PRO 6000 territory.

Qwen3 32B at 59 t/s is comfortable for interactive use. Llama 70B at 30 t/s is usable but not snappy. Both are impossible on the 5070 Ti without aggressive quantization and partial CPU offload.

---

## Vulkan vs CUDA : Closer Than You Think

On the PRO 6000 with cold hardware, the backend gap is surprisingly small :

![Vulkan vs CUDA on cold PRO 6000](../../assets/images/llm-bench-lab/merged-vulkan-vs-cuda-cold.png)

*Fig 4 : PRO 6000 Vulkan vs CUDA on cold hardware (Feb 15 data). The difference is 5 to 15% either way depending on model and workload.*

| Model | Vulkan PP | CUDA PP | Vulkan TG | CUDA TG |
|-------|-----------|---------|-----------|---------|
| Gemma 3 1B | **47,925** | 42,075 | 463 | **484** |
| Llama 3.2 1B | **49,329** | 44,046 | **836** | 719 |
| Phi-4 Mini 3.8B | 19,917 | **20,525** | **331** | 314 |
| Gemma 3 12B | 7,668 | **8,026** | 121 | **123** |

Vulkan wins PP on 1B models (+12 to 14%). CUDA wins PP on 3.8B and 12B models (+3 to 5%). Token generation splits similarly. No clear winner.

On the 5070 Ti, the story is even simpler : both backends perform within 5 to 10% across the board. No anomalies, no crashes. Pick whichever works for your setup.

!!! info "Data quality note"
    Early in our testing, a filename convention error caused us to label Vulkan results as CUDA. All numbers in this post have been verified against the actual `backends` field in each JSON result file. PRO 6000 CUDA data is only available for 1B, 1.2B, 3.8B, and 12B models on cold hardware. Larger models need a retest after GPU recovery.

---

## The Cooling Trap : Why Our Early Numbers Were Wrong

We initially reported Vulkan winning by 26 to 67% across the board. That was wrong.

The real story : we were comparing cold Vulkan runs against thermally degraded CUDA runs. The PRO 6000 Server Edition is a **600W passive GPU with zero fans**. NVIDIA designed it for [rack servers :simple-dell:](https://www.dell.com/en-us/shop/dell-poweredge-servers/sf/poweredge) with engineered front-to-back airflow tunnels. We put it in an Antec C5 mid-tower.

![Thermal impact on CUDA performance](../../assets/images/llm-bench-lab/merged-thermal-impact.png)

*Fig 5 : Same GPU, same backend, same model. The only variable is temperature. Cold hardware delivers 10 to 13x more throughput.*

| Model | CUDA Cold (45°C) | CUDA Hot (90-100°C) | Ratio |
|-------|------------------|---------------------|-------|
| Gemma 3 1B | 42,075 t/s | 3,273 t/s | **13x** |
| Llama 3.2 1B | 44,046 t/s | 3,348 t/s | **13x** |
| Phi-4 Mini 3.8B | 20,525 t/s | 1,490 t/s | **14x** |

The hot numbers came from running models sequentially without cooldown (Feb 9 scaling test). Temperature climbed to 90-100°C and NVIDIA's thermal management aggressively downclocked the GPU. The cold numbers came from running each model individually on a fresh GPU (Feb 15).

### Why a Consumer Case Falls Short

Our seven case fans deliver roughly 330 CFM total, but the heatsink needs directed, high-pressure airflow :

- **Direction :** fans push air vertically; the heatsink fins run front-to-back. Air flows around the card, not through it.
- **Static pressure :** dense passive fins need 5 to 10+ mm H₂O. Consumer fans deliver 1.5 to 2.0 mm H₂O.
- **No ducting :** hot air recirculates. Effective GPU airflow is roughly 100 to 130 CFM, not 330.

Community builders on [r/LocalLLM :material-open-in-new:](https://www.reddit.com/r/LocalLLM/comments/1mmqghu/rtx_pro_6000_se_is_crushing_it/) confirmed : a server-grade fan (Wathai 120x38mm) with a custom shroud held load temps at 61°C. Consumer case fans alone hit 85°C and throttled.

Over the course of our testing, we recorded **seven GPU crashes** (PCIe device lost, requiring full power cycle). The 5070 Ti completed all runs without a single issue. Active cooling works.

!!! warning "Don't do this at home"
    Running a 600W passive server GPU in a consumer mid-tower is a terrible idea. If you insist, you need server-grade fans with high static pressure, custom ducting, and temperature monitoring with automatic shutdown at 95°C.

---

## Cross-OS Comparison

We ran the full suite on Windows 11 Pro (same hardware, driver 582.32). Performance is within 5 to 10% :

| Model | Linux Vulkan PP | Windows CUDA PP | Linux Vulkan TG | Windows CUDA TG |
|-------|-----------------|-----------------|-----------------|-----------------|
| Gemma 3 1B | 47,925 | 27,952 | 463 | 517 |
| Llama 3.2 1B | 49,329 | 30,764 | 836 | 774 |
| Phi-4 Mini 3.8B | 19,917 | 14,631 | 331 | 320 |
| Ministral 8B | 10,692 | 7,767 | 212 | 171 |
| Qwen3 32B | 2,865 | 2,202 | 59 | 59 |

> This table compares different backends (Vulkan on Linux, CUDA on Windows). The PP differences largely reflect the backend gap, not the OS gap. TG numbers are comparable, confirming OS choice has minimal impact on generation speed.

---

## Who Should Buy What

**Get a 5070 Ti (~$950) if :**

- Your models fit in 16 GB (up to ~12B at Q4_K_M)
- You want the best performance per dollar
- You value stability and simple cooling
- You are building a home lab or dev workstation
- Example models : Llama 3.2 1B/3B, Phi-4 Mini 3.8B, Gemma 3 12B, Qwen3 14B

**Get a PRO 6000 (~$10,000) if :**

- You need 32B+ parameter models running locally
- You want 70B+ models without aggressive quantization
- You are running production inference workloads
- You have proper server cooling or plan to build custom ducting
- Example models : Qwen3 32B, Llama 3.3 70B (Q4_K_M), Mistral Large 2 123B (Q2_K)

---

## What Comes Next

- :material-thermometer-alert: **Clean CUDA retest on 8B+ models** after GPU recovery and improved cooling
- :simple-nvidia: **Driver tracking** as NVIDIA improves Blackwell CUDA kernels
- :material-fan: **Custom ducting build** for the PRO 6000 (inspired by the r/LocalLLM community results)

---

## Methodology

**PRO 6000 Vulkan :** best of three automated runs from February 11, 2026, verified cold GPU start.

**PRO 6000 CUDA :** individual cold runs from February 15, 2026, with GPU temperature verified below 50°C at start. Available for Gemma 1B, Llama 1B, Phi-4 Mini 3.8B, and Gemma 12B (validation). Larger models pending GPU recovery from crash #7.

**5070 Ti :** single run from February 12, 2026. The 5070 Ti's active cooling eliminates the thermal variance that made multiple PRO 6000 runs necessary.

**All models :** Q4_K_M quantization. Primary test configuration : pp1024+tg1024.

Raw data, scripts, and GPU monitoring charts available at [llm-bench-lab :material-github:](https://github.com/bauagonzo/llm-bench-lab).

---

*Last updated February 16, 2026.*

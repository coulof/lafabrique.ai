---
date: 2026-02-12
draft: true
authors:
  - coulof
categories:
  - AI
---
# Vulkan vs CUDA on NVIDIA Blackwell: The Benchmark Nobody Expected

*Tested on RTX PRO 6000 Blackwell Server Edition (96 GB VRAM) with llama.cpp b7966, February 2026*

---

## TL;DR

We benchmarked 8 LLM models (1B to 70B parameters) across two backends, two operating systems, and six runs. Vulkan with coopmat2 challenged CUDA 13.1 on NVIDIA's newest architecture. The results broke every assumption we had.

**The headlines:**

- :material-check: **8B and smaller : use CUDA.** It dominates prompt processing and throughput on small models.
- :material-creation: **32B and above : try Vulkan.** Token generation is 12 to 20% faster. The speed you feel during inference.
- :material-fire: **Mistral Nemo 12B : use Vulkan, no question.** 8.3x faster than CUDA (not a typo).
- :material-thermometer-alert: **Thermal behavior differs by backend.** CUDA thermal-throttled gracefully at 95°C. Vulkan crashed with unrecoverable device-lost errors instead.
- :material-fan: **Server GPUs should stay in server cases.** A 600W passive GPU in a consumer mid-tower is a recipe for thermal disaster.
- :material-check-all: **OS choice barely matters.** Linux and Windows CUDA performance within 5 to 10%.

<!-- more -->

---

## The Setup

![Our test bench: RTX PRO 6000 Blackwell Server Edition in an Antec case with 8 case fans trying their best against a 600W passive GPU](../../assets/images/llm-bench-lab/psyche-build.jpg){ width="600" }

| Component | Detail |
|-----------|--------|
| GPU | NVIDIA RTX PRO 6000 Blackwell Server Edition, 96 GB VRAM |
| CPU | AMD Ryzen 7 9800X3D |
| RAM | 60 GB DDR5 |
| OS | openSUSE Linux 6.18 :simple-opensuse: + Windows 11 pro :material-microsoft-windows: (same hardware) |
| Engine | llama.cpp b7966 (Vulkan with NV_coopmat2, CUDA 13.1) |
| Benchmark | localscore-bench: 3 configs per model (see below) |

---

## The Methodology

- **Engine:** llama.cpp b7966 (same commit for both backends)
- **Vulkan backend:** [ggml-org/llama.cpp :material-github:](https://github.com/ggml-org/llama.cpp) releases, with NV_coopmat2 cooperative matrix support
- **CUDA backend:** [ai-dock/llama.cpp-cuda :material-github:](https://github.com/ai-dock/llama.cpp-cuda) releases, CUDA 13.1
- **Test suite:** Quick mode with 3 configurations that simulate real-world usage patterns:
    - **pp1024+tg16:** Process a long prompt (1024 tokens), generate a short answer (16 tokens). Measures prompt processing speed. Think summarization, RAG retrieval, or classification tasks.
    - **pp1024+tg1024:** Process a long prompt, generate a long response. Balanced workload. Think chatbot conversations or document Q&A.
    - **pp16+tg1536:** Process a short prompt (16 tokens), generate a very long response. Stresses sustained token generation. Think creative writing, code generation, or long-form content.
- **Inspiration:** Test methodology adapted from [localscore :material-open-in-new:](https://www.localscore.ai/blog#:~:text=The%20Tests), a practical benchmark for local LLM inference
- **GPU monitoring:** nvidia-smi at 200ms intervals, capturing utilization, power, temperature, and VRAM
- **Quantization:** Q4_K_M for all models (4-bit, medium quality)
- **Runs:** 4 complete runs on Linux (plus 1 aborted), 7 runs on Windows (4 with valid GPU access)
- **All results and raw data:** [github.com/coulof/llm-bench-lab :material-github:](https://github.com/coulof/llm-bench-lab)

---

## The Results

### Linux: Vulkan vs CUDA

| Model | Params | Vulkan PP | Vulkan TG | CUDA PP | CUDA TG | Winner |
|-------|--------|-----------|-----------|---------|---------|--------|
| [Gemma 3 1B :material-open-in-new:](https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF) | 1.0B | 3,390 | 61 | **28,712** | **539** | CUDA |
| [Llama 3.2 1B :material-open-in-new:](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF) | 1.2B | 3,526 | 117 | **31,091** | **785** | CUDA |
| [Phi-4 Mini :material-open-in-new:](https://huggingface.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF) | 3.8B | 1,315 | 45 | **14,681** | **334** | CUDA |
| [Ministral 8B :material-open-in-new:](https://huggingface.co/bartowski/Ministral-8B-Instruct-2410-GGUF) | 8.0B | 652 | 29 | **8,458** | **208** | CUDA |
| [Gemma 3 12B :material-open-in-new:](https://huggingface.co/bartowski/google_gemma-3-12b-it-GGUF) | 11.8B | 5,341 | 117 | **5,708** | **123** | CUDA |
| [Mistral Nemo 12B :material-open-in-new:](https://mistral.ai/fr/news/mistral-nemo) | 12.2B | **4,776** | **51** | 577 | 25 | **Vulkan 8.3x** :material-fire: |
| [Qwen3 32B :material-open-in-new:](https://huggingface.co/bartowski/Qwen_Qwen3-32B-GGUF) | 32.8B | 1,956 | **58** | **2,221** | 41 | Split |
| [Llama 3.3 70B :material-open-in-new:](https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF) | 70.6B | 1,394 | **30** | **1,613** | 25 | Split |

> PP = Prompt Processing (tokens/sec). TG = Token Generation (tokens/sec). CUDA numbers from Feb 11 best-of-three runs. Vulkan numbers from Feb 9 localscore-bench runs.
> <br />
> **Data quality note:** Vulkan PP numbers on small models (1B-8B) are significantly lower than expected. A separate Feb 8 test showed Llama 1B Vulkan at 36,595 PP on the same GPU, comparable to CUDA. The Feb 9 numbers were collected after multiple GPU crashes and likely reflect degraded GPU state rather than true Vulkan performance. The "CUDA wins small models" conclusion for prompt processing should be treated with caution until confirmed on healthy hardware.

---

## Finding 1: The Mistral Nemo Anomaly :material-fire:

**[Mistral Nemo 12B :material-open-in-new:](https://mistral.ai/fr/news/mistral-nemo) on CUDA:** 577 t/s prompt processing, 25 t/s generation.

**Mistral Nemo 12B on Vulkan:** 4,776 t/s prompt processing, 51 t/s generation.

That is an 8.3x gap in prompt processing. Same GPU. Same model. Same llama.cpp build.

![Mistral Nemo 12B CUDA GPU monitoring](../../assets/images/llm-bench-lab/mistral-nemo-12b-cuda13.png)
*Fig 1: Mistral Nemo 12B on CUDA 13.1. GPU utilization reports 97% average, but power draw tells a different story. The GPU never exceeds 164W on a 600W TDP card. Something is wrong.*

![Mistral Nemo 12B Vulkan GPU monitoring](../../assets/images/llm-bench-lab/mistral-nemo-12b-vulkan.png)
*Fig 2: Mistral Nemo 12B on Vulkan. Same model, same GPU, completely different behavior. Power peaks at 266W. The GPU works for real this time.*

Under CUDA, the card reports high utilization but draws minimal power. It sits mostly idle despite what nvidia-smi claims. Under Vulkan, power draw matches actual computation.

**Our theory:** CUDA's Blackwell kernels hit a suboptimal code path for Mistral Nemo's layer dimensions. This looks like a bug, not a fundamental limitation. The anomaly persists across all runs (Feb 9, Feb 11, Feb 12) and on Windows. It is deterministic and reproducible.

**Why this matters:** On the RTX PRO 6000, switching Mistral Nemo 12B from CUDA to Vulkan gives a free 8x speedup. No hardware change required. We observed this on one card only and would welcome community confirmation on other Blackwell GPUs. Our [5070 Ti testing](./2026-02-12-pro-6000-vs-5070-ti.md) did not reproduce the anomaly, suggesting it may be PRO 6000-specific.

---

## Finding 2: Token Generation Crosses Back to Vulkan at 32B+

We expected a clean pattern: Vulkan wins small, CUDA wins big. It is more nuanced than that.

For **prompt processing**, CUDA's advantage grows with model size. No surprises there. But for **token generation** (the speed you feel during inference), the story reverses above 32B:

| Model | Vulkan TG | CUDA TG | Delta |
|-------|-----------|---------|-------|
| Ministral 8B | 29 | **34** | CUDA +17% |
| Gemma 3 12B | 117 | **123** | CUDA +5% |
| Qwen3 32B | **58** | 52 | **Vulkan +12%** |
| Llama 3.3 70B | **30** | 25 | **Vulkan +20%** |

> Token generation numbers from the pp1024+tg1024 configuration (balanced workload). Main results table uses best-of-three CUDA data from Feb 11 (different test configuration), which explains minor number differences.

![Qwen3 32B Vulkan GPU monitoring](../../assets/images/llm-bench-lab/qwen3-32b-vulkan.png)
*Fig 3: Qwen3 32B on Vulkan. Steady 400W power draw, temperature climbing from 37C to 80C. Token generation holds at ~58 t/s throughout.*

**The takeaway:** For 32B+ models in interactive use (chatbots, coding assistants), Vulkan delivers faster responses. The 12 to 20% advantage on Qwen3 32B and Llama 70B is consistent across runs.

---

## Finding 3: Thermal Throttling Across the Entire Run :material-thermometer-alert:

GPU monitoring during our Feb 9 scaling test revealed a progressive thermal problem. The benchmark ran models from small to large. By the time small models ran, the GPU was already hot from previous workloads.

| Model | Backend | Temp Range | Avg Temp | Peak Power | Avg Power |
|-------|---------|-----------|----------|------------|-----------|
| Gemma 3 1B | CUDA | 91-93°C | 92°C | 128W | 119W |
| Gemma 3 1B | Vulkan | 90-92°C | 90°C | 108W | 104W |
| Phi-4 Mini 3.8B | CUDA | 93-99°C | 96°C | 146W | 137W |
| Ministral 8B | CUDA | 98-104°C | 101°C | 156W | 134W |
| Mistral Nemo 12B | CUDA | 90-101°C | 95°C | 164W | 151W |
| Gemma 3 12B | Vulkan | 56-79°C | 66°C | 392W | 276W |
| Qwen3 32B | CUDA | 72-95°C | 87°C | 496W | 186W |
| Qwen3 32B | Vulkan | 37-80°C | 57°C | 458W | 324W |
| Llama 3.3 70B | CUDA | 59-104°C | 92°C | 592W | 195W |

Two patterns stand out. First, small models on both backends ran at 90°C+ with power draws under 160W. The GPU was thermally saturated and heavily throttled. A 600W TDP card drawing 134W is barely working. This explains the degraded performance numbers for small models.

Second, the Qwen3 32B CUDA run shows a clear performance cliff. The benchmark runs three configurations in sequence :

1. **pp1024+tg16** (short burst) : 52 t/s TG :material-check:
2. **pp1024+tg1024** (medium run) : 52 t/s TG :material-check:
3. **pp16+tg1536** (long generation) : **11.6 t/s TG** :material-alert:

That is a 4.5x drop within a single benchmark session. Temperature climbed to 95°C and NVIDIA's thermal management aggressively downclocked the GPU, dropping power from ~500W to ~150W.

![Qwen3 32B CUDA throttling](../../assets/images/llm-bench-lab/qwen3-32b-cuda13-throttle.png)
*Fig 4 : Qwen3 32B on CUDA 13.1. Power spikes to ~500W during the initial burst, then collapses to ~150W as temperature hits 95°C. GPU utilization stays at 100% throughout, but the driver downclocks aggressively to survive.*

Vulkan avoided this on the same model. It ran at lower average power (324W vs CUDA's initial 500W burst) and peaked at 80°C. CUDA's compute kernels push the GPU harder upfront, drawing peak power before thermals catch up. Vulkan's coopmat2 path spreads the work more evenly, staying within our cooling budget.

Across all testing, we recorded six GPU crashes : four from Vulkan, two from CUDA. CUDA throttled gracefully under thermal pressure, downclocking until the workload could continue at reduced performance. Vulkan workloads did not get that chance. They triggered `VK_ERROR_DEVICE_LOST` at the PCIe level, an unrecoverable error that required a full power cycle every time.

---

## Finding 4: The Real Bottleneck Was Never the Backend :material-fan:

Our crashes, thermal throttling, and performance cliffs share a common root cause. It is not Vulkan. It is not CUDA. It is cooling.

### A Passive GPU in a Consumer Case

The RTX PRO 6000 Blackwell Server Edition has no fans. Run `nvidia-smi` and Fan Speed reads N/A. This card draws up to 600W TDP (configurable from 300W to 600W).

NVIDIA designed it for rack servers like the [Dell PowerEdge XE9680 and R760xa :simple-dell: :material-open-in-new:](https://www.dell.com/en-us/shop/dell-poweredge-servers/sf/poweredge), where engineered front-to-back airflow tunnels force high-pressure air through the heatsink fins.

The [Central Computer overview :material-open-in-new:](https://www.centralcomputer.com/blog/post/understanding-the-nvidia-rtx-6000-pro-blackwell-lineup-workstation-max-q-and-server-editions) and [VAST AI comparison :material-open-in-new:](https://vast.ai/article/which-nvidia-rtx-6000-is-right-for-you) both stress this point : the Server Edition requires external chassis airflow. It can work in a consumer case with the right modifications (see community results below), but stock cooling will not cut it.

We put this card in an [Antec C5 :material-open-in-new:](https://www.antec.com/product/case/c5) mid-tower case. Seven Antec P12 120mm ARGB fans provide airflow : six reversed as intake (bottom and side panels) and one rear exhaust. The case uses a vertical bottom-to-top airflow scheme.

Each P12 pushes roughly 50 to 60 CFM at 1.5 to 2.0 mm H2O static pressure. Total theoretical intake : about 330 CFM.

That sounds like plenty. It is not !

### Why 330 CFM Falls Short

Three problems turn 330 CFM into a fraction of what the GPU needs.

**Direction.** The P12 fans push air vertically and from the side. The GPU heatsink fins run front to back. Air flows around the card, not through it. Without baffles or ducting, the path of least resistance bypasses the heatsink entirely.

**Static pressure.** Dense passive heatsink fins need 5 to 10+ mm H2O of static pressure to force air through them. The P12 fans deliver 1.5 to 2.0 mm H2O. Consumer case fans cannot push through server-grade fin density.

**No ducting.** Nothing seals the airflow path. Hot air recirculates. Cold air takes shortcuts. The GPU sits in a pocket of turbulence, not a cooling tunnel.

Realistic estimate: only 30 to 40% of total chassis airflow actually passes through the GPU heatsink. That puts effective GPU airflow at roughly 100 to 130 CFM.

### The Math Says We Are at the Edge

A standard electronic cooling formula gives the required airflow through a heat source:

> **CFM = (Watts x 3.16) / Delta T (degrees C)**

For our 600W card:

| Allowed Air Temp Rise | Required CFM Through Card |
|-----------------------|---------------------------|
| 10 degrees C | ~190 CFM |
| 15 degrees C | ~125 CFM |

Our estimated 100 to 130 CFM sits right at the boundary for a 15 degree C rise. Any sustained load that pushes power above 400W will exceed what our airflow can dissipate. The GPU temperature climbs until thermal protection kicks in.

### Community Results Confirm the Problem

Other builders on [r/LocalLLM :material-open-in-new:](https://www.reddit.com/r/LocalLLM/comments/1mmqghu/rtx_pro_6000_se_is_crushing_it/) tested the same card in non-server enclosures. Their results match our analysis:

| Fan Setup | CFM (Directed) | Idle Temp | Load Temp | Verdict |
|-----------|----------------|-----------|-----------|---------|
| Thermalright TY-143 (single) | ~130 | 50 C | 85 C | Marginal, throttles under sustained load |
| Wathai 120x38mm server fan + custom duct | ~220 | 33 C | 61-62 C | Stable, no throttling |

The difference is not raw CFM. It is directed, high-pressure airflow through the heatsink with proper ducting. The Wathai setup uses a server-grade fan (high static pressure) mounted in a custom shroud that forces every cubic foot of air through the card.

---

## Finding 5: Cross-OS Comparison Shows Minimal Difference :material-check:

**The bottom line: OS choice barely matters.** We ran the full suite on Windows (same hardware, driver 582.32) on February 11. Small to medium models performed within 5 to 10% across operating systems. Linux holds a slight edge, but the difference is negligible for practical use.

| Model | Linux CUDA PP | Windows CUDA PP | Linux CUDA TG | Windows CUDA TG |
|-------|---------------|-----------------|---------------|-----------------|
| Gemma 3 1B | 28,712 | 27,952 | 539 | 517 |
| Llama 3.2 1B | 31,091 | 30,764 | 785 | 774 |
| Phi-4 Mini 3.8B | 14,681 | 14,631 | 334 | 320 |
| Ministral 8B | 8,458 | 7,767 | 208 | 171 |
| Qwen3 32B | 2,221 | 2,202 | 41 | 59 |
| Llama 3.3 70B | Crash (run 3) | CPU fallback | N/A | 1.2 |

This is good news. Pick the OS you prefer ! Performance follows the hardware, not the operating system.

Qwen3 32B produced valid Windows results (2,202 PP, 59 TG) that closely match Linux Vulkan numbers.

Llama 3.3 70B failed on both platforms, confirming that the 70B stability issue is hardware-level, not OS-specific.

The Mistral Nemo CUDA anomaly also persists on Windows (575 PP vs Vulkan's 4,776 PP), confirming an architecture-level issue.

---

!!! warning ":material-alert: Don't Do This at Home"

    We ran a **600W passive server GPU** in a consumer mid-tower case. This is a terrible idea. The RTX PRO 6000 Server Edition has **zero fans**. NVIDIA designed it for rack servers with engineered front-to-back airflow tunnels.

    **What went wrong:** thermal throttling, performance cliffs, and GPU crashes. Our seven case fans delivered roughly 330 CFM total, but only 100 to 130 CFM actually reached the heatsink. That is not enough for sustained 400W+ loads.

    **If you insist on doing it anyway, you need:**

    - :material-fan: **Server-grade fans** (e.g., Wathai 120x38mm) with 5 to 10+ mm H2O static pressure
    - :material-air-filter: **Custom ducting or shroud** that forces air through the heatsink, not around it
    - :material-thermometer-alert: **Temperature monitoring** with automatic shutdown at 95C
    - :material-power-plug: **A PSU rated for 850W+** to handle peak GPU draw plus the rest of your system
    - :material-cog: **Baffles or seals** to prevent hot air recirculation

    The [r/LocalLLM community :material-open-in-new:](https://www.reddit.com/r/LocalLLM/comments/1mmqghu/rtx_pro_6000_se_is_crushing_it/) proved it works with the right setup: a server fan plus custom duct held load temps at 61C. Consumer case fans alone hit 85C and throttled.

---

## What Comes Next

The Blackwell architecture is new. Drivers change fast. Our next steps:

- :simple-nvidia: **RTX 5070 Ti comparison:** Same test suite on consumer Blackwell silicon with 16GB VRAM. [Already published](./2026-02-12-pro-6000-vs-5070-ti.md).
- :material-card-search: **Driver bisection:** Pin down which CUDA driver update caused the small-model speedup
- :material-lightning-bolt: **Flash Attention investigation:** Determine whether the Feb 12 CUDA boost relates to Flash Attention enablement

We will publish updates in the same repository as results come in.

---

*Raw data, scripts, and GPU monitoring charts available at [github.com/coulof/llm-bench-lab :material-github:](https://github.com/coulof/llm-bench-lab).*

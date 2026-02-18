# lafabrique.ai Hero Image Generator

Generates weekly hero images for lafabrique.ai using the Google Gemini API.

## Quick Start

```bash
cd ~/src/lafabrique-hero-gen
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export GEMINI_API_KEY="your-key-here"
python generate_hero.py
```

## Usage

```bash
# Default: reads prompt from ~/src/lafabrique.ai-prompts/hero-prompt.md, saves to output/
python generate_hero.py

# Custom prompt
python generate_hero.py --prompt "A futuristic lab with robots"

# Use Imagen 4 instead of Gemini Flash
python generate_hero.py --engine imagen --aspect-ratio 16:9

# Custom output path
python generate_hero.py -o /path/to/hero.png
```

## Engines

| Engine | Model | Notes |
|--------|-------|-------|
| `flash` (default) | Gemini 2.0 Flash | Native image gen via `responseModalities=["IMAGE"]`. Good quality, conversational. |
| `imagen` | Imagen 4 | Dedicated image model. Supports aspect ratios. Higher quality for pure generation. |

## Cron Example

```cron
# Every Monday at 6:00 AM
0 6 * * 1 cd ~/src/lafabrique-hero-gen && .venv/bin/python generate_hero.py --engine imagen --aspect-ratio 16:9 -o ~/src/lafabrique.ai/public/hero-$(date +\%Y-\%W).png 2>&1 | logger -t hero-gen
```

## API Key

Get one at https://aistudio.google.com/apikey (Google AI Studio).

## Pricing & Limits (as of Feb 2026)

### Free Tier (Google AI Studio)
- **Gemini 2.0 Flash**: Free tier available with rate limits (~15 RPM, 1M TPM). Image generation included.
- **Imagen**: Free tier includes limited generations (~25/day estimated). No guaranteed SLA.
- **Resolution**: Free tier may limit to 1024×1024. Higher res (2K/4K) likely requires paid plan.

### Paid (Pay-as-you-go)
- **Imagen 4**: ~$0.020/image (standard), ~$0.040/image (HD/4K)
- **Gemini Flash image gen**: Included in token pricing (~$0.075/1M input tokens)
- For 1 image/week: **< $0.10/month** on paid plan

### Notes from hero-prompt.md
- "Nano Banana" (Gemini 2.5 Flash Image) was noted as having 2 free images/day (Nov 2025 info)
- 2K/4K needs paid plan
- ~$0.15 per 4K generation (older pricing, may have changed)

**For our use case (1 image/week), free tier should be sufficient.** If quality at free-tier resolution is inadequate, paid plan cost is negligible.

## Project Structure

```
lafabrique-hero-gen/
├── generate_hero.py    # Main script
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── output/             # Generated images (gitignored)
```

## Blockers / TODO

- [ ] **Need GEMINI_API_KEY** — ask Ratatosk to create one at https://aistudio.google.com/apikey
- [ ] Test both engines and compare quality
- [ ] Evaluate if 16:9 aspect ratio works well for hero banner
- [ ] Add optional upload step (SCP/rsync to server)
- [ ] Consider local Stable Diffusion / Flux on RTX PRO 6000 as fallback

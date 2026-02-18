#!/bin/bash
# Weekly hero image refresh for lafabrique.ai
# Generates new banner images, commits with date tag
# Designed to be called by OpenClaw cron via Veðr Vert
#
# Requirements: GEMINI_API_KEY env var, Python venv at tools/hero-gen/.venv/

set -euo pipefail

REPO_ROOT="$HOME/go/src/github.com/coulof/lafabrique.ai"
TOOL_DIR="${REPO_ROOT}/tools/hero-gen"
BANNER_DIR="${REPO_ROOT}/docs/assets/images/banner"
OUTPUT_DIR="${TOOL_DIR}/output"
DATE=$(date +%Y-%m-%d)
VENV="${TOOL_DIR}/.venv/bin/python"

cd "$TOOL_DIR"

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo "❌ GEMINI_API_KEY not set"
    exit 1
fi

if [ ! -x "$VENV" ]; then
    echo "📦 Creating venv..."
    python3 -m venv .venv
    .venv/bin/pip install -q google-genai
fi

mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating hero images for $DATE..."

THEMES=("indigo" "amber" "emerald" "crimson" "noir" "slate")
GENDERS=("woman" "man")

COLORS_indigo="deep indigo and electric purple tones, neon cyan accents, dark moody atmosphere"
COLORS_amber="warm amber and burnt orange tones, golden sunlight, rust and copper accents"
COLORS_emerald="emerald green and teal tones, bioluminescent glow, forest-meets-tech atmosphere"
COLORS_crimson="crimson red and hot pink tones, magenta neon highlights, high contrast dark shadows"
COLORS_noir="black and white with deep charcoal shadows, silver metallic highlights, film noir atmosphere"
COLORS_slate="cool grey and steel blue tones, muted palette, overcast industrial light, concrete and brushed metal"

CHAR_woman="A young woman in her thirties"
CHAR_man="A young man in his mid-thirties with short dark hair"
DETAIL_woman="The woman has dark hair tied back,"
DETAIL_man="The man"

for theme in "${THEMES[@]}"; do
    colors_var="COLORS_${theme}"
    colors="${!colors_var}"
    for gender in "${GENDERS[@]}"; do
        char_var="CHAR_${gender}"
        detail_var="DETAIL_${gender}"
        char="${!char_var}"
        detail="${!detail_var}"
        outfile="${OUTPUT_DIR}/hero-${theme}-${gender}.png"

        prompt="A wide view of a futuristic laboratory filled with robotic machinery, scientists, and glowing control panels. ${colors}, sunlight streaming through skylights. ${char} repairing a humanoid robot, holding a tool as they work on the robot's open back. They have a subtle gentle smile, face softly lit by natural light from above. The robot sits on the ground with legs stretched out, made of white and yellow metal, looking at its own hand. ${detail} is casually dressed. Tools scattered around, a red toolbox nearby. Soft natural lighting on face, warm highlights. Style: very rough unfinished manga sketch on a torn piece of paper with irregular ragged paper edges, the drawing bleeds off the torn edges, no straight borders, ripped and uneven paper silhouette, heavy ink splatters, aggressive scratchy pen strokes, visible corrections and overdrawn lines, smudged graphite underneath, yellowed torn sketchbook page ripped from a notebook, Otomo raw storyboard feel, chaotic energy, imperfect and messy like a real artist's working draft, colored pencil accents bleeding through. HD quality."

        echo "  → ${theme}-${gender}..."
        $VENV generate_hero.py --engine imagen --aspect-ratio 16:9 -o "$outfile" --prompt "$prompt"
    done
done

echo "📦 Copying to banner directory..."
for theme in "${THEMES[@]}"; do
    for gender in "${GENDERS[@]}"; do
        cp "${OUTPUT_DIR}/hero-${theme}-${gender}.png" "${BANNER_DIR}/${theme}-${gender}.png"
    done
done

echo "📝 Git commit + tag..."
cd "$REPO_ROOT"
git add docs/assets/images/banner/
git commit -m "art: refresh hero banners ${DATE}" || echo "No changes to commit"
git tag "hero-${DATE}" || echo "Tag already exists"

echo "✅ Done. Images refreshed for ${DATE}."
echo "   Run 'git push && git push --tags && task cf:deploy:prod' to deploy."

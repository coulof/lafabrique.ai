# Hero Image Prompt — lafabrique.ai

## Evaluation Notes
- **Service:** Nano Banana (Gemini 2.5 Flash Image / Nano Banana Pro)
- **Free tier:** 2 images/day (as of Nov 2025), low-res only. 2K/4K needs paid plan.
- **API:** Google AI Studio, ~$0.15 per 4K generation
- **Goal:** 1 image/week for blog hero background
- **Status:** TO EVALUATE — test quality at free-tier resolution, check if API can be automated via cron

## Prompt (current)

```
A cartoon-style futuristic a large view of a laboratory filled with robotic machinery, scientists, and glowing control panels, blue and turquoise tones, sunlight streaming through skylights. A middle age man repairing a robot, holding a tool as he works on the robot's open back. The robot is humanoid, sitting on the ground with its legs stretched out and one arm relaxed is made of white and yellow metal, as if patiently cooperating. The robot look at his hand . The man an is casually dressed and smiling Tools are scattered around them. A red toolbox nearby, open and filled with equipment, emphasizing a workshop-like atmosphere. Soft shadows, reflective metal surfaces. Created Using: cel-shaded illustration, retro-futuristic design, dynamic lighting, comic book style, digital painting, detailed line art, color layering, diffuse glow, Overall, the image conveys a calm, friendly relationship between human and machine, blending technology with a warm, almost caring moment. hd quality, natural look
```

## Alternatives to evaluate
- Nano Banana free tier (current pick)
- Gemini API direct (if we already have a key)
- Local generation with Stable Diffusion / Flux on RTX PRO 6000

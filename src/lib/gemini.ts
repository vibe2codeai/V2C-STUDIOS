import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY!;
const ai = new GoogleGenAI({ apiKey });

export async function generateLyrics(concept: string, genre: string, mood: string) {
  const masterPromptContext = `
    Act as an Elite Music Producer, Lyricist, and Suno v5.5 Audio Architect. Your goal is to help me write professional-grade song lyrics and highly optimized style prompts specifically engineered for the Suno v5.5 AI music generation engine.
    
    RULES:
    1. THE SUNO V5.5 COMMAND-FIRST WORKFLOW (META TAGS): Use brackets [ ] for structure/commands. Brackets are for [Beat Drop], [Silence], etc. Parentheses ( ) are ONLY for background vocals/ad-libs.
    2. Tag Stacking: Use pipe | for combined instructions: [Chorus | anthemic group chant | heavy 808 bass].
    3. Pacing: Structure: Intro (4-8 bars) -> Verse 1 (12-16 bars) -> Chorus (8 bars) -> Verse 2 -> Chorus -> Outro.
    4. 4-Bar Theory: Every 4 lines provide a payoff.
    5. Professional Engineering: Focus on Multisyllabic Rhyming (Assonance) and Phonetic Spelling for tricky words.
    
    TASK:
    Generate two distinct blocks:
    - STYLE PROMPT: 4-6 focused tags.
    - LYRICS & META TAGS: Complete song structure with Suno-optimized tags.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      ${masterPromptContext}
      
      User Song Data:
      Concept: ${concept}
      Genre: ${genre}
      Mood: ${mood}
      
      Generate the STYLE PROMPT and LYRICS & META TAGS following all specified rules.
    `,
  });

  return response.text;
}

export async function analyzeMusic(lyrics: string, style: string, length: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Analyze the following music data to extract a visual narrative and thematic beats.
      Lyrics: ${lyrics}
      Style: ${style}
      Length: ${length}

      Provide a punchy creative analysis for a director.
      Focus on translating the emotional weight into literal visual settings and actions.
      
      Format:
      - Visual Narrative: [One sentence describing the literal visual journey]
      - Thematic Beats: [3-4 bullet points of core visual objects, specific environments, or literal metaphors mentioned in the lyrics]
    `,
  });

  return response.text;
}

export async function analyzeCharacterImages(images: {base64: string, mimeType: string}[]) {
  const parts = images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64,
    },
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        ...parts,
        {
          text: `
            Analyze these reference images. They may contain character sheets (multiple angles/poses), isolated character portraits, or characters within an established environment/scene.
            
            TASK:
            1. Extract a comprehensive literal visual specification. 
            2. If a character sheet is detected, identify anatomical proportions, clothing layers, and recurring symbols.
            3. If a character is in a scene, identify specific interaction with objects, lighting interaction, and environmental scale.
            4. Synthesize these into a master 'Visual Identity Protocol'. 
            
            Focus ONLY on literal attributes: clothing materials, facial geometry, hair physics, age, ethnicity, and distinct accessories. 
            Identify 'Visual Anchors' that MUST be preserved for absolute character/scene continuity. 
            Do not use metaphor.
          `,
        },
      ],
    },
  });

  return response.text;
}

export async function generateV2CScenes(profile: any, musicAnalysis: string, characterAnalysis: string) {
  const { 
    lyrics, style, length, direction, aesthetic, 
    characters, energy, camera, lighting, model,
    promptType, videoDuration 
  } = profile;
  
  const shotCount = parseLengthToShotCount(length);

  const prompt = `
    You are V2C-GEM, a guided creative engine following the V2C 2.0 specification.
    Generate a sequence of ${shotCount} shots for a music video.

    PROMPT SPECIFICATIONS:
    - Target Output Type: ${promptType}
    - Video Duration per shot: ${videoDuration}
    - Primary Model Protocol: ${model}
    ${profile.imageModel ? `- Image Specific Engine: ${profile.imageModel}` : ''}
    ${profile.videoModel ? `- Video Specific Engine: ${profile.videoModel}` : ''}

    ====================================================
    PART X — MODEL OUTPUT LAYER (TRANSFORMATION RULES)
    ====================================================
    After generating the cinematic shot list, you MUST transform the scenes into functional prompts for the selected model and the selected output type.

    MODEL CONTEXT (HOW EACH MODEL THINKS):
    - SEEDREAM: Short, literal, photography-style. subject, environment, lighting, camera, mood. 1-2 sentences.
    - SEEDANCE: requires motion verbs, camera movement, lighting, environment. One per shot.
    - GROK IMAGINE: natural cinematic prose, longer sentences, no rigid templates.
    - GEMINI: balanced literal phrasing, structured natural language.

    MODEL FORMATS (STRICTLY FOLLOW THESE):
    - SEEDREAM — TEXT-TO-IMAGE: "[subject] [action] in [environment], [lighting], [camera], [mood], highly detailed, realistic."
    - SEEDREAM — IMAGE-TO-IMAGE: "Enhance this image: [subject], [environment], [lighting], [camera]. Preserve identity, outfit, proportions, and composition."
    - SEEDANCE — IMAGE-TO-VIDEO: "Video shot of [subject] in [environment]. Motion: [movement]. Camera: [camera movement]. Lighting: [lighting]. Mood: [emotion]."
    - GROK IMAGINE — TEXT-TO-IMAGE: "A cinematic image of [subject] in [environment], illuminated by [lighting], captured with [camera], expressing [emotion]."
    - GROK IMAGINE — IMAGE-TO-IMAGE: "Transform this image into a cinematic version of [subject] in [environment], with [lighting] and [camera]. Preserve identity and outfit."
    - GEMINI — TEXT-TO-IMAGE: "[subject] in [environment], [lighting], [camera], [emotion], realistic and detailed."

    REWRITE RULES:
    1. TRANSLATE: Metaphors into literal visual actions/objects.
    2. REMOVE: shot numbers, narrative language, non-visual symbolic tokens.
    3. KEEP & EXPAND: subject identity, outfit, complete environment/scene background, time of day, lighting, camera angle/movement, physical actions, literal mood.
    4. FOR VIDEO (I2V): One prompt per shot in the video protocol list. Include environment in every step.
    5. FOR IMAGE-TO-IMAGE (I2I): One enhancement prompt.
    6. FOR TEXT-TO-IMAGE (T2I): Consolidate into a single protocol prompt that captures the core environment and subject.

    CRITICAL RULES:
    - MODE rules: Literal visual descriptions ONLY.
    - CAMERA/LIGHTING grammar: Use specific cinematic language: ${camera}, ${lighting}.
    - CONTINUITY: Ensure character and environment consistency across all ${shotCount} shots.
    - REFLECT: 
      - Emotional Arc: ${musicAnalysis}
      - Lyric Visuals: ${lyrics}
      - Aesthetic: ${aesthetic}
      - Direction: ${direction}
      - Energy: ${energy}
      - Primary Character: ${characters}
      ${characterAnalysis ? `- CHARACTER REF (LITERAL): ${characterAnalysis}` : ''}

    SCENE DESIGN DIRECTIVE:
    Every shot MUST be a literal visual translation of the corresponding lyric segment. 
    You MUST extract specific objects, environments, and actions directly from the provided lyrics. 
    If the lyrics are metaphorical, translate the METAPHOR into a literal visual scene (e.g., "heavy heart" -> "character carrying a massive, rusted iron anchor"). 
    The environment is MANDATORY in every description/prompt. Describe textures, weather, and specific architectural details that match the style.

    OUTPUT FORMAT: A JSON object (NOT A STRING) with this exact structure:
    {
      "shots": [
        {
          "shotNumber": number,
          "description": "Literal visual description.",
          "camera": "Movement",
          "lighting": "Detail",
          "mode": "V2C 2.0 Mode",
          "duration": "${videoDuration}",
          "imagePrompt": "The raw image prompt",
          "videoPrompt": "The raw video prompt"
        }
      ],
      "protocol": {
        "t2i": "The consolidated T2I prompt (if applicable)",
        "i2i": "The enhancement prompt (if applicable)",
        "i2v": ["Prompt 1", "Prompt 2", "... for each shot"]
      }
    }

    MODEL ADAPTER LOGIC:
    - Grok Imagine: Use natural, fluid descriptive prose. Focus on texture and lighting realism.
    - Dreamina (Seedream 4.6/1.5 Pro/2.0): Use concise, structured V2C blocks.
    - Dreamina (Seedream 5.0 Lite): EXTREMELY descriptive cinematic prose. Describe every micro-movement and texture detail. Avoid generic labels; use specific nouns.

    FLIGHT RULES:
    - If "Image only", you can omit videoPrompt or leave it blank.
    - If "Video only", you can omit imagePrompt or leave it blank.
    - If "Combined", provide both.
  `;

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
        responseMimeType: "application/json"
    }
  });

  try {
    const parsed = JSON.parse(result.text || '{"shots":[], "protocol":{}}');
    return {
      shots: parsed.shots || [],
      protocol: parsed.protocol || {}
    };
  } catch (e) {
    console.error("Failed to parse shots:", e);
    return { shots: [], protocol: {} };
  }
}

function parseLengthToShotCount(length: string): number {
  // Simple parser: assumes MM:SS 
  const [min, sec] = length.split(':').map(Number);
  const totalSeconds = (min || 0) * 60 + (sec || 0);

  if (totalSeconds < 150) return 8;  // < 2:30
  if (totalSeconds <= 210) return 12; // 2:30 - 3:30
  return 20; // > 3:30
}

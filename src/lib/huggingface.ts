import { z } from "zod";

type HFResult<T> =
  | { ok: true; value: T; source: "huggingface" }
  | {
      ok: false;
      message: string;
      source: "huggingface";
      reason: "missing_key" | "network" | "parse" | "validation";
      safeErrorCode: HFSafeErrorCode;
      safeErrorMessage: string;
      status?: number;
    };

export type HFSafeErrorCode =
  | "missing_token"
  | "unauthorized_or_bad_token"
  | "insufficient_permission"
  | "no_inference_credits"
  | "model_not_found"
  | "provider_unavailable"
  | "rate_limited"
  | "image_conversion_failed"
  | "unknown_error";

export type HFMarketingInput = {
  courseTitle: string;
  name: string;
  targetAudience: string;
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN";
  tone: string;
  campaignGoal: string;
  productDescription: string;
  keyBenefits: string;
  promotionalOffer?: string;
};

export type HFMarketingAssets = {
  primaryCaption: string;
  alternativeCaptions: string[];
  hashtags: string[];
  callToAction: string;
  shortAdCopy: string;
  longAdCopy: string;
  promotionalHeadline: string;
  platformTips: string[];
  engagementQuestion: string;
  contentIdeas: string[];
  campaignSummary: string;
};

export type HFCampaignAssets = HFMarketingAssets & {
  awarenessStageContent: string;
  engagementStageContent: string;
  conversionStageContent: string;
  adCopyVariations: string[];
  socialMediaCaptions: string[];
  audienceTargetingSuggestions: string[];
  postingRecommendations: string[];
};

export type HFLogoInput = {
  brandName: string;
  tagline: string;
  niche: string;
  tone: string;
  logoStyle: string;
  colorPalette?: string;
  audience?: string;
};

export type HFLogoOutput = {
  imageUrl: string;
  imageDataUrl: string;
  source: "huggingface" | "fallback";
  modelUsed: string;
  promptUsed: string;
  prompt: string;
  concept: string;
  safeErrorCode?: HFSafeErrorCode;
  safeErrorMessage?: string;
  errorMessage?: string;
};

export type HFPromoVisualInput = {
  courseTitle: string;
  trainerName: string;
  targetAudience: string;
  tone: string;
  campaignGoal: string;
  prompt: string;
};

export type HFPromoVisualOutput = {
  promoImageUrl: string;
  visualPromptUsed: string;
  visualSource: "huggingface" | "fallback";
  modelUsed: string;
  safeErrorCode?: HFSafeErrorCode;
  safeErrorMessage?: string;
};

const hfGeneratedTextSchema = z.array(
  z.object({
    generated_text: z.string().optional()
  })
);

const marketingAssetsSchema = z.object({
  primaryCaption: z.string().min(10),
  alternativeCaptions: z.array(z.string()).min(3),
  hashtags: z.array(z.string()).min(3),
  callToAction: z.string().min(2),
  shortAdCopy: z.string().min(10),
  longAdCopy: z.string().min(20),
  promotionalHeadline: z.string().min(5),
  platformTips: z.array(z.string()).min(2),
  engagementQuestion: z.string().min(5),
  contentIdeas: z.array(z.string()).min(3),
  campaignSummary: z.string().min(20)
});

const campaignAssetsSchema = marketingAssetsSchema.extend({
  awarenessStageContent: z.string().min(10),
  engagementStageContent: z.string().min(10),
  conversionStageContent: z.string().min(10),
  adCopyVariations: z.array(z.string()).min(2),
  socialMediaCaptions: z.array(z.string()).min(3),
  audienceTargetingSuggestions: z.array(z.string()).min(2),
  postingRecommendations: z.array(z.string()).min(2)
});

export function isHuggingFaceConfigured() {
  return Boolean(process.env.HF_TOKEN);
}

export async function safeHuggingFaceRequest({
  model,
  body,
  accept = "application/json"
}: {
  model: string;
  body: unknown;
  accept?: "application/json" | "image/png";
}): Promise<HFResult<Response>> {
  const token = process.env.HF_TOKEN;

  if (!token) {
    return {
      ok: false,
      source: "huggingface",
      reason: "missing_key",
      safeErrorCode: "missing_token",
      safeErrorMessage: "HF_TOKEN is missing on the server.",
      message: "HF_TOKEN is missing on the server."
    };
  }

  try {
    const response = await fetch(huggingFaceEndpoint(model), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: accept
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const safeError = await classifyHFError(response);
      return {
        ok: false,
        source: "huggingface",
        reason: "network",
        status: response.status,
        safeErrorCode: safeError.safeErrorCode,
        safeErrorMessage: safeError.safeErrorMessage,
        message: safeError.safeErrorMessage
      };
    }

    return { ok: true, source: "huggingface", value: response };
  } catch {
    return {
      ok: false,
      source: "huggingface",
      reason: "network",
      safeErrorCode: "provider_unavailable",
      safeErrorMessage: "Hugging Face provider could not be reached from the server.",
      message: "Hugging Face provider could not be reached from the server."
    };
  }
}

export async function generateLogoImage(input: HFLogoInput): Promise<HFLogoOutput & { message?: string }> {
  const model = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
  const prompt = [
    "Professional minimalist vector-style logo mark for an AI learning platform",
    `niche context: ${input.niche}`,
    `audience: ${input.audience || "AI learners, trainers, and gig workers"}`,
    `tone: ${input.tone}`,
    `logo style: ${input.logoStyle}`,
    `color palette: ${input.colorPalette || "premium blue, electric purple, dark slate, clean white"}`,
    "abstract neural network symbol",
    "clean geometric shapes",
    "premium SaaS brand identity",
    "modern gradient",
    "centered square app icon composition",
    "white background",
    "high quality",
    "no text",
    "no letters",
    "no readable words",
    "no brand name",
    "no watermark"
  ].join(", ");
  const fallback = mockLogo(input, prompt, model, "unknown_error", "Fallback generated because live Hugging Face logo generation did not return an image.");
  const result = await safeHuggingFaceRequest({
    model,
    accept: "image/png",
    body: {
      inputs: prompt,
      parameters: {
        width: 1024,
        height: 1024,
        num_inference_steps: 4,
        guidance_scale: 0,
        negative_prompt: "text, letters, words, brand name, watermark, blurry, distorted, low quality, messy layout, extra symbols, unreadable typography"
      },
      options: {
        wait_for_model: true,
        use_cache: false
      }
    }
  });

  if (!result.ok) {
    return {
      ...fallback,
      safeErrorCode: result.safeErrorCode,
      safeErrorMessage: result.safeErrorMessage,
      errorMessage: result.safeErrorMessage,
      message: result.safeErrorMessage
    };
  }

  try {
    const contentType = result.value.headers.get("content-type") ?? "image/png";

    if (!contentType.startsWith("image/")) {
      return {
        ...mockLogo(input, prompt, model, "provider_unavailable", "Hugging Face returned a non-image response."),
        message: "Hugging Face returned a non-image response."
      };
    }

    const arrayBuffer = await result.value.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:${contentType};base64,${base64}`;

    return {
      imageUrl,
      imageDataUrl: imageUrl,
      source: "huggingface",
      modelUsed: model,
      promptUsed: prompt,
      prompt,
      concept: `Generated abstract ${input.logoStyle.toLowerCase()} logo symbol for ${input.brandName}.`
    };
  } catch {
    return {
      ...mockLogo(input, prompt, model, "image_conversion_failed", "Hugging Face returned an unreadable image."),
      message: "Hugging Face returned an unreadable image."
    };
  }
}

export async function generatePromotionalVisual(input: HFPromoVisualInput): Promise<HFPromoVisualOutput> {
  const model = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
  const visualPromptUsed = [
    "Professional social media promotional visual for an AI training course",
    `course: ${input.courseTitle}`,
    `trainer: ${input.trainerName}`,
    `audience: ${input.targetAudience}`,
    `tone: ${input.tone}`,
    `campaign goal: ${input.campaignGoal}`,
    `trainer prompt: ${input.prompt}`,
    "premium SaaS marketing asset",
    "abstract AI learning workspace",
    "clean dashboard shapes",
    "modern gradient lighting",
    "blue purple dark slate white palette",
    "centered composition",
    "no text",
    "no letters",
    "no watermark",
    "high quality"
  ].join(", ");
  const fallback = mockPromoVisual(input, visualPromptUsed, model, "unknown_error", "Fallback generated because Hugging Face visual generation did not return an image.");
  const result = await safeHuggingFaceRequest({
    model,
    accept: "image/png",
    body: {
      inputs: visualPromptUsed,
      parameters: {
        width: 1024,
        height: 768,
        num_inference_steps: 4,
        guidance_scale: 0,
        negative_prompt: "text, letters, words, watermark, blurry, distorted, low quality, messy layout"
      },
      options: {
        wait_for_model: true,
        use_cache: false
      }
    }
  });

  if (!result.ok) {
    return {
      ...fallback,
      safeErrorCode: result.safeErrorCode,
      safeErrorMessage: result.safeErrorMessage
    };
  }

  try {
    const contentType = result.value.headers.get("content-type") ?? "image/png";

    if (!contentType.startsWith("image/")) {
      return mockPromoVisual(input, visualPromptUsed, model, "provider_unavailable", "Hugging Face returned a non-image promotional visual response.");
    }

    const arrayBuffer = await result.value.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      promoImageUrl: `data:${contentType};base64,${base64}`,
      visualPromptUsed,
      visualSource: "huggingface",
      modelUsed: model
    };
  } catch {
    return mockPromoVisual(input, visualPromptUsed, model, "image_conversion_failed", "Hugging Face returned an unreadable promotional visual image.");
  }
}

export async function generateMarketingPost(input: HFMarketingInput) {
  return generateMarketingAssets(input, "post");
}

export async function generateAdCopy(input: HFMarketingInput) {
  return generateMarketingAssets(input, "ad");
}

export async function generateCampaignContent(input: HFMarketingInput): Promise<{ source: "huggingface" | "local-mock"; assets: HFCampaignAssets; message?: string }> {
  const fallback = mockCampaign(input);
  const result = await generateTextJSON(input, "campaign", campaignAssetsSchema);

  if (result.ok) {
    return { source: "huggingface", assets: result.value };
  }

  return { source: "local-mock", assets: fallback, message: result.message };
}

async function generateMarketingAssets(input: HFMarketingInput, mode: "post" | "ad"): Promise<{ source: "huggingface" | "local-mock"; assets: HFMarketingAssets; message?: string }> {
  const fallback = mockMarketing(input);
  const result = await generateTextJSON(input, mode, marketingAssetsSchema);

  if (result.ok) {
    return { source: "huggingface", assets: result.value };
  }

  return { source: "local-mock", assets: fallback, message: result.message };
}

async function generateTextJSON<T>(input: HFMarketingInput, mode: "post" | "ad" | "campaign", schema: z.ZodType<T>): Promise<HFResult<T>> {
  const model = process.env.HF_TEXT_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
  const prompt = buildMarketingPrompt(input, mode);
  const response = await safeHuggingFaceRequest({
    model,
    body: {
      inputs: prompt,
      parameters: { max_new_tokens: 900, temperature: 0.65, return_full_text: false }
    }
  });

  if (!response.ok) {
    return response;
  }

  try {
    const parsed = hfGeneratedTextSchema.safeParse(await response.value.json());
    const text = parsed.success ? parsed.data[0]?.generated_text ?? "" : "";
    const json = extractJson(text);
    const validated = schema.safeParse(json);

    if (!validated.success) {
      return {
        ok: false,
        source: "huggingface",
        reason: "validation",
        safeErrorCode: "unknown_error",
        safeErrorMessage: "Hugging Face returned marketing content in an unexpected format.",
        message: "Hugging Face returned marketing content in an unexpected format, so SkillPilot used demo fallback content."
      };
    }

    return { ok: true, source: "huggingface", value: validated.data };
  } catch {
    return {
      ok: false,
      source: "huggingface",
      reason: "parse",
      safeErrorCode: "unknown_error",
      safeErrorMessage: "Hugging Face returned content SkillPilot could not parse.",
      message: "Hugging Face returned content SkillPilot could not parse, so fallback content was used."
    };
  }
}

function buildMarketingPrompt(input: HFMarketingInput, mode: "post" | "ad" | "campaign") {
  const baseFields = `courseTitle=${input.courseTitle}; name=${input.name}; audience=${input.targetAudience}; platform=${input.platform}; tone=${input.tone}; goal=${input.campaignGoal}; description=${input.productDescription}; benefits=${input.keyBenefits}; offer=${input.promotionalOffer || "none"}`;
  const common = `Return only valid JSON. No markdown. Generate professional, safe marketing content for SkillPilot AI. Do not claim real posting or payment actions. Inputs: ${baseFields}.`;

  if (mode === "campaign") {
    return `${common} Include primaryCaption, alternativeCaptions, hashtags, callToAction, shortAdCopy, longAdCopy, promotionalHeadline, platformTips, engagementQuestion, contentIdeas, campaignSummary, awarenessStageContent, engagementStageContent, conversionStageContent, adCopyVariations, socialMediaCaptions, audienceTargetingSuggestions, postingRecommendations.`;
  }

  return `${common} Include primaryCaption, alternativeCaptions, hashtags, callToAction, shortAdCopy, longAdCopy, promotionalHeadline, platformTips, engagementQuestion, contentIdeas, campaignSummary. ${mode === "ad" ? "Emphasize paid social ad hooks, value propositions, and concise conversion copy." : "Emphasize platform-native captions and organic engagement."}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

function huggingFaceEndpoint(model: string) {
  const provider = process.env.HF_PROVIDER || "hf-inference";
  return `https://router.huggingface.co/${provider}/models/${model}`;
}

async function classifyHFError(response: Response): Promise<{ safeErrorCode: HFSafeErrorCode; safeErrorMessage: string }> {
  const errorText = await safeReadHFError(response);
  const normalized = errorText.toLowerCase();

  if (response.status === 401 || response.status === 403 && normalized.includes("token")) {
    return {
      safeErrorCode: "unauthorized_or_bad_token",
      safeErrorMessage: "Hugging Face rejected the token. Check HF_TOKEN."
    };
  }

  if (response.status === 403) {
    if (normalized.includes("credit") || normalized.includes("quota") || normalized.includes("billing") || normalized.includes("exceeded")) {
      return {
        safeErrorCode: "no_inference_credits",
        safeErrorMessage: "Hugging Face indicates no available inference credits or quota."
      };
    }

    return {
      safeErrorCode: "insufficient_permission",
      safeErrorMessage: "HF_TOKEN does not have permission to run this inference provider/model."
    };
  }

  if (response.status === 404) {
    return {
      safeErrorCode: "model_not_found",
      safeErrorMessage: "The configured HF_IMAGE_MODEL was not found or is not available through the selected provider."
    };
  }

  if (response.status === 429) {
    return {
      safeErrorCode: "rate_limited",
      safeErrorMessage: "Hugging Face rate limited this request. Try again shortly."
    };
  }

  if (response.status === 402 || normalized.includes("credit") || normalized.includes("quota") || normalized.includes("billing")) {
    return {
      safeErrorCode: "no_inference_credits",
      safeErrorMessage: "Hugging Face indicates no available inference credits or quota."
    };
  }

  if (response.status === 503 || normalized.includes("provider") || normalized.includes("currently loading") || normalized.includes("unavailable")) {
    return {
      safeErrorCode: "provider_unavailable",
      safeErrorMessage: errorText || "Hugging Face provider is unavailable or the model is loading."
    };
  }

  return {
    safeErrorCode: "unknown_error",
    safeErrorMessage: errorText || `Hugging Face returned HTTP ${response.status}.`
  };
}

async function safeReadHFError(response: Response) {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as { error?: string | string[]; estimated_time?: number; message?: string };
    const raw = redactSecrets(Array.isArray(parsed.error) ? parsed.error.join(" ") : parsed.error || parsed.message || text);
    const base = raw.slice(0, 220);

    if (!base) {
      return "";
    }

    return parsed.estimated_time ? `${base} Try again in about ${Math.ceil(parsed.estimated_time)} seconds.` : base;
  } catch {
    return "";
  }
}

function redactSecrets(value: string) {
  const token = process.env.HF_TOKEN;
  const withoutKnownToken = token ? value.replaceAll(token, "[redacted]") : value;
  return withoutKnownToken.replace(/hf_[A-Za-z0-9_\\-]{12,}/g, "[redacted]");
}

function mockLogo(input: HFLogoInput, prompt: string, model: string, safeErrorCode: HFSafeErrorCode, safeErrorMessage: string): HFLogoOutput {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#dbeafe"/></linearGradient><linearGradient id="mark" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#2563eb"/><stop offset=".48" stop-color="#7c3aed"/><stop offset="1" stop-color="#0f172a"/></linearGradient><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="30" stdDeviation="28" flood-color="#1e293b" flood-opacity=".2"/></filter></defs><rect width="1024" height="1024" rx="220" fill="url(#bg)"/><g filter="url(#s)"><circle cx="512" cy="512" r="286" fill="white"/><path d="M319 577c60-168 183-249 369-247-79 49-119 123-119 222 0 47 10 93 31 139-86-13-155-49-207-108-27 18-52 38-74 61 0-22 0-44 0-67z" fill="url(#mark)"/><circle cx="690" cy="329" r="45" fill="#38bdf8"/><circle cx="352" cy="675" r="33" fill="#a855f7"/><path d="M398 642c83-45 156-118 219-220" fill="none" stroke="#e0f2fe" stroke-width="28" stroke-linecap="round"/></g><circle cx="512" cy="512" r="382" fill="none" stroke="#c7d2fe" stroke-width="18" stroke-opacity=".7"/></svg>`;
  const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return {
    imageUrl,
    imageDataUrl: imageUrl,
    source: "fallback",
    modelUsed: model,
    promptUsed: prompt,
    prompt,
    concept: `Fallback abstract app-icon logo mark for ${input.brandName}.`,
    safeErrorCode,
    safeErrorMessage,
    errorMessage: safeErrorMessage
  };
}

function mockPromoVisual(input: HFPromoVisualInput, prompt: string, model: string, safeErrorCode: HFSafeErrorCode, safeErrorMessage: string): HFPromoVisualOutput {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0f172a"/><stop offset=".5" stop-color="#1d4ed8"/><stop offset="1" stop-color="#7c3aed"/></linearGradient><linearGradient id="card" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#dbeafe"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="26" stdDeviation="24" flood-color="#020617" flood-opacity=".28"/></filter></defs><rect width="1200" height="900" rx="80" fill="url(#bg)"/><circle cx="1010" cy="130" r="220" fill="#a855f7" opacity=".28"/><circle cx="190" cy="760" r="260" fill="#38bdf8" opacity=".18"/><g filter="url(#shadow)"><rect x="150" y="150" width="900" height="600" rx="56" fill="url(#card)" opacity=".96"/><path d="M282 580c112-240 315-329 608-267-148 75-221 185-221 330-124-19-224-72-301-158-34 24-63 56-86 95z" fill="#2563eb"/><circle cx="840" cy="298" r="62" fill="#7c3aed"/><circle cx="340" cy="626" r="44" fill="#38bdf8"/><path d="M390 596c143-81 253-181 329-302" fill="none" stroke="#e0f2fe" stroke-width="34" stroke-linecap="round"/></g><rect x="206" y="214" width="240" height="20" rx="10" fill="#1e293b" opacity=".28"/><rect x="206" y="256" width="360" height="20" rx="10" fill="#2563eb" opacity=".22"/><rect x="206" y="298" width="290" height="20" rx="10" fill="#7c3aed" opacity=".22"/></svg>`;

  return {
    promoImageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    visualPromptUsed: prompt,
    visualSource: "fallback",
    modelUsed: model,
    safeErrorCode,
    safeErrorMessage
  };
}

function mockMarketing(input: HFMarketingInput): HFMarketingAssets {
  const offer = input.promotionalOffer ? ` Offer: ${input.promotionalOffer}.` : "";
  const base = `${input.courseTitle} helps ${input.targetAudience.toLowerCase()} ${input.keyBenefits.toLowerCase()}`;

  return {
    primaryCaption: `${base}. Learn with ${input.name}, apply the lessons immediately, and turn AI practice into visible results.${offer}`,
    alternativeCaptions: [
      `Ready to make AI practical? ${input.courseTitle} gives ${input.targetAudience.toLowerCase()} a clear path from lesson to action.`,
      `Stop collecting AI tips. Start building repeatable skills with ${input.courseTitle}.`,
      `${input.name} designed ${input.courseTitle} for learners who want practical outcomes, not vague AI hype.`,
      `Bring one workflow, learn the AI method, and leave with a reusable system.`
    ],
    hashtags: ["#SkillPilotAI", "#AITraining", "#PromptEngineering", "#LearnAI", "#FutureSkills"],
    callToAction: "Preview the course and save your seat.",
    shortAdCopy: `${input.courseTitle}: practical AI training for ${input.targetAudience.toLowerCase()}.`,
    longAdCopy: `${input.courseTitle} is built for ${input.targetAudience.toLowerCase()} who want guided AI training, practical examples, and clearer next steps. ${input.keyBenefits}.${offer} Start with one course and build a portfolio-ready skill.`,
    promotionalHeadline: `Build practical AI skills with ${input.courseTitle}`,
    platformTips: [`Keep ${input.platform.toLowerCase()} copy ${input.platform === "TIKTOK" ? "short, visual, and hook-led" : "outcome-led and easy to scan"}.`, "Lead with one learner benefit before mentioning features."],
    engagementQuestion: "What is one workflow you wish AI could help you improve this week?",
    contentIdeas: ["Before-and-after workflow post", "Trainer tip carousel", "Learner progress story", "Quick myth-busting post"],
    campaignSummary: `${input.tone} ${input.platform} campaign for ${input.courseTitle}, focused on ${input.campaignGoal.toLowerCase()}.`
  };
}

function mockCampaign(input: HFMarketingInput): HFCampaignAssets {
  const base = mockMarketing(input);

  return {
    ...base,
    awarenessStageContent: `Introduce the problem: ${input.targetAudience} need practical AI skills but often lack a repeatable learning path.`,
    engagementStageContent: `Share one mini lesson from ${input.courseTitle} and invite comments about real workflow challenges.`,
    conversionStageContent: `Present the course outcome, bonus offer, trainer credibility, and clear sign-up CTA.`,
    adCopyVariations: [base.shortAdCopy, `Learn ${input.keyBenefits.toLowerCase()} with a focused SkillPilot course.`, `Turn AI curiosity into a practical portfolio skill.`],
    socialMediaCaptions: [base.primaryCaption, ...base.alternativeCaptions.slice(0, 3)],
    audienceTargetingSuggestions: [input.targetAudience, "Freelancers exploring AI services", "Professionals interested in AI productivity and automation"],
    postingRecommendations: ["Post the awareness asset early week.", "Run engagement content midweek.", "Use conversion copy near cohort or offer deadline."]
  };
}

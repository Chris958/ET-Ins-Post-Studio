type GenerateRequest = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: string;
  maxTokens?: string;
  name?: string;
  description?: string;
  sellingPointInput?: string;
  tone?: string;
  language?: string;
  imageMode?: "full" | "framed";
  slideCount?: number;
  images?: string[];
  brand?: {
    brandName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    personality?: string;
    photoStyle?: string;
    influence?: number;
  };
};

type PlannedSlide = {
  title: string;
  scenePrompt: string;
};

function safeEndpoint(baseUrl: string) {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Base URL 必须是无用户名、查询参数或锚点的 HTTPS 地址。");
  }
  const host = url.hostname.toLowerCase();
  const blocked = host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new Error("Base URL 不能指向本机或内网地址。");
  return `${url.toString().replace(/\/$/, "")}/responses`;
}

function extractText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    }
  }
  return "";
}

function extractImage(data: Record<string, unknown>) {
  const output = Array.isArray(data.output) ? data.output : [];
  const call = output.find((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "image_generation_call") as { result?: unknown } | undefined;
  return typeof call?.result === "string" ? call.result : "";
}

function parsePlan(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("视觉模型未返回可读取的内容计划。");
  return JSON.parse(cleaned.slice(start, end + 1)) as {
    analysis?: string;
    sellingPoints?: string[];
    caption?: string;
    hashtags?: string[];
    slides?: PlannedSlide[];
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest;
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const images = Array.isArray(body.images) ? body.images.filter((image) => typeof image === "string" && image.startsWith("data:image/")) : [];
    const slideCount = Math.min(6, Math.max(4, Number(body.slideCount) || 6));
    const language = ["English", "Español", "中文", "日本語", "한국어"].includes(body.language || "") ? body.language! : "English";
    const imageMode = body.imageMode === "full" ? "full" : "framed";
    if (!apiKey || !model || !body.baseUrl) return Response.json({ error: "请先完成 API Key、Base URL 和模型配置。" }, { status: 400 });
    if (!images.length) return Response.json({ error: "请至少上传一张产品图片。" }, { status: 400 });
    const endpoint = safeEndpoint(body.baseUrl);
    const timeoutMs = Math.min(180, Math.max(20, Number(body.timeout) || 90)) * 1000;
    const maxOutputTokens = Math.min(12000, Math.max(1200, Number(body.maxTokens) || 4096));
    const brand = body.brand || {};
    const brandInfluence = Math.min(100, Math.max(0, Number(brand.influence) || 0));
    const brandDirection = `Brand name: ${brand.brandName || "not specified"}. Brand personality: ${brand.personality || "not specified"}. Photography direction: ${brand.photoStyle || "not specified"}. Preferred palette: primary ${brand.primaryColor || "unspecified"}, secondary ${brand.secondaryColor || "unspecified"}, accent ${brand.accentColor || "unspecified"}. Brand influence strength: ${brandInfluence}/100. Treat these as weighted art-direction signals, not a rigid template.`;

    async function callResponses(payload: Record<string, unknown>) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        const error = data.error && typeof data.error === "object" ? (data.error as { message?: unknown }).message : undefined;
        throw new Error(typeof error === "string" ? error : `API 请求失败（${response.status}）`);
      }
      return data;
    }

    const planPrompt = `你是一名 Instagram 产品内容总监和视觉策划。分析所有参考图片、产品描述与用户提供的卖点，识别真实可见的产品主体、材质、颜色、结构、功能线索、使用场景和最有说服力的传播价值。不要虚构图片或描述中无法确认的规格。每张图必须根据产品形态和信息目标重新设计构图，禁止复用固定模板、固定元素位置或重复场景。\n\n产品名称：${body.name || "未命名产品"}\n产品描述：${body.description || "无"}\n用户提供卖点：${body.sellingPointInput || "无"}\n文案语气：${body.tone || "Warm & friendly"}\n输出语言：${language}\n图片数量：${slideCount}\n构图方向：${imageMode === "full" ? "全图构图，画面铺满竖版画布" : "品牌留白，模型根据产品自主安排空间与品牌色环境"}\n品牌信息：${brandDirection}\n\n只返回 JSON，不要 Markdown。结构：{"analysis":"视觉与产品分析","sellingPoints":["提炼后的卖点"],"caption":"完整 Instagram 文案，包含钩子、价值、互动问题和 CTA","hashtags":["#Tag"],"slides":[{"title":"该图的内容目的","scenePrompt":"详细英文场景与构图提示词，描述产品角度、环境、光线、镜头、道具和空间关系"}]}。除了 scenePrompt 使用英语外，其余文字全部使用 ${language}。slides 必须正好 ${slideCount} 项，hashtags 必须为 3–5 个。图片序列应形成有节奏的社媒故事，但每张构图必须独立、有差异、有吸引力。`;
    const analysisResponse = await callResponses({
      model,
      input: [{ role: "user", content: [
        { type: "input_text", text: planPrompt },
        ...images.map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
      ] }],
      max_output_tokens: maxOutputTokens,
    });
    const plan = parsePlan(extractText(analysisResponse));
    const plannedSlides = Array.isArray(plan.slides) ? plan.slides.slice(0, slideCount) : [];
    if (plannedSlides.length !== slideCount) throw new Error("视觉模型返回的轮播页数不完整，请重新生成。");

    const references = images.slice(0, 4);
    const imageResults = await Promise.allSettled(plannedSlides.map(async (slide, index) => {
      const layoutPrompt = imageMode === "full"
        ? "Create an edge-to-edge full-bleed vertical photograph. The image itself must fill the entire canvas without any frame, card, border, template, text panel, or blank margin."
        : "Create an art-directed vertical composition with organically placed breathing room and brand-colored environmental cues. The layout must be invented for this specific product, not taken from a reusable frame or template.";
      const prompt = `Art-direct and create a premium, photorealistic vertical Instagram product image using the attached product references. Preserve the exact product identity, proportions, materials, colors, controls, openings, and construction. Do not redesign or invent parts. Independently determine the strongest composition for this product and this scene; do not reuse a fixed layout. Scene ${index + 1}: ${slide.scenePrompt}. ${layoutPrompt} ${brandDirection} Brand colors should influence lighting, surfaces, props, or atmosphere with strength ${brandInfluence}/100, while the product remains accurate and visually dominant. No text, captions, typography, logos, watermarks, graphic badges, frames, or collage. The exact brand logo will be applied later as a separate layer.`;
      const response = await callResponses({
        model,
        input: [{ role: "user", content: [
          { type: "input_text", text: prompt },
          ...references.map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
        ] }],
        tools: [{ type: "image_generation", action: "generate", size: "1024x1536", quality: "medium" }],
        tool_choice: { type: "image_generation" },
      });
      const result = extractImage(response);
      if (!result) throw new Error(`第 ${index + 1} 张图片未返回结果。`);
      return `data:image/png;base64,${result}`;
    }));

    const generatedImages = imageResults.map((result) => result.status === "fulfilled" ? result.value : "");
    const imageErrors = imageResults.flatMap((result, index) => result.status === "rejected" ? [`第 ${index + 1} 张：${result.reason instanceof Error ? result.reason.message : "生成失败"}`] : []);
    return Response.json({
      analysis: plan.analysis || "",
      sellingPoints: Array.isArray(plan.sellingPoints) ? plan.sellingPoints.slice(0, 6) : [],
      caption: plan.caption || "",
      hashtags: Array.isArray(plan.hashtags) ? plan.hashtags.slice(0, 5) : [],
      slides: plannedSlides,
      generatedImages,
      imageErrors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 生成失败，请检查配置后重试。";
    return Response.json({ error: message }, { status: 500 });
  }
}

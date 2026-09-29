type RegenerateRequest = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: string;
  name?: string;
  description?: string;
  sellingPoints?: string[];
  imageMode?: "full" | "framed";
  scenePrompt?: string;
  instruction?: string;
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

function extractImage(data: Record<string, unknown>) {
  const output = Array.isArray(data.output) ? data.output : [];
  const call = output.find((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "image_generation_call") as { result?: unknown } | undefined;
  return typeof call?.result === "string" ? call.result : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as RegenerateRequest;
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const images = Array.isArray(body.images) ? body.images.filter((image) => typeof image === "string" && image.startsWith("data:image/")) : [];
    if (!apiKey || !model || !body.baseUrl) return Response.json({ error: "请先完成 API Key、Base URL 和模型配置。" }, { status: 400 });
    if (!images.length) return Response.json({ error: "缺少产品参考图，无法重构。" }, { status: 400 });

    const endpoint = safeEndpoint(body.baseUrl);
    const timeoutMs = Math.min(180, Math.max(20, Number(body.timeout) || 90)) * 1000;
    const brand = body.brand || {};
    const influence = Math.min(100, Math.max(0, Number(brand.influence) || 0));
    const layoutDirection = body.imageMode === "full"
      ? "Create a full-bleed image that fills every edge of the 4:5 canvas. No borders, frames, cards, panels, or blank margins."
      : "Invent an organic composition with purposeful breathing room and environmental depth. Do not use a reusable frame, card, panel, or template.";
    const prompt = `Recompose one premium, photorealistic vertical social-media product image from the attached product references. Preserve the exact product identity, proportions, colors, materials, controls, openings, and construction; never invent or redesign parts. Product: ${body.name || "unnamed product"}. Description: ${body.description || "not provided"}. Verified selling points: ${(body.sellingPoints || []).join(", ") || "not provided"}. Existing art direction: ${body.scenePrompt || "determine the strongest scene from the references"}. User adjustment: ${body.instruction || "create a clearly different, stronger composition"}. ${layoutDirection} Brand direction: ${brand.brandName || "unspecified brand"}; personality ${brand.personality || "unspecified"}; photography ${brand.photoStyle || "unspecified"}; palette ${brand.primaryColor || "unspecified"}, ${brand.secondaryColor || "unspecified"}, ${brand.accentColor || "unspecified"}; influence ${influence}/100. Treat brand attributes as weighted art direction expressed through lighting, surfaces, props, and atmosphere—not as a rigid layout. No text, captions, typography, logos, watermarks, graphic badges, collages, or template elements. The exact logo will be added later as a separate editable layer.`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content: [
          { type: "input_text", text: prompt },
          ...images.slice(0, 4).map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
        ] }],
        tools: [{ type: "image_generation", action: "generate", size: "1024x1536", quality: "medium" }],
        tool_choice: { type: "image_generation" },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const error = data.error && typeof data.error === "object" ? (data.error as { message?: unknown }).message : undefined;
      throw new Error(typeof error === "string" ? error : `API 请求失败（${response.status}）`);
    }
    const result = extractImage(data);
    if (!result) throw new Error("图片模型未返回生成结果。");
    return Response.json({ image: `data:image/png;base64,${result}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "单图重构失败，请检查配置后重试。";
    return Response.json({ error: message }, { status: 500 });
  }
}

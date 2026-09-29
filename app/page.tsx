"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type ProductImage = { id: string; name: string; src: string };
type SlidePlan = { title: string; scenePrompt?: string };
type BrandConfig = {
  brandName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  personality: string;
  photoStyle: string;
  influence: number;
  logoPosition: string;
  logoOpacity: number;
};
type ImageEdit = {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  showLogo: boolean;
  logoPosition: string;
};
type AiResponse = {
  error?: string;
  analysis?: string;
  sellingPoints?: string[];
  caption?: string;
  hashtags?: string[];
  slides?: SlidePlan[];
  generatedImages?: string[];
  imageErrors?: string[];
  image?: string;
};

const defaultBrand: BrandConfig = {
  brandName: "",
  logo: "",
  primaryColor: "#60adf2",
  secondaryColor: "#eaf6ff",
  accentColor: "#142c48",
  personality: "Modern & minimal",
  photoStyle: "Soft natural commercial photography",
  influence: 55,
  logoPosition: "bottom-right",
  logoOpacity: 90,
};
const defaultEdit: ImageEdit = { scale: 100, x: 0, y: 0, rotation: 0, brightness: 100, contrast: 100, saturation: 100, showLogo: true, logoPosition: "bottom-right" };

const fallbackTitles: Record<string, string[]> = {
  English: ["Hero story", "Core benefit", "Design details", "In real life", "Emotional value", "Closing scene"],
  Español: ["Historia principal", "Beneficio clave", "Detalles de diseño", "En la vida real", "Valor emocional", "Escena final"],
  中文: ["核心主视觉", "核心卖点", "设计细节", "真实使用场景", "情绪价值", "收尾场景"],
  日本語: ["メインビジュアル", "主なメリット", "デザインの細部", "使用シーン", "感情的な価値", "クロージング"],
  한국어: ["메인 비주얼", "핵심 장점", "디자인 디테일", "실제 사용 장면", "감성 가치", "마무리 장면"],
};

function fallbackCaption(name: string, description: string, language: string) {
  const product = name || "this product";
  if (language === "Español") return `Diseñado para verse bien y funcionar aún mejor.\n\nConoce ${product}. ${description}\n\n¿Qué detalle te llama más la atención? Cuéntanos abajo ↓`;
  if (language === "中文") return `好设计，不只要好看，更要真正好用。\n\n认识一下 ${product}。${description}\n\n哪个细节最吸引你？欢迎在评论区告诉我们 ↓`;
  if (language === "日本語") return `美しさだけでなく、使いやすさまで考えたデザイン。\n\n${product}をご紹介します。${description}\n\n気になるポイントをコメントで教えてください ↓`;
  if (language === "한국어") return `보기 좋은 디자인을 넘어, 실제 사용까지 생각했습니다.\n\n${product}을 소개합니다. ${description}\n\n어떤 디테일이 가장 마음에 드시나요? 댓글로 알려주세요 ↓`;
  return `Designed to look good—and work even better.\n\nMeet ${product}. ${description}\n\nWhich detail stands out to you most? Tell us below ↓`;
}

function fallbackHashtags(name: string, description: string) {
  const raw = `${name} ${description}`.toLowerCase();
  const tags = ["#ProductDesign", "#MadeForYou", "#ThoughtfulDesign"];
  if (/tech|mac|computer|科技|数码/.test(raw)) tags[0] = "#TechAccessories";
  if (/home|desk|家居|桌面/.test(raw)) tags.push("#HomeEssentials");
  else tags.push("#DailyUpgrade");
  return tags;
}

export default function Home() {
  const [name, setName] = useState("Aero Stand");
  const [description, setDescription] = useState("A lightweight product designed for a cleaner, more comfortable modern workspace.");
  const [sellingPointInput, setSellingPointInput] = useState("");
  const [tone, setTone] = useState("Warm & friendly");
  const [language, setLanguage] = useState("English");
  const [imageMode, setImageMode] = useState<"full" | "framed">("full");
  const [slideCount, setSlideCount] = useState(6);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [slides, setSlides] = useState<SlidePlan[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [brand, setBrand] = useState<BrandConfig>(defaultBrand);
  const [edits, setEdits] = useState<Record<number, ImageEdit>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftEdit, setDraftEdit] = useState<ImageEdit>(defaultEdit);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [apiError, setApiError] = useState("");
  const [imageWarnings, setImageWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("socialmuse-brand-kit");
        if (saved) setBrand({ ...defaultBrand, ...JSON.parse(saved) });
      } catch { /* use defaults */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const fallbackSlides = useMemo(() => (fallbackTitles[language] || fallbackTitles.English).slice(0, slideCount).map((title) => ({ title })), [language, slideCount]);
  const visibleSlides = slides.length === slideCount ? slides : fallbackSlides;
  const visibleCaption = caption || fallbackCaption(name, description, language);
  const visibleHashtags = hashtags.length ? hashtags : fallbackHashtags(name, description);

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    Promise.all(files.map((file, index) => new Promise<ProductImage>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: `${Date.now()}-${index}-${Math.random()}`, name: file.name, src: String(reader.result) });
      reader.readAsDataURL(file);
    }))).then((next) => setImages((current) => [...current, ...next]));
    setAiImages([]);
    setEdits({});
    event.target.value = "";
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
    setAiImages([]);
    setEdits({});
  }

  function getSettings() {
    try { return JSON.parse(window.localStorage.getItem("socialmuse-api-settings") || "{}") as Record<string, string>; }
    catch { return {} as Record<string, string>; }
  }

  async function generate() {
    setApiError("");
    setImageWarnings([]);
    if (!images.length) return setApiError("请至少上传一张清晰的产品图片。");
    const settings = getSettings();
    if (!settings.apiKey || !settings.baseUrl || !settings.model) return setApiError("尚未完成 API 配置。请先前往 Settings 填写 API Key、Base URL 和模型。");
    setGenerating(true);
    setLoadingMessage(`正在分析 ${images.length} 张产品图片、卖点与品牌特征…`);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...settings, name, description, sellingPointInput, tone, language, imageMode, slideCount, brand, images: images.map((image) => image.src),
      }) });
      setLoadingMessage("模型正在为每张素材设计不同构图与场景…");
      const data = await response.json() as AiResponse;
      if (!response.ok || data.error) throw new Error(data.error || "AI 生成失败。");
      setAiImages(data.generatedImages || []);
      setSlides((data.slides || []).slice(0, slideCount));
      setCaption(data.caption || "");
      setHashtags((data.hashtags || []).slice(0, 5));
      setAnalysis(data.analysis || "");
      setSellingPoints((data.sellingPoints || []).slice(0, 6));
      setImageWarnings(data.imageErrors || []);
      setEdits({});
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "AI 生成失败，请检查 API 配置。");
    } finally { setGenerating(false); }
  }

  function openEditor(index: number) {
    setEditingIndex(index);
    setDraftEdit({ ...defaultEdit, logoPosition: brand.logoPosition, ...(edits[index] || {}) });
    setRegeneratePrompt("");
  }

  function applyEdit() {
    if (editingIndex === null) return;
    setEdits((current) => ({ ...current, [editingIndex]: draftEdit }));
    setEditingIndex(null);
  }

  async function regenerateSingle() {
    if (editingIndex === null) return;
    const settings = getSettings();
    if (!settings.apiKey || !settings.baseUrl || !settings.model) return setApiError("请先完成 API 配置。");
    setRegenerating(true);
    try {
      const response = await fetch("/api/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...settings,
        name,
        description,
        sellingPoints: sellingPoints.length ? sellingPoints : sellingPointInput.split(/[，,;；\n]/).filter(Boolean),
        brand,
        imageMode,
        scenePrompt: visibleSlides[editingIndex]?.scenePrompt || visibleSlides[editingIndex]?.title,
        instruction: regeneratePrompt,
        images: images.map((image) => image.src),
      }) });
      const data = await response.json() as AiResponse;
      if (!response.ok || data.error || !data.image) throw new Error(data.error || "单图重绘失败。");
      setAiImages((current) => {
        const next = [...current];
        while (next.length < slideCount) next.push("");
        next[editingIndex] = data.image!;
        return next;
      });
      setDraftEdit({ ...defaultEdit, logoPosition: brand.logoPosition });
      setEdits((current) => ({ ...current, [editingIndex]: { ...defaultEdit, logoPosition: brand.logoPosition } }));
      setRegeneratePrompt("");
    } catch (error) { setApiError(error instanceof Error ? error.message : "单图重绘失败。"); }
    finally { setRegenerating(false); }
  }

  function copyCaption() {
    navigator.clipboard.writeText(`${visibleCaption}\n\n${visibleHashtags.join(" ")}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function downloadImage(index: number, source: string) {
    if (!source) return;
    const edit = { ...defaultEdit, logoPosition: brand.logoPosition, ...(edits[index] || {}) };
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = await loadImage(source);
    ctx.fillStyle = brand.secondaryColor || "#f4f7fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cover = Math.max(canvas.width / image.width, canvas.height / image.height) * edit.scale / 100;
    ctx.save();
    ctx.translate(canvas.width / 2 + canvas.width * edit.x / 100, canvas.height / 2 + canvas.height * edit.y / 100);
    ctx.rotate(edit.rotation * Math.PI / 180);
    ctx.filter = `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturation}%)`;
    ctx.drawImage(image, -image.width * cover / 2, -image.height * cover / 2, image.width * cover, image.height * cover);
    ctx.restore();
    if (brand.logo && edit.showLogo) {
      const logo = await loadImage(brand.logo);
      drawLogo(ctx, logo, edit.logoPosition, brand.logoOpacity);
    }
    const anchor = document.createElement("a");
    anchor.download = `socialmuse-${index + 1}.png`;
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }

  return <main>
    <header className="topbar">
      <Link className="brand" href="/"><span className="brandMark">S</span><span>SocialMuse</span></Link>
      <nav aria-label="主导航"><Link className="navActive" href="/">Create</Link><button className="navDisabled" type="button" aria-disabled="true" title="Coming soon">Library</button><Link href="/brand">Brand Kit</Link><Link href="/settings">Settings</Link></nav>
      <div className="headerActions">{brand.brandName && <span className="brandConnected">● {brand.brandName}</span>}<button className="avatar">CC</button></div>
    </header>

    <section className="hero"><div><p className="kicker">AI SOCIAL CONTENT STUDIO</p><h1>Your product, <em>art directed by AI.</em></h1><p className="heroCopy">模型理解产品图片、描述、卖点与品牌风格，为每张社媒素材重新设计构图和场景。</p></div></section>

    <section className="workspace">
      <aside className="inputPanel">
        <div className="sectionHead"><span className="step">1</span><div><h2>Product intelligence</h2><p>提供真实信息，让模型理解产品与传播目标。</p></div></div>
        <label className="fieldLabel" htmlFor="productName">产品名称</label><input id="productName" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="fieldLabel" htmlFor="description">产品描述</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={800} />
        <label className="fieldLabel" htmlFor="sellingPoints">核心卖点</label><textarea id="sellingPoints" className="shortTextarea" value={sellingPointInput} onChange={(e) => setSellingPointInput(e.target.value)} placeholder="每行填写一个卖点，例如：提升散热 / 防尘滤网 / 一键开关" maxLength={500} />
        <label className="fieldLabel">产品图片</label>
        <label className="upload"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onUpload} /><span className="uploadIcon">↥</span><div><strong>上传全部产品参考图</strong><span>数量不限 · 多角度有助于保持产品一致性</span></div></label>
        {images.length > 0 && <div className="imageLibrary"><div className="libraryHead"><span>已上传 {images.length} 张</span><small>全部用于视觉分析</small></div><div className="thumbGrid">{images.map((item, index) => <div className="thumb" key={item.id}><img src={item.src} alt={`产品素材 ${index + 1}`} /><span>{index + 1}</span><button onClick={() => removeImage(item.id)} aria-label={`删除图片 ${index + 1}`}>×</button></div>)}</div></div>}
        <div className="splitFields threeFields">
          <div><label className="fieldLabel" htmlFor="language">文案语言</label><select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}><option>English</option><option>Español</option><option>中文</option><option>日本語</option><option>한국어</option></select></div>
          <div><label className="fieldLabel" htmlFor="tone">文案语气</label><select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}><option>Warm & friendly</option><option>Playful</option><option>Premium</option><option>Professional</option></select></div>
          <div><label className="fieldLabel" htmlFor="count">素材数量</label><select id="count" value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}><option value={4}>4</option><option value={5}>5</option><option value={6}>6</option></select></div>
        </div>
        <label className="fieldLabel">AI 构图方向</label><div className="modeSwitch" role="group" aria-label="AI 构图方向">
          <button type="button" aria-pressed={imageMode === "full"} className={imageMode === "full" ? "active" : ""} onClick={() => setImageMode("full")}><span className="modeIcon fullIcon"><i /></span><div><strong>全图构图</strong><small>模型生成完整铺满的场景图</small></div></button>
          <button type="button" aria-pressed={imageMode === "framed"} className={imageMode === "framed" ? "active" : ""} onClick={() => setImageMode("framed")}><span className="modeIcon frameIcon"><i /></span><div><strong>品牌留白</strong><small>模型自主使用品牌色和留白</small></div></button>
        </div>
        <button className="generateBtn" onClick={generate} disabled={generating}><span>✦</span>{generating ? "AI 正在创作…" : "Generate Social Content"}</button>
        {apiError && <div className="apiError"><span>!</span><p>{apiError} {apiError.includes("Settings") && <Link href="/settings">前往设置 →</Link>}</p></div>}
      </aside>

      <section className="outputPanel">
        <div className="sectionHead outputHead"><span className="step">2</span><div><h2>Model-directed campaign</h2><p>每张图片由模型独立构图，不套用固定模板。</p></div><span className="ready">✓ Editable</span></div>
        {generating ? <div className="loading"><div className="spark">✦</div><h3>正在生成你的社媒内容…</h3><p>{loadingMessage}</p></div> : <>
          {analysis && <div className="analysisCard"><div className="analysisTitle"><span>✦</span><div><strong>AI Product Analysis</strong><small>视觉特征、描述与品牌共同分析</small></div></div><p>{analysis}</p><div>{sellingPoints.map((point) => <span key={point}>✓ {point}</span>)}</div></div>}
          <div className="previewArea rawPreview"><div className="slideRail" role="list" aria-label="AI 社媒图片预览">{visibleSlides.map((slide, index) => {
            const source = aiImages[index] || (images.length ? images[index % images.length].src : "");
            const edit = { ...defaultEdit, logoPosition: brand.logoPosition, ...(edits[index] || {}) };
            return <PostCard key={`${slide.title}-${index}`} title={slide.title} source={source} index={index} edit={edit} brand={brand} onEdit={() => openEditor(index)} onDownload={() => downloadImage(index, source)} />;
          })}</div><div className="railFooter"><span>{slideCount} images · final export 1080 × 1350px</span><span>每张图片可独立编辑</span></div></div>
          <div className="captionCard"><div className="captionTitle"><div><span>Caption</span><small>{visibleCaption.length} characters</small></div><button onClick={copyCaption}>{copied ? "✓ 已复制" : "复制文案"}</button></div><p>{visibleCaption}</p><div className="tags">{visibleHashtags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
          {imageWarnings.length > 0 && <div className="imageWarnings"><strong>部分图片生成失败</strong><span>{imageWarnings.join(" · ")}</span></div>}
        </>}
      </section>
    </section>

    {editingIndex !== null && <ImageEditor index={editingIndex} source={aiImages[editingIndex] || (images.length ? images[editingIndex % images.length].src : "")} edit={draftEdit} brand={brand} prompt={regeneratePrompt} regenerating={regenerating} onChange={setDraftEdit} onPrompt={setRegeneratePrompt} onRegenerate={regenerateSingle} onApply={applyEdit} onClose={() => setEditingIndex(null)} />}
  </main>;
}

function PostCard({ title, source, index, edit, brand, onEdit, onDownload }: { title: string; source: string; index: number; edit: ImageEdit; brand: BrandConfig; onEdit: () => void; onDownload: () => void }) {
  return <article className="postWrap rawCard" role="listitem"><div className="rawMedia">{source ? <img className="mediaImage" src={source} alt={`AI 素材 ${index + 1}`} style={imageStyle(edit)} /> : <div className="emptyMedia"><span>✦</span><small>Generate image</small></div>}{brand.logo && edit.showLogo && <img className={`brandLogoOverlay ${edit.logoPosition}`} src={brand.logo} alt="" style={{ opacity: brand.logoOpacity / 100 }} />}</div><div className="cardActions expanded"><div><span>0{index + 1}</span><strong>{title}</strong></div><div><button onClick={onEdit} title="单独编辑">✎</button><button onClick={onDownload} title="下载 PNG">↓</button></div></div></article>;
}

function ImageEditor({ index, source, edit, brand, prompt, regenerating, onChange, onPrompt, onRegenerate, onApply, onClose }: { index: number; source: string; edit: ImageEdit; brand: BrandConfig; prompt: string; regenerating: boolean; onChange: (edit: ImageEdit) => void; onPrompt: (value: string) => void; onRegenerate: () => void; onApply: () => void; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyDown); };
  }, [onClose]);
  const set = (key: keyof ImageEdit, value: number | boolean | string) => onChange({ ...edit, [key]: value });
  return <div className="editorBackdrop" role="dialog" aria-modal="true" aria-labelledby="image-editor-title"><div className="imageEditor"><div className="editorHead"><div><span>0{index + 1}</span><h2 id="image-editor-title">Edit image</h2></div><button type="button" onClick={onClose} aria-label="关闭图片编辑器">×</button></div><div className="editorBody"><div className="editorCanvas">{source ? <img src={source} alt="编辑预览" style={imageStyle(edit)} /> : <div className="emptyMedia">No image</div>}{brand.logo && edit.showLogo && <img className={`brandLogoOverlay ${edit.logoPosition}`} src={brand.logo} alt="" style={{ opacity: brand.logoOpacity / 100 }} />}</div><div className="editorControls"><h3>独立画面调整</h3><Range label="缩放" value={edit.scale} min={80} max={180} unit="%" onChange={(v) => set("scale", v)} /><Range label="水平位置" value={edit.x} min={-40} max={40} unit="%" onChange={(v) => set("x", v)} /><Range label="垂直位置" value={edit.y} min={-40} max={40} unit="%" onChange={(v) => set("y", v)} /><Range label="旋转" value={edit.rotation} min={-15} max={15} unit="°" onChange={(v) => set("rotation", v)} /><Range label="亮度" value={edit.brightness} min={60} max={140} unit="%" onChange={(v) => set("brightness", v)} /><Range label="对比度" value={edit.contrast} min={60} max={160} unit="%" onChange={(v) => set("contrast", v)} /><Range label="饱和度" value={edit.saturation} min={0} max={180} unit="%" onChange={(v) => set("saturation", v)} /><div className="logoEdit"><label><input type="checkbox" checked={edit.showLogo} onChange={(e) => set("showLogo", e.target.checked)} />显示品牌 Logo</label><select value={edit.logoPosition} onChange={(e) => set("logoPosition", e.target.value)}><option value="top-left">左上</option><option value="top-right">右上</option><option value="bottom-left">左下</option><option value="bottom-right">右下</option></select></div><div className="aiRecompose"><h3>AI 单图重绘</h3><textarea value={prompt} onChange={(e) => onPrompt(e.target.value)} placeholder="例如：改为温暖的家庭办公场景，产品角度保持不变" /><button onClick={onRegenerate} disabled={regenerating}>{regenerating ? "正在重绘…" : "✦ 重新编排这一张"}</button></div></div></div><div className="editorFoot"><button onClick={() => onChange({ ...defaultEdit, logoPosition: brand.logoPosition })}>重置调整</button><div><button onClick={onClose}>取消</button><button className="applyEdit" onClick={onApply}>应用调整</button></div></div></div></div>;
}

function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return <label className="editRange"><span>{label}<em>{value}{unit}</em></span><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function imageStyle(edit: ImageEdit) {
  return { transform: `translate(${edit.x}%, ${edit.y}%) scale(${edit.scale / 100}) rotate(${edit.rotation}deg)`, filter: `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturation}%)` };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, position: string, opacity: number) {
  const maxWidth = 190, maxHeight = 100;
  const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const width = logo.width * ratio, height = logo.height * ratio, margin = 52;
  const x = position.includes("right") ? 1080 - width - margin : margin;
  const y = position.includes("bottom") ? 1350 - height - margin : margin;
  ctx.save(); ctx.globalAlpha = opacity / 100; ctx.drawImage(logo, x, y, width, height); ctx.restore();
}

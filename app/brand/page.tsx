"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";

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

const STORAGE_KEY = "socialmuse-brand-kit";
const defaults: BrandConfig = { brandName: "", logo: "", primaryColor: "#60adf2", secondaryColor: "#eaf6ff", accentColor: "#142c48", personality: "Modern & minimal", photoStyle: "Soft natural commercial photography", influence: 55, logoPosition: "bottom-right", logoOpacity: 90 };

export default function BrandPage() {
  const [brand, setBrand] = useState(defaults);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) setBrand({ ...defaults, ...JSON.parse(saved) }); } catch { setMessage("无法读取品牌配置。"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const update = <K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) => { setBrand((current) => ({ ...current, [key]: value })); setMessage(""); };

  function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setMessage("Logo 文件请控制在 4MB 以内。"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 700 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        update("logo", canvas.toDataURL("image/png"));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(brand)); setMessage("品牌配置已保存，并会应用到后续生成任务。"); }
    catch { setMessage("保存失败，Logo 可能过大或浏览器不允许本地存储。"); }
  }

  function reset() { setBrand(defaults); window.localStorage.removeItem(STORAGE_KEY); setMessage("已恢复默认品牌配置。"); }

  return <main className="settingsPage">
    <header className="topbar"><Link className="brand" href="/"><span className="brandMark">S</span><span>SocialMuse</span></Link><nav aria-label="主导航"><Link href="/">Create</Link><button className="navDisabled" type="button" aria-disabled="true" title="Coming soon">Library</button><Link className="navActive" href="/brand">Brand Kit</Link><Link href="/settings">Settings</Link></nav><div className="headerActions"><button className="avatar">CC</button></div></header>
    <section className="settingsHero brandHero"><div><p className="kicker">BRAND INTELLIGENCE</p><h1>Make every image<br /><em>feel unmistakably yours.</em></h1><p>品牌配置会以可调权重影响 AI 构图、环境、光线和色彩；Logo 使用精确图层输出。</p></div><Link className="backCreate" href="/">← 返回创作页面</Link></section>
    <section className="brandLayout">
      <section className="settingsCard brandForm">
        <div className="settingsCardHead"><div><span className="settingsIcon">◫</span><div><h2>Brand foundations</h2><p>建立可重复使用的品牌视觉基因。</p></div></div><span className="localBadge">Applied to AI</span></div>
        <div className="formSection"><h3>Identity</h3><div className="settingsGrid"><div><label htmlFor="brandName">品牌名称</label><input id="brandName" value={brand.brandName} onChange={(e) => update("brandName", e.target.value)} placeholder="Your brand" /></div><div><label>品牌 Logo</label><label className="logoUpload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} />{brand.logo ? <img src={brand.logo} alt="品牌 Logo" /> : <span>＋ 上传 Logo</span>}</label></div></div></div>
        <div className="formSection"><h3>Color system</h3><div className="colorGrid"><ColorField label="主题色" value={brand.primaryColor} onChange={(v) => update("primaryColor", v)} /><ColorField label="辅助色" value={brand.secondaryColor} onChange={(v) => update("secondaryColor", v)} /><ColorField label="强调色" value={brand.accentColor} onChange={(v) => update("accentColor", v)} /></div></div>
        <div className="formSection"><h3>Visual direction</h3><div className="settingsGrid"><div><label htmlFor="personality">品牌个性</label><select id="personality" value={brand.personality} onChange={(e) => update("personality", e.target.value)}><option>Modern & minimal</option><option>Warm & human</option><option>Bold & energetic</option><option>Premium & refined</option><option>Playful & colorful</option><option>Technical & precise</option></select></div><div><label htmlFor="photoStyle">摄影风格</label><select id="photoStyle" value={brand.photoStyle} onChange={(e) => update("photoStyle", e.target.value)}><option>Soft natural commercial photography</option><option>Clean studio product photography</option><option>Warm lifestyle photography</option><option>Editorial luxury photography</option><option>Bold high-contrast campaign</option><option>Minimal Apple-inspired photography</option></select></div></div><label className="brandInfluence"><span><strong>品牌影响权重</strong><em>{brand.influence}%</em></span><input type="range" min="0" max="100" value={brand.influence} onChange={(e) => update("influence", Number(e.target.value))} /><small>较低权重让模型更自由；较高权重会更严格遵循品牌色彩与视觉个性。</small></label></div>
        <div className="formSection"><h3>Logo behavior</h3><div className="settingsGrid"><div><label htmlFor="logoPosition">默认位置</label><select id="logoPosition" value={brand.logoPosition} onChange={(e) => update("logoPosition", e.target.value)}><option value="top-left">左上</option><option value="top-right">右上</option><option value="bottom-left">左下</option><option value="bottom-right">右下</option></select></div><div><label htmlFor="logoOpacity">默认透明度</label><div className="suffixInput"><input id="logoOpacity" type="number" min="10" max="100" value={brand.logoOpacity} onChange={(e) => update("logoOpacity", Math.min(100, Math.max(10, Number(e.target.value))))} /><span>%</span></div></div></div></div>
        {message && <div className="settingsStatus saved"><span>✓</span>{message}</div>}
        <div className="settingsActions"><button className="resetButton" onClick={reset}>恢复默认</button><button className="saveButton" onClick={save}>保存 Brand Kit</button></div>
      </section>
      <aside className="brandPreview"><p>LIVE BRAND PREVIEW</p><div className="brandPreviewCard" style={{ background: `linear-gradient(145deg, ${brand.secondaryColor}, ${brand.primaryColor})` }}><span className="previewOrb" style={{ background: brand.accentColor }} />{brand.logo ? <img className={`brandLogoOverlay ${brand.logoPosition}`} src={brand.logo} alt="品牌 Logo 预览" style={{ opacity: brand.logoOpacity / 100 }} /> : <span className="previewBrandName">{brand.brandName || "YOUR BRAND"}</span>}<div><small>{brand.personality}</small><strong>{brand.brandName || "Build a recognizable visual language."}</strong><em>{brand.photoStyle}</em></div></div><div className="brandSummary"><span><i style={{ background: brand.primaryColor }} />主题色</span><span><i style={{ background: brand.secondaryColor }} />辅助色</span><span><i style={{ background: brand.accentColor }} />强调色</span><p>AI influence <strong>{brand.influence}%</strong></p></div></aside>
    </section>
  </main>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="colorField"><span>{label}</span><div><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /><input value={value.toUpperCase()} onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && onChange(e.target.value)} /></div></label>;
}

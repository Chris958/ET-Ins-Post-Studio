"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ApiSettings = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeout: string;
  maxTokens: string;
};

const STORAGE_KEY = "socialmuse-api-settings";
const defaults: ApiSettings = {
  provider: "OpenAI Compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4.1-mini",
  timeout: "90",
  maxTokens: "4096",
};

const providerDefaults: Record<string, string> = {
  "OpenAI Compatible": "https://api.openai.com/v1",
  "Custom Responses API": "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings>(defaults);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "valid" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setSettings({ ...defaults, ...JSON.parse(saved) });
      } catch {
        setMessage("无法读取当前浏览器中的历史配置。");
        setStatus("error");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update<K extends keyof ApiSettings>(key: K, value: ApiSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setStatus("idle");
    setMessage("");
  }

  function changeProvider(provider: string) {
    setSettings((current) => ({ ...current, provider, baseUrl: providerDefaults[provider] }));
    setStatus("idle");
    setMessage("");
  }

  function validate() {
    if (!settings.baseUrl.trim()) {
      setStatus("error");
      setMessage("请填写 Base URL。");
      return false;
    }
    try {
      const parsed = new URL(settings.baseUrl);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      setStatus("error");
      setMessage("Base URL 格式无效，需要以 http:// 或 https:// 开头。");
      return false;
    }
    if (!settings.apiKey.trim()) {
      setStatus("error");
      setMessage("请填写 API Key。");
      return false;
    }
    if (!settings.model.trim()) {
      setStatus("error");
      setMessage("请填写模型名称。");
      return false;
    }
    setStatus("valid");
    setMessage("配置格式检查通过，可以保存使用。");
    return true;
  }

  function save() {
    if (!validate()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setStatus("saved");
      setMessage("API 配置已保存到当前浏览器。");
    } catch {
      setStatus("error");
      setMessage("保存失败，请检查浏览器是否允许本地存储。");
    }
  }

  function reset() {
    setSettings(defaults);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("idle");
    setMessage("已恢复默认配置。");
  }

  return <main className="settingsPage">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brandMark">S</span><span>SocialMuse</span></Link>
      <nav aria-label="主导航"><Link href="/">Create</Link><button className="navDisabled" type="button" aria-disabled="true" title="Coming soon">Library</button><Link href="/brand">Brand Kit</Link><Link className="navActive" href="/settings">Settings</Link></nav>
      <div className="headerActions"><span className="plan">Free plan</span><button className="avatar">CC</button></div>
    </header>

    <section className="settingsHero">
      <div><p className="kicker">WORKSPACE SETTINGS</p><h1>Connect your<br /><em>AI provider.</em></h1><p>配置用于图片分析、素材生成和文案创作的 API 服务。</p></div>
      <Link className="backCreate" href="/">← 返回创作页面</Link>
    </section>

    <section className="settingsLayout">
      <aside className="settingsNav">
        <p>SETTINGS</p>
        <button className="settingActive"><span>⌁</span><div><strong>API Connection</strong><small>服务商与访问凭证</small></div></button>
        <Link className="settingsNavLink" href="/brand"><span>◫</span><div><strong>Brand Defaults</strong><small>品牌语气与输出偏好</small></div></Link>
        <button type="button" disabled title="Coming soon"><span>◎</span><div><strong>Generation</strong><small>图片尺寸与内容规则</small></div></button>
        <div className="settingsTip"><span>🔒</span><p><strong>本地安全存储</strong><small>API Key 仅保存在当前浏览器；生成时会安全转发给你配置的 API，不在服务器留存。</small></p></div>
      </aside>

      <section className="settingsCard">
        <div className="settingsCardHead"><div><span className="settingsIcon">⌁</span><div><h2>API Connection</h2><p>连接 OpenAI 兼容接口或自定义 AI 服务。</p></div></div><span className="localBadge">Browser only</span></div>

        <div className="formSection">
          <h3>Provider</h3>
          <div className="settingsGrid">
            <div className="full"><label htmlFor="provider">API 服务商</label><select id="provider" value={settings.provider} onChange={(e) => changeProvider(e.target.value)}><option>OpenAI Compatible</option><option>Custom Responses API</option></select><small>当前生成链路需要兼容 OpenAI Responses API 与 image_generation 工具。</small></div>
            <div className="full"><label htmlFor="baseUrl">Base URL</label><div className="inputWithIcon"><span>↗</span><input id="baseUrl" value={settings.baseUrl} onChange={(e) => update("baseUrl", e.target.value)} placeholder="https://api.example.com/v1" /></div><small>保留 API 版本路径，例如 /v1；末尾的斜杠可省略。</small></div>
          </div>
        </div>

        <div className="formSection">
          <h3>Authentication</h3>
          <div className="settingsGrid">
            <div className="full"><label htmlFor="apiKey">API Key</label><div className="keyInput"><span>••</span><input id="apiKey" type={showKey ? "text" : "password"} autoComplete="off" value={settings.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="sk-••••••••••••••••" /><button type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? "隐藏" : "显示"}</button></div><small>密钥不会被写入网址或展示在创作页面。</small></div>
          </div>
        </div>

        <div className="formSection">
          <h3>Model & limits</h3>
          <div className="settingsGrid three">
            <div><label htmlFor="model">视觉与编排模型</label><input id="model" value={settings.model} onChange={(e) => update("model", e.target.value)} placeholder="输入支持视觉与图片工具的模型 ID" /><small>图片由该模型调用 image_generation 工具生成。</small></div>
            <div><label htmlFor="timeout">超时时间</label><div className="suffixInput"><input id="timeout" inputMode="numeric" value={settings.timeout} onChange={(e) => update("timeout", e.target.value.replace(/\D/g, ""))} /><span>秒</span></div></div>
            <div><label htmlFor="maxTokens">最大 Tokens</label><input id="maxTokens" inputMode="numeric" value={settings.maxTokens} onChange={(e) => update("maxTokens", e.target.value.replace(/\D/g, ""))} /></div>
          </div>
        </div>

        {message && <div className={`settingsStatus ${status}`}><span>{status === "error" ? "!" : "✓"}</span>{message}</div>}
        <div className="settingsActions"><button className="resetButton" type="button" onClick={reset}>恢复默认</button><div><button className="validateButton" type="button" onClick={validate}>检查配置</button><button className="saveButton" type="button" onClick={save}>保存设置</button></div></div>
      </section>
    </section>
  </main>;
}

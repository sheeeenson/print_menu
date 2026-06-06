import { useMemo, useState } from 'react';
import { downloadHtmlRender, getSafeRenderFilename } from '../utils/htmlVideoExport.js';
import './htmlVideoConverter.css';

const DEFAULT_HTML = `<div class="html-video-demo">
  <div class="orb one"></div>
  <div class="orb two"></div>
  <p>TV PROMO</p>
  <h1>HTML → MP4</h1>
  <h2>Paste any animated HTML and export it as a video.</h2>
</div>
<style>
  .html-video-demo {
    width: 100%;
    height: 100%;
    display: grid;
    place-content: center;
    gap: 22px;
    position: relative;
    overflow: hidden;
    color: #fffaf2;
    background: radial-gradient(circle at 24% 18%, #9b1c31, transparent 34%), linear-gradient(135deg, #231f20, #513022);
    font-family: Inter, Arial, sans-serif;
    text-align: center;
  }
  .html-video-demo p {
    margin: 0;
    letter-spacing: 0.24em;
    font-size: 34px;
    font-weight: 950;
  }
  .html-video-demo h1 {
    margin: 0;
    font-size: 132px;
    line-height: .86;
    letter-spacing: -0.08em;
  }
  .html-video-demo h2 {
    margin: 0 auto;
    max-width: 880px;
    font-size: 42px;
    line-height: 1.08;
    opacity: .84;
  }
  .orb {
    position: absolute;
    width: 340px;
    height: 340px;
    border-radius: 999px;
    background: rgba(255,250,242,.16);
    filter: blur(4px);
    animation: floatOrb 8s ease-in-out infinite;
  }
  .orb.one { left: 120px; bottom: 120px; }
  .orb.two { right: 140px; top: 90px; animation-delay: -3s; }
  @keyframes floatOrb {
    0%, 100% { transform: translate3d(0,0,0) scale(1); }
    50% { transform: translate3d(42px,-36px,0) scale(1.12); }
  }
</style>`;

const FORMAT_PRESETS = [
  { id: 'landscape', label: '16:9', width: 1920, height: 1080 },
  { id: 'vertical', label: '9:16', width: 1080, height: 1920 },
  { id: 'square', label: '1:1', width: 1080, height: 1080 },
  { id: 'custom', label: 'Custom', width: 1920, height: 1080 },
];

const toNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function HtmlVideoSection() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [filename, setFilename] = useState('html-video');
  const [presetId, setPresetId] = useState('landscape');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [duration, setDuration] = useState(8);
  const [fps, setFps] = useState(24);
  const [status, setStatus] = useState('');

  const activePreset = FORMAT_PRESETS.find((preset) => preset.id === presetId) ?? FORMAT_PRESETS[0];
  const previewDocument = useMemo(() => `<!doctype html><html><head><meta charset="utf-8" /><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;}</style></head><body>${html}</body></html>`, [html]);

  const updatePreset = (nextPresetId) => {
    const nextPreset = FORMAT_PRESETS.find((preset) => preset.id === nextPresetId) ?? FORMAT_PRESETS[0];
    setPresetId(nextPreset.id);
    if (nextPreset.id !== 'custom') {
      setWidth(nextPreset.width);
      setHeight(nextPreset.height);
    }
  };

  const handleExport = async () => {
    const safeWidth = Math.min(3840, Math.max(320, toNumber(width, activePreset.width)));
    const safeHeight = Math.min(3840, Math.max(320, toNumber(height, activePreset.height)));
    const safeDuration = Math.min(30, Math.max(1, toNumber(duration, 8)));
    const safeFps = Math.min(30, Math.max(12, toNumber(fps, 24)));
    const safeFilename = `${getSafeRenderFilename(filename, 'html-video')}.mp4`;

    try {
      setStatus('Rendering MP4 on server...');
      await downloadHtmlRender({
        output: 'mp4',
        filename: safeFilename,
        format: { id: presetId, label: `${safeWidth}x${safeHeight}`, width: safeWidth, height: safeHeight },
        duration: safeDuration,
        fps: safeFps,
        html,
      });
      setStatus('MP4 video downloaded.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'MP4 export failed.');
    }
  };

  return (
    <section className="html-video-section">
      <aside className="html-video-panel">
        <header className="html-video-header">
          <p>Converter</p>
          <h2>HTML → MP4</h2>
          <span>Paste animated HTML/CSS and render it through the server-side Chromium + FFmpeg pipeline.</span>
        </header>

        <div className="html-video-group">
          <h3>Output</h3>
          <label className="html-video-field"><span>Filename</span><input value={filename} onChange={(event) => setFilename(event.target.value)} /></label>
          <label className="html-video-field"><span>Format</span><select value={presetId} onChange={(event) => updatePreset(event.target.value)}>{FORMAT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
          <div className="html-video-grid-two">
            <label className="html-video-field"><span>Width</span><input type="number" min="320" max="3840" value={width} onChange={(event) => { setPresetId('custom'); setWidth(event.target.value); }} /></label>
            <label className="html-video-field"><span>Height</span><input type="number" min="320" max="3840" value={height} onChange={(event) => { setPresetId('custom'); setHeight(event.target.value); }} /></label>
          </div>
          <div className="html-video-grid-two">
            <label className="html-video-field"><span>Duration, sec</span><input type="number" min="1" max="30" value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
            <label className="html-video-field"><span>FPS</span><input type="number" min="12" max="30" value={fps} onChange={(event) => setFps(event.target.value)} /></label>
          </div>
          <button className="html-video-primary" type="button" onClick={handleExport}>Export MP4</button>
          {status ? <small className="html-video-status">{status}</small> : null}
        </div>

        <div className="html-video-group html-video-code-group">
          <h3>HTML</h3>
          <textarea value={html} spellCheck="false" onChange={(event) => setHtml(event.target.value)} />
        </div>
      </aside>

      <main className="html-video-preview-stage">
        <div className="html-video-toolbar">
          <div><p>Preview</p><h2>{activePreset.label} scene</h2></div>
          <div className="html-video-pill">{width} × {height}</div>
        </div>
        <div className="html-video-preview-shell">
          <div className="html-video-frame" style={{ aspectRatio: `${toNumber(width, 1920)} / ${toNumber(height, 1080)}` }}>
            <iframe title="HTML video preview" srcDoc={previewDocument} sandbox="allow-scripts allow-same-origin" />
          </div>
        </div>
      </main>
    </section>
  );
}

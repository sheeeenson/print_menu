const LOCAL_RENDERER_URL = 'http://localhost:3020';
const START_COMMAND = `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/sheeeenson/print_menu/main/scripts/start-tv-renderer.ps1' | iex"`;

const createGuide = () => {
  const root = document.createElement('div');
  root.dataset.tvPromoRendererGuide = 'true';
  root.style.cssText = 'margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(0,0,0,.16);display:grid;gap:8px;';

  const status = document.createElement('div');
  status.dataset.rendererStatus = 'true';
  status.style.cssText = 'font-size:12px;font-weight:700;';
  status.textContent = 'Renderer: checking...';

  const text = document.createElement('div');
  text.style.cssText = 'font-size:12px;line-height:1.45;opacity:.82;';
  text.textContent = 'For high-quality MP4 (Full HD / 24 fps), run this command once in Windows PowerShell and keep that terminal window open while exporting.';

  const code = document.createElement('code');
  code.textContent = START_COMMAND;
  code.style.cssText = 'display:block;max-height:92px;overflow:auto;padding:9px;border-radius:8px;background:#151515;color:#f4f4f4;font-size:10px;line-height:1.45;word-break:break-all;white-space:pre-wrap;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy PowerShell command';
  copy.style.cssText = 'padding:8px 10px;border:0;border-radius:8px;cursor:pointer;font-weight:700;';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(START_COMMAND);
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy PowerShell command'; }, 1600);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = START_COMMAND;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy PowerShell command'; }, 1600);
    }
  });

  const check = document.createElement('button');
  check.type = 'button';
  check.textContent = 'Check renderer';
  check.style.cssText = 'padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:8px;cursor:pointer;background:transparent;color:inherit;font-weight:700;';
  check.addEventListener('click', () => updateStatus(root));

  actions.append(copy, check);
  root.append(status, text, code, actions);
  return root;
};

const updateStatus = async (root) => {
  const status = root?.querySelector('[data-renderer-status]');
  if (!status) return;
  status.textContent = 'Renderer: checking...';
  status.style.color = '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(`${LOCAL_RENDERER_URL}/health`, { signal: controller.signal, cache: 'no-store' });
    const payload = response.ok ? await response.json().catch(() => null) : null;
    if (payload?.ok) {
      status.textContent = `Renderer: READY · up to ${payload.maxVideoWidth || 1920}px · ${payload.maxVideoFps || 24} fps`;
      status.style.color = '#7ee787';
      return;
    }
    throw new Error('not ready');
  } catch (error) {
    status.textContent = 'Renderer: NOT RUNNING — copy the command below';
    status.style.color = '#ffb86b';
  } finally {
    clearTimeout(timeout);
  }
};

const mountGuide = () => {
  const panel = document.querySelector('.promo-generator-panel');
  if (!panel) return;
  if (panel.querySelector('[data-tv-promo-renderer-guide]')) return;
  const groups = Array.from(panel.querySelectorAll('.promo-panel-group'));
  const downloadGroup = groups.find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');
  if (!downloadGroup) return;
  const guide = createGuide();
  downloadGroup.appendChild(guide);
  updateStatus(guide);
};

export const installTvPromoRendererGuide = () => {
  mountGuide();
  const observer = new MutationObserver(() => mountGuide());
  observer.observe(document.body, { childList: true, subtree: true });
  const interval = window.setInterval(() => {
    const guide = document.querySelector('[data-tv-promo-renderer-guide]');
    if (guide) updateStatus(guide);
  }, 5000);
  return () => {
    observer.disconnect();
    window.clearInterval(interval);
  };
};

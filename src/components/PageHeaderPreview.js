import { escapeHtml } from './dom.js';

export function renderPageHeaderPreview(page, renderLocalizedText) {
  const header = page.header;
  if (!header.enabled) return '';

  const leftLogo =
    header.leftLogoType === 'url' && header.leftLogoUrl
      ? `<span class="header-image-box" style="--header-image-size:${safeImageSize(header.leftLogoSize, header.height)}px"><img src="${escapeHtml(header.leftLogoUrl)}" alt="" loading="lazy" /></span>`
      : '';
  const rightImage =
    header.rightImageType === 'url' && header.rightImageUrl
      ? `<span class="header-image-box" style="--header-image-size:${safeImageSize(header.rightImageSize, header.height)}px"><img src="${escapeHtml(header.rightImageUrl)}" alt="" loading="lazy" /></span>`
      : '';

  return `
    <header class="page-header align-${header.alignment}" style="--header-height:${header.height}px; --header-font-size:${header.fontSize}px;">
      <div class="page-header-block page-header-left">
        ${leftLogo}
        <div class="page-header-text">${renderLocalizedText(header, 'leftText', page.languageMode, '')}</div>
      </div>
      <div class="page-header-block page-header-right">
        <div class="page-header-text">${renderLocalizedText(header, 'rightText', page.languageMode, '')}</div>
        ${rightImage}
      </div>
    </header>
  `;
}

function safeImageSize(size, headerHeight) {
  return Math.max(20, Math.min(Number(size) || 56, Math.max(20, (Number(headerHeight) || 80) - 16)));
}

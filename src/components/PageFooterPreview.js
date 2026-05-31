export function renderPageFooterPreview(page, renderLocalizedText) {
  const footer = page.footer;
  if (!footer.enabled) return '';

  return `
    <footer class="page-footer align-${footer.alignment}" style="--footer-height:${footer.height}px; --footer-font-size:${footer.fontSize}px;">
      <div class="page-footer-cell page-footer-left">${renderLocalizedText(footer, 'leftText', page.languageMode, '')}</div>
      <div class="page-footer-cell page-footer-center">${renderLocalizedText(footer, 'centerText', page.languageMode, '')}</div>
      <div class="page-footer-cell page-footer-right">${renderLocalizedText(footer, 'rightText', page.languageMode, '')}</div>
    </footer>
  `;
}

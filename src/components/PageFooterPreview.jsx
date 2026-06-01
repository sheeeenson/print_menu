export function PageFooterPreview({ page, renderLocalizedText }) {
  const footer = page.footer;
  if (!footer.enabled) return null;

  const dividerWidth = footer.showDivider ? footer.dividerWidth : 0;

  return (
    <footer
      className={`page-footer align-${footer.alignment}`}
      style={{
        '--footer-height': `${footer.height}px`,
        '--footer-font-size': `${footer.fontSize}px`,
        '--footer-divider-color': footer.dividerColor,
        '--footer-divider-width': `${dividerWidth}px`,
      }}
    >
      <div className="page-footer-cell page-footer-left">{renderLocalizedText(footer, 'leftText', page.languageMode, '')}</div>
      <div className="page-footer-cell page-footer-center">{renderLocalizedText(footer, 'centerText', page.languageMode, '')}</div>
      <div className="page-footer-cell page-footer-right">{renderLocalizedText(footer, 'rightText', page.languageMode, '')}</div>
    </footer>
  );
}

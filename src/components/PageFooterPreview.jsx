export function PageFooterPreview({ page, renderLocalizedText }) {
  const footer = page.footer;
  if (!footer.enabled) return null;

  return (
    <footer className={`page-footer align-${footer.alignment}`} style={{ '--footer-height': `${footer.height}px`, '--footer-font-size': `${footer.fontSize}px` }}>
      <div className="page-footer-cell page-footer-left">{renderLocalizedText(footer, 'leftText', page.languageMode, '')}</div>
      <div className="page-footer-cell page-footer-center">{renderLocalizedText(footer, 'centerText', page.languageMode, '')}</div>
      <div className="page-footer-cell page-footer-right">{renderLocalizedText(footer, 'rightText', page.languageMode, '')}</div>
    </footer>
  );
}

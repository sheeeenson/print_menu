export function PageHeaderPreview({ page, renderLocalizedText }) {
  const header = page.header;
  if (!header.enabled) return null;

  const leftLogo = header.leftLogoType === 'url' && header.leftLogoUrl;
  const rightImage = header.rightImageType === 'url' && header.rightImageUrl;

  return (
    <header className={`page-header align-${header.alignment}`} style={{ '--header-height': `${header.height}px`, '--header-font-size': `${header.fontSize}px` }}>
      <div className="page-header-block page-header-left">
        {leftLogo ? (
          <span className="header-image-box" style={{ '--header-image-size': `${safeImageSize(header.leftLogoSize, header.height)}px` }}>
            <img src={header.leftLogoUrl} alt="" loading="lazy" />
          </span>
        ) : null}
        <div className="page-header-text">{renderLocalizedText(header, 'leftText', page.languageMode, '')}</div>
      </div>
      <div className="page-header-block page-header-right">
        <div className="page-header-text">{renderLocalizedText(header, 'rightText', page.languageMode, '')}</div>
        {rightImage ? (
          <span className="header-image-box" style={{ '--header-image-size': `${safeImageSize(header.rightImageSize, header.height)}px` }}>
            <img src={header.rightImageUrl} alt="" loading="lazy" />
          </span>
        ) : null}
      </div>
    </header>
  );
}

function safeImageSize(size, headerHeight) {
  return Math.max(20, Math.min(Number(size) || 56, Math.max(20, (Number(headerHeight) || 80) - 16)));
}

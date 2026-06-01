import { PAGE_TYPES } from '../models/menu.js';

export function CreativePageControls({ page, actions }) {
  if (page.pageType === PAGE_TYPES.SOCIAL_CREATIVE) return <SocialCreativeControls page={page} actions={actions} />;
  if (page.pageType === PAGE_TYPES.PROMO) return <PromoControls page={page} actions={actions} />;
  if (page.pageType === PAGE_TYPES.FLYER) return <FlyerControls page={page} actions={actions} />;
  return null;
}

function SocialCreativeControls({ page, actions }) {
  const content = page.creativeContent;
  const media = page.creativeMedia;
  const design = page.creativeDesign;
  const type = page.creativeTypography;
  const text = (field) => (event) => actions.updateSelectedPageCreativeContent(field, event.target.value);
  const mediaText = (field) => (event) => actions.updateSelectedPageCreativeMedia(field, event.target.value);
  const designValue = (field) => (event) => actions.updateSelectedPageCreativeDesign(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
  const designNumber = (field) => (event) => actions.updateSelectedPageCreativeDesign(field, Number(event.target.value));
  const typeNumber = (field) => (event) => actions.updateSelectedPageCreativeTypography(field, Number(event.target.value));

  return (
    <section className="panel-section creative-controls" aria-labelledby="social-creative-controls-title">
      <p className="eyebrow">Social Creative</p>
      <h2 id="social-creative-controls-title">Sushi Set Creative</h2>
      <div className="print-action-row">
        <button className="secondary-action compact" type="button" onClick={() => actions.duplicateSocialCreativeToSize('socialSquare')}>Duplicate to 1:1</button>
        <button className="secondary-action compact" type="button" onClick={() => actions.duplicateSocialCreativeToSize('socialPortrait')}>Duplicate to 4:5</button>
        <button className="secondary-action compact" type="button" onClick={() => actions.duplicateSocialCreativeToSize('socialStory')}>Duplicate to 9:16</button>
        <button className="primary-action compact" type="button" onClick={actions.generateAllSocialCreativeSizes}>Generate all 3 sizes</button>
      </div>
      <details open><summary>Content</summary>
        <label className="field-label">Label<input value={content.label} onChange={text('label')} /></label>
        <label className="field-label">Title<input value={content.title} onChange={text('title')} /></label>
        <label className="field-label">Subtitle<input value={content.subtitle} onChange={text('subtitle')} /></label>
        <label className="field-label">Composition<textarea value={content.compositionText} onChange={text('compositionText')} /></label>
        <label className="field-label">CTA text<input value={content.ctaText} onChange={text('ctaText')} /></label>
        <div className="two-column-fields panel-two-column">
          <label className="field-label">Old price<input value={content.oldPrice} onChange={text('oldPrice')} /></label>
          <label className="field-label">New price<input value={content.newPrice} onChange={text('newPrice')} /></label>
          <label className="field-label">Discount %<input value={content.discountPercent} onChange={text('discountPercent')} /></label>
          <label className="field-label">Currency<input value={content.currency} onChange={text('currency')} /></label>
        </div>
        <label className="field-label">Optional logo URL<input value={content.logo} onChange={text('logo')} /></label>
        <label className="field-label">Optional note<input value={content.note} onChange={text('note')} /></label>
      </details>
      <details open><summary>Media & layout</summary>
        <label className="field-label">Main product image<input value={media.mainProductImage} onChange={mediaText('mainProductImage')} /></label>
        <label className="slider-label"><span>Product scale<strong>{design.productImageScale}%</strong></span><input type="range" min="60" max="180" value={design.productImageScale} onChange={designNumber('productImageScale')} /></label>
        <label className="slider-label"><span>Product X<strong>{design.productImageX}%</strong></span><input type="range" min="0" max="100" value={design.productImageX} onChange={designNumber('productImageX')} /></label>
        <label className="slider-label"><span>Product Y<strong>{design.productImageY}%</strong></span><input type="range" min="25" max="85" value={design.productImageY} onChange={designNumber('productImageY')} /></label>
      </details>
      <details open><summary>Design</summary>
        <ColorField label="Top area color" value={design.topBackgroundColor} onChange={designValue('topBackgroundColor')} />
        <ColorField label="Bottom area color" value={design.lowerBlockColor} onChange={designValue('lowerBlockColor')} />
        <label className="field-label">Background pattern preset<select value={design.decorativePatternPreset} onChange={designValue('decorativePatternPreset')}><option value="japaneseWaves">Japanese waves</option><option value="dots">Dots</option><option value="none">None</option></select></label>
        <label className="field-label">Badge style<select value={design.badgeStyle} onChange={designValue('badgeStyle')}><option value="hangingTag">Hanging sale tag</option><option value="pill">Pill</option></select></label>
        <ColorField label="Badge color" value={design.badgeColor} onChange={designValue('badgeColor')} />
        <ColorField label="Badge text" value={design.badgeTextColor} onChange={designValue('badgeTextColor')} />
        <ColorField label="CTA color" value={design.ctaColor} onChange={designValue('ctaColor')} />
        <ColorField label="New price color" value={design.newPriceColor} onChange={designValue('newPriceColor')} />
        <label className="toggle-label"><input type="checkbox" checked={design.ctaVisible} onChange={designValue('ctaVisible')} /> CTA visibility</label>
        <label className="toggle-label"><input type="checkbox" checked={design.oldPriceVisible} onChange={designValue('oldPriceVisible')} /> Old price visibility</label>
        <label className="toggle-label"><input type="checkbox" checked={design.newPriceVisible} onChange={designValue('newPriceVisible')} /> New price visibility</label>
        <label className="toggle-label"><input type="checkbox" checked={design.currencyVisible} onChange={designValue('currencyVisible')} /> Currency visibility</label>
      </details>
      <details><summary>Typography</summary>
        {Object.entries(type).map(([field, value]) => <label className="slider-label" key={field}><span>{field}<strong>{value}px</strong></span><input type="range" min="12" max="140" value={value} onChange={typeNumber(field)} /></label>)}
      </details>
    </section>
  );
}

function PromoControls({ page, actions }) {
  const content = page.promoContent;
  const update = (field) => (event) => actions.updateSelectedPagePromoContent(field, event.target.value);
  return <section className="panel-section"><p className="eyebrow">Promo page</p><h2>Promo content</h2>{['heroTitle','heroSubtitle','promoBadge','oldPrice','newPrice','productImage','cta','footerNote'].map((field) => <label className="field-label" key={field}>{field}<input value={content[field]} onChange={update(field)} /></label>)}</section>;
}

function FlyerControls({ page, actions }) {
  const content = page.flyerContent;
  const update = (field) => (event) => actions.updateSelectedPageFlyerContent(field, event.target.value);
  return <section className="panel-section"><p className="eyebrow">Flyer page</p><h2>Flyer content</h2>{['title','subtitle','image','cta','badge','price','footerNote'].map((field) => <label className="field-label" key={field}>{field}<input value={content[field]} onChange={update(field)} /></label>)}</section>;
}

function ColorField({ label, value, onChange }) {
  return <label className="color-label">{label}<span><input type="color" value={value} onChange={onChange} /><input value={value} onChange={onChange} /></span></label>;
}

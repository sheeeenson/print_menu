function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return <label className="app-field image-menu-control"><span>{label} <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function A3PosterControls({ poster, updatePoster }) {
  return <>
    <section className="app-control-group">
      <h3>Copy & product data</h3>
      <label className="app-field"><span>Poster name</span><input value={poster.name} onChange={(event) => updatePoster({ name: event.target.value })} /></label>
      <label className="app-field"><span>Headline</span><input value={poster.headline} placeholder="Uses first product name when empty" onChange={(event) => updatePoster({ headline: event.target.value })} /></label>
      <label className="app-field"><span>Subheadline</span><input value={poster.subheadline} placeholder="Optional" onChange={(event) => updatePoster({ subheadline: event.target.value })} /></label>
      <label className="app-toggle"><input type="checkbox" checked={poster.showPrice} onChange={(event) => updatePoster({ showPrice: event.target.checked })} /><span>Show current price</span></label>
      <label className="app-toggle"><input type="checkbox" checked={poster.showOldPrice ?? true} onChange={(event) => updatePoster({ showOldPrice: event.target.checked })} /><span>Show crossed old price when available</span></label>
      <label className="app-toggle"><input type="checkbox" checked={poster.showDescriptionEn ?? false} onChange={(event) => updatePoster({ showDescriptionEn: event.target.checked })} /><span>Show English description</span></label>
      <label className="app-toggle"><input type="checkbox" checked={poster.showDescriptionGe ?? false} onChange={(event) => updatePoster({ showDescriptionGe: event.target.checked })} /><span>Show Georgian description</span></label>
    </section>

    <section className="app-control-group">
      <h3>Offer badge</h3>
      <label className="app-toggle"><input type="checkbox" checked={poster.showOffer ?? false} onChange={(event) => updatePoster({ showOffer: event.target.checked })} /><span>Show offer badge</span></label>
      <label className="app-field"><span>Offer text</span><textarea rows="2" value={poster.offerText ?? ''} placeholder="-20% / NEW / SPECIAL OFFER" disabled={!poster.showOffer} onChange={(event) => updatePoster({ offerText: event.target.value })} /></label>
      <label className="app-field"><span>Offer text color</span><input type="color" value={poster.offerTextColor ?? '#ffffff'} disabled={!poster.showOffer} onChange={(event) => updatePoster({ offerTextColor: event.target.value })} /></label>
      <RangeControl label="Offer size" value={poster.offerSize ?? 78} min={36} max={180} onChange={(offerSize) => updatePoster({ offerSize })} suffix="px" />
    </section>

    <section className="app-control-group">
      <h3>Appearance</h3>
      <label className="app-toggle"><input type="checkbox" checked={poster.autoBackground ?? true} onChange={(event) => updatePoster({ autoBackground: event.target.checked })} /><span>Auto background from dish image</span></label>
      <RangeControl label="Background tone" value={poster.backgroundTone ?? 0} min={-40} max={40} onChange={(backgroundTone) => updatePoster({ backgroundTone })} />
      <label className="app-field"><span>Manual background</span><input type="color" value={poster.backgroundColor} disabled={poster.autoBackground ?? true} onChange={(event) => updatePoster({ backgroundColor: event.target.value })} /></label>
      <label className="app-field"><span>Text</span><input type="color" value={poster.textColor} onChange={(event) => updatePoster({ textColor: event.target.value })} /></label>
      <label className="app-field"><span>Accent / offer badge</span><input type="color" value={poster.accentColor} onChange={(event) => updatePoster({ accentColor: event.target.value })} /></label>
      <RangeControl label="Headline size" value={poster.headlineSize} min={100} max={360} onChange={(headlineSize) => updatePoster({ headlineSize })} suffix="px" />
      <RangeControl label="Subheadline size" value={poster.subheadlineSize} min={40} max={180} onChange={(subheadlineSize) => updatePoster({ subheadlineSize })} suffix="px" />
      <RangeControl label="Product name size" value={poster.productNameSize ?? 86} min={36} max={180} onChange={(productNameSize) => updatePoster({ productNameSize })} suffix="px" />
      <RangeControl label="Description size" value={poster.descriptionSize ?? 48} min={24} max={110} onChange={(descriptionSize) => updatePoster({ descriptionSize })} suffix="px" />
      <RangeControl label="Price size" value={poster.priceSize} min={70} max={260} onChange={(priceSize) => updatePoster({ priceSize })} suffix="px" />
      <RangeControl label="Old price size" value={poster.oldPriceSize ?? 82} min={36} max={160} onChange={(oldPriceSize) => updatePoster({ oldPriceSize })} suffix="px" />
      <RangeControl label="Product size" value={poster.imageScale} min={0.4} max={1.8} step={0.05} onChange={(imageScale) => updatePoster({ imageScale })} />
    </section>

    <section className="app-control-group">
      <h3>Object positions</h3>
      <small>Move each group independently on the A3 canvas.</small>
      <RangeControl label="Product X" value={poster.imageXOffset ?? 0} min={-1200} max={1200} onChange={(imageXOffset) => updatePoster({ imageXOffset })} suffix="px" />
      <RangeControl label="Product Y" value={poster.imageYOffset ?? 0} min={-1200} max={1200} onChange={(imageYOffset) => updatePoster({ imageYOffset })} suffix="px" />
      <RangeControl label="Headline X" value={poster.contentXOffset ?? 0} min={-1200} max={1200} onChange={(contentXOffset) => updatePoster({ contentXOffset })} suffix="px" />
      <RangeControl label="Headline Y" value={poster.contentYOffset ?? 0} min={-1200} max={1200} onChange={(contentYOffset) => updatePoster({ contentYOffset })} suffix="px" />
      <RangeControl label="Name / description / price X" value={poster.metaXOffset ?? 0} min={-1200} max={1200} onChange={(metaXOffset) => updatePoster({ metaXOffset })} suffix="px" />
      <RangeControl label="Name / description / price Y" value={poster.metaYOffset ?? 0} min={-1200} max={1200} onChange={(metaYOffset) => updatePoster({ metaYOffset })} suffix="px" />
      <RangeControl label="Offer X" value={poster.offerXOffset ?? 0} min={-1200} max={1200} onChange={(offerXOffset) => updatePoster({ offerXOffset })} suffix="px" />
      <RangeControl label="Offer Y" value={poster.offerYOffset ?? 0} min={-1200} max={1200} onChange={(offerYOffset) => updatePoster({ offerYOffset })} suffix="px" />
    </section>
  </>;
}

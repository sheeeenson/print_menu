function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return <label className="app-field image-menu-control"><span>{label} <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function PositionPair({ label, x, y, onX, onY }) {
  return <div className="a3-position-pair"><strong>{label}</strong><RangeControl label="X" value={x ?? 0} min={-1200} max={1200} onChange={onX} suffix="px" /><RangeControl label="Y" value={y ?? 0} min={-1200} max={1200} onChange={onY} suffix="px" /></div>;
}

export function A3PosterControls({ poster, updatePoster }) {
  return <>
    <section className="app-control-group">
      <h3>Product data</h3>
      <label className="app-field"><span>Poster name</span><input value={poster.name} onChange={(event) => updatePoster({ name: event.target.value })} /></label>
      <small>For a single-product poster, the English and Georgian catalogue names are used automatically as the top title block.</small>
      <label className="app-toggle"><input type="checkbox" checked={poster.showProductNameEn ?? true} onChange={(event) => updatePoster({ showProductNameEn: event.target.checked })} /><span>Show English product name</span></label>
      <label className="app-toggle"><input type="checkbox" checked={poster.showProductNameGe ?? true} onChange={(event) => updatePoster({ showProductNameGe: event.target.checked })} /><span>Show Georgian product name</span></label>
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
      <RangeControl label="Offer size" value={poster.offerSize ?? 78} min={24} max={360} onChange={(offerSize) => updatePoster({ offerSize })} suffix="px" />
    </section>

    <section className="app-control-group">
      <h3>Appearance</h3>
      <label className="app-toggle"><input type="checkbox" checked={poster.autoBackground ?? true} onChange={(event) => updatePoster({ autoBackground: event.target.checked })} /><span>Auto background from dish image</span></label>
      <RangeControl label="Background tone" value={poster.backgroundTone ?? 0} min={-40} max={40} onChange={(backgroundTone) => updatePoster({ backgroundTone })} />
      <label className="app-field"><span>Manual background</span><input type="color" value={poster.backgroundColor} disabled={poster.autoBackground ?? true} onChange={(event) => updatePoster({ backgroundColor: event.target.value })} /></label>
      <label className="app-field"><span>Text</span><input type="color" value={poster.textColor} onChange={(event) => updatePoster({ textColor: event.target.value })} /></label>
      <label className="app-field"><span>Accent / offer badge</span><input type="color" value={poster.accentColor} onChange={(event) => updatePoster({ accentColor: event.target.value })} /></label>
      <RangeControl label="English product name size" value={poster.productNameSize ?? 86} min={28} max={480} onChange={(productNameSize) => updatePoster({ productNameSize })} suffix="px" />
      <RangeControl label="Georgian product name size" value={poster.productNameGeSize ?? 62} min={24} max={420} onChange={(productNameGeSize) => updatePoster({ productNameGeSize })} suffix="px" />
      <RangeControl label="Description size" value={poster.descriptionSize ?? 48} min={24} max={180} onChange={(descriptionSize) => updatePoster({ descriptionSize })} suffix="px" />
      <RangeControl label="Price size" value={poster.priceSize} min={48} max={520} onChange={(priceSize) => updatePoster({ priceSize })} suffix="px" />
      <RangeControl label="Old price size" value={poster.oldPriceSize ?? 82} min={32} max={360} onChange={(oldPriceSize) => updatePoster({ oldPriceSize })} suffix="px" />
      <RangeControl label="Product size" value={poster.imageScale} min={0.4} max={1.8} step={0.05} onChange={(imageScale) => updatePoster({ imageScale })} />
    </section>

    <section className="app-control-group">
      <h3>Object positions</h3>
      <small>Every visible element moves independently.</small>
      <PositionPair label="Product image" x={poster.imageXOffset} y={poster.imageYOffset} onX={(imageXOffset) => updatePoster({ imageXOffset })} onY={(imageYOffset) => updatePoster({ imageYOffset })} />
      <PositionPair label="English product name" x={poster.productNameXOffset} y={poster.productNameYOffset} onX={(productNameXOffset) => updatePoster({ productNameXOffset })} onY={(productNameYOffset) => updatePoster({ productNameYOffset })} />
      <PositionPair label="Georgian product name" x={poster.productNameGeXOffset} y={poster.productNameGeYOffset} onX={(productNameGeXOffset) => updatePoster({ productNameGeXOffset })} onY={(productNameGeYOffset) => updatePoster({ productNameGeYOffset })} />
      <PositionPair label="English description" x={poster.descriptionEnXOffset} y={poster.descriptionEnYOffset} onX={(descriptionEnXOffset) => updatePoster({ descriptionEnXOffset })} onY={(descriptionEnYOffset) => updatePoster({ descriptionEnYOffset })} />
      <PositionPair label="Georgian description" x={poster.descriptionGeXOffset} y={poster.descriptionGeYOffset} onX={(descriptionGeXOffset) => updatePoster({ descriptionGeXOffset })} onY={(descriptionGeYOffset) => updatePoster({ descriptionGeYOffset })} />
      <PositionPair label="Current price" x={poster.currentPriceXOffset} y={poster.currentPriceYOffset} onX={(currentPriceXOffset) => updatePoster({ currentPriceXOffset })} onY={(currentPriceYOffset) => updatePoster({ currentPriceYOffset })} />
      <PositionPair label="Old price" x={poster.oldPriceXOffset} y={poster.oldPriceYOffset} onX={(oldPriceXOffset) => updatePoster({ oldPriceXOffset })} onY={(oldPriceYOffset) => updatePoster({ oldPriceYOffset })} />
      <PositionPair label="Offer badge" x={poster.offerXOffset} y={poster.offerYOffset} onX={(offerXOffset) => updatePoster({ offerXOffset })} onY={(offerYOffset) => updatePoster({ offerYOffset })} />
    </section>
  </>;
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return <label className="app-field image-menu-control"><span>{label} <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function PositionPair({ label, x, y, onX, onY }) {
  return <div className="a3-position-pair"><strong>{label}</strong><RangeControl label="X" value={x ?? 0} min={-600} max={600} onChange={onX} suffix="px" /><RangeControl label="Y" value={y ?? 0} min={-600} max={600} onChange={onY} suffix="px" /></div>;
}

export function MetaCreativeControls({ creative, updateCreative }) {
  const customBackgroundEnabled = creative.customBackgroundEnabled ?? false;
  const productCutoutEnabled = creative.productCutoutEnabled ?? false;
  return <>
    <section className="app-control-group">
      <h3>Creative content</h3>
      <label className="app-field"><span>Creative name</span><input value={creative.name} onChange={(event) => updateCreative({ name: event.target.value })} /></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showProductNameEn ?? true} onChange={(event) => updateCreative({ showProductNameEn: event.target.checked })} /><span>Show English product name</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showProductNameGe ?? true} onChange={(event) => updateCreative({ showProductNameGe: event.target.checked })} /><span>Show Georgian product name</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showPrice ?? true} onChange={(event) => updateCreative({ showPrice: event.target.checked })} /><span>Show current price</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showOldPrice ?? true} onChange={(event) => updateCreative({ showOldPrice: event.target.checked })} /><span>Show old price</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showOffer ?? false} onChange={(event) => updateCreative({ showOffer: event.target.checked })} /><span>Show offer badge</span></label>
      <label className="app-field"><span>Offer text</span><textarea rows="2" value={creative.offerText ?? ''} disabled={!creative.showOffer} onChange={(event) => updateCreative({ offerText: event.target.value })} /></label>
    </section>

    <section className="app-control-group">
      <h3>Background</h3>
      <label className="app-toggle"><input type="checkbox" checked={customBackgroundEnabled} onChange={(event) => updateCreative({ customBackgroundEnabled: event.target.checked, autoBackground: event.target.checked ? false : creative.autoBackground })} /><span>Use Google Drive background</span></label>
      <label className="app-field"><span>Google Drive image link</span><input type="url" value={creative.customBackgroundUrl ?? ''} disabled={!customBackgroundEnabled} onChange={(event) => updateCreative({ customBackgroundUrl: event.target.value })} /></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.autoBackground ?? true} disabled={customBackgroundEnabled} onChange={(event) => updateCreative({ autoBackground: event.target.checked })} /><span>Auto background from products</span></label>
      <RangeControl label="Background tone" value={creative.backgroundTone ?? 0} min={-40} max={40} onChange={(backgroundTone) => updateCreative({ backgroundTone })} />
      <label className="app-field"><span>Manual background</span><input type="color" value={creative.backgroundColor ?? '#f4efe8'} disabled={customBackgroundEnabled || (creative.autoBackground ?? true)} onChange={(event) => updateCreative({ backgroundColor: event.target.value })} /></label>
    </section>

    <section className="app-control-group">
      <h3>Product cutout</h3>
      <label className="app-toggle"><input type="checkbox" checked={productCutoutEnabled} onChange={(event) => updateCreative({ productCutoutEnabled: event.target.checked })} /><span>Remove product background</span></label>
      <RangeControl label="Sensitivity" value={creative.productCutoutSensitivity ?? 38} min={0} max={100} onChange={(productCutoutSensitivity) => updateCreative({ productCutoutSensitivity })} />
      <RangeControl label="Product protection" value={creative.productCutoutProtection ?? 45} min={0} max={100} onChange={(productCutoutProtection) => updateCreative({ productCutoutProtection })} suffix="%" />
      <RangeControl label="Edge softness" value={creative.productCutoutSoftness ?? 2} min={0} max={10} onChange={(productCutoutSoftness) => updateCreative({ productCutoutSoftness })} suffix="px" />
      <RangeControl label="Expand / contract" value={creative.productCutoutExpand ?? 0} min={-12} max={12} onChange={(productCutoutExpand) => updateCreative({ productCutoutExpand })} suffix="px" />
      <RangeControl label="Cleanup" value={creative.productCutoutCleanup ?? 35} min={0} max={100} onChange={(productCutoutCleanup) => updateCreative({ productCutoutCleanup })} suffix="%" />
      <label className="app-toggle"><input type="checkbox" checked={creative.productCutoutFillHoles ?? true} onChange={(event) => updateCreative({ productCutoutFillHoles: event.target.checked })} /><span>Fill holes inside product</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.productCutoutShadow ?? false} onChange={(event) => updateCreative({ productCutoutShadow: event.target.checked })} /><span>Soft product shadow</span></label>
    </section>

    <section className="app-control-group">
      <h3>Typography</h3>
      <label className="app-field"><span>English title color</span><input type="color" value={creative.productNameColor ?? '#161616'} onChange={(event) => updateCreative({ productNameColor: event.target.value })} /></label>
      <label className="app-field"><span>Georgian title color</span><input type="color" value={creative.productNameGeColor ?? '#161616'} onChange={(event) => updateCreative({ productNameGeColor: event.target.value })} /></label>
      <label className="app-field"><span>Current price color</span><input type="color" value={creative.currentPriceColor ?? '#d83b32'} onChange={(event) => updateCreative({ currentPriceColor: event.target.value })} /></label>
      <label className="app-field"><span>Old price color</span><input type="color" value={creative.oldPriceColor ?? '#161616'} onChange={(event) => updateCreative({ oldPriceColor: event.target.value })} /></label>
      <label className="app-field"><span>Offer text color</span><input type="color" value={creative.offerTextColor ?? '#ffffff'} onChange={(event) => updateCreative({ offerTextColor: event.target.value })} /></label>
      <label className="app-field"><span>Offer color</span><input type="color" value={creative.accentColor ?? '#d83b32'} onChange={(event) => updateCreative({ accentColor: event.target.value })} /></label>
      <RangeControl label="English name size" value={creative.productNameSize ?? 68} min={18} max={180} onChange={(productNameSize) => updateCreative({ productNameSize })} suffix="px" />
      <RangeControl label="Georgian name size" value={creative.productNameGeSize ?? 48} min={16} max={150} onChange={(productNameGeSize) => updateCreative({ productNameGeSize })} suffix="px" />
      <RangeControl label="Price size" value={creative.priceSize ?? 88} min={28} max={220} onChange={(priceSize) => updateCreative({ priceSize })} suffix="px" />
      <RangeControl label="Old price size" value={creative.oldPriceSize ?? 44} min={18} max={140} onChange={(oldPriceSize) => updateCreative({ oldPriceSize })} suffix="px" />
      <RangeControl label="Offer size" value={creative.offerSize ?? 46} min={18} max={160} onChange={(offerSize) => updateCreative({ offerSize })} suffix="px" />
      <RangeControl label="Global product size" value={creative.imageScale ?? 1} min={.4} max={1.8} step={.05} onChange={(imageScale) => updateCreative({ imageScale })} />
    </section>

    <section className="app-control-group">
      <h3>Text positions</h3>
      <small>Product images move directly on the canvas. Text elements can be fine-tuned here.</small>
      <PositionPair label="English product name" x={creative.productNameXOffset} y={creative.productNameYOffset} onX={(productNameXOffset) => updateCreative({ productNameXOffset })} onY={(productNameYOffset) => updateCreative({ productNameYOffset })} />
      <PositionPair label="Georgian product name" x={creative.productNameGeXOffset} y={creative.productNameGeYOffset} onX={(productNameGeXOffset) => updateCreative({ productNameGeXOffset })} onY={(productNameGeYOffset) => updateCreative({ productNameGeYOffset })} />
      <PositionPair label="Current price" x={creative.currentPriceXOffset} y={creative.currentPriceYOffset} onX={(currentPriceXOffset) => updateCreative({ currentPriceXOffset })} onY={(currentPriceYOffset) => updateCreative({ currentPriceYOffset })} />
      <PositionPair label="Old price" x={creative.oldPriceXOffset} y={creative.oldPriceYOffset} onX={(oldPriceXOffset) => updateCreative({ oldPriceXOffset })} onY={(oldPriceYOffset) => updateCreative({ oldPriceYOffset })} />
      <PositionPair label="Offer badge" x={creative.offerXOffset} y={creative.offerYOffset} onX={(offerXOffset) => updateCreative({ offerXOffset })} onY={(offerYOffset) => updateCreative({ offerYOffset })} />
    </section>
  </>;
}

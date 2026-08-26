function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return <label className="app-field image-menu-control"><span>{label} <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
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
      <label className="app-toggle"><input type="checkbox" checked={creative.showDescriptionEn ?? false} onChange={(event) => updateCreative({ showDescriptionEn: event.target.checked })} /><span>Show English description</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showDescriptionGe ?? false} onChange={(event) => updateCreative({ showDescriptionGe: event.target.checked })} /><span>Show Georgian description</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showPrice ?? true} onChange={(event) => updateCreative({ showPrice: event.target.checked })} /><span>Show current price</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showOldPrice ?? true} onChange={(event) => updateCreative({ showOldPrice: event.target.checked })} /><span>Show old price</span></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.showOffer ?? false} onChange={(event) => updateCreative({ showOffer: event.target.checked })} /><span>Show offer badge</span></label>
      <label className="app-field"><span>Offer text</span><textarea rows="2" value={creative.offerText ?? ''} disabled={!creative.showOffer} onChange={(event) => updateCreative({ offerText: event.target.value })} /></label>
    </section>

    <section className="app-control-group">
      <h3>Background layer</h3>
      <label className="app-toggle"><input type="checkbox" checked={customBackgroundEnabled} onChange={(event) => updateCreative({ customBackgroundEnabled: event.target.checked, autoBackground: event.target.checked ? false : creative.autoBackground })} /><span>Use custom background</span></label>
      <label className="app-field"><span>Background image link</span><input type="url" value={creative.customBackgroundUrl ?? ''} placeholder="Google Drive or image URL" disabled={!customBackgroundEnabled} onChange={(event) => updateCreative({ customBackgroundUrl: event.target.value })} /></label>
      <label className="app-toggle"><input type="checkbox" checked={creative.autoBackground ?? true} disabled={customBackgroundEnabled} onChange={(event) => updateCreative({ autoBackground: event.target.checked })} /><span>Auto background from products</span></label>
      <RangeControl label="Background tone" value={creative.backgroundTone ?? 0} min={-40} max={40} onChange={(backgroundTone) => updateCreative({ backgroundTone })} />
      <label className="app-field"><span>Manual background</span><input type="color" value={creative.backgroundColor ?? '#f4efe8'} disabled={customBackgroundEnabled || (creative.autoBackground ?? true)} onChange={(event) => updateCreative({ backgroundColor: event.target.value })} /></label>
      <RangeControl label="Background scale" value={creative.backgroundScale ?? 1} min={.5} max={3} step={.05} onChange={(backgroundScale) => updateCreative({ backgroundScale })} />
      <RangeControl label="Background X" value={Math.round((creative.backgroundX ?? .5) * 100)} min={-20} max={120} onChange={(value) => updateCreative({ backgroundX: value / 100 })} suffix="%" />
      <RangeControl label="Background Y" value={Math.round((creative.backgroundY ?? .5) * 100)} min={-20} max={120} onChange={(value) => updateCreative({ backgroundY: value / 100 })} suffix="%" />
    </section>

    <section className="app-control-group">
      <h3>Texture overlay</h3>
      <label className="app-toggle"><input type="checkbox" checked={creative.textureEnabled ?? false} onChange={(event) => updateCreative({ textureEnabled: event.target.checked })} /><span>Enable texture layer</span></label>
      <label className="app-field"><span>Texture image link</span><input type="url" value={creative.textureUrl ?? ''} placeholder="Google Drive or image URL" disabled={!creative.textureEnabled} onChange={(event) => updateCreative({ textureUrl: event.target.value })} /></label>
      <RangeControl label="Texture opacity" value={Math.round((creative.textureOpacity ?? .35) * 100)} min={0} max={100} onChange={(value) => updateCreative({ textureOpacity: value / 100 })} suffix="%" />
      <RangeControl label="Texture scale" value={creative.textureScale ?? 1} min={.5} max={4} step={.05} onChange={(textureScale) => updateCreative({ textureScale })} />
      <RangeControl label="Texture X" value={Math.round((creative.textureX ?? .5) * 100)} min={-20} max={120} onChange={(value) => updateCreative({ textureX: value / 100 })} suffix="%" />
      <RangeControl label="Texture Y" value={Math.round((creative.textureY ?? .5) * 100)} min={-20} max={120} onChange={(value) => updateCreative({ textureY: value / 100 })} suffix="%" />
      <label className="app-field"><span>Blend mode</span><select value={creative.textureBlendMode ?? 'normal'} disabled={!creative.textureEnabled} onChange={(event) => updateCreative({ textureBlendMode: event.target.value })}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="overlay">Overlay</option><option value="soft-light">Soft light</option><option value="screen">Screen</option></select></label>
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
      <small>Each visible text element is now draggable directly on the creative.</small>
      <label className="app-field"><span>English title color</span><input type="color" value={creative.productNameColor ?? '#161616'} onChange={(event) => updateCreative({ productNameColor: event.target.value })} /></label>
      <label className="app-field"><span>Georgian title color</span><input type="color" value={creative.productNameGeColor ?? '#161616'} onChange={(event) => updateCreative({ productNameGeColor: event.target.value })} /></label>
      <label className="app-field"><span>English description color</span><input type="color" value={creative.descriptionEnColor ?? '#161616'} onChange={(event) => updateCreative({ descriptionEnColor: event.target.value })} /></label>
      <label className="app-field"><span>Georgian description color</span><input type="color" value={creative.descriptionGeColor ?? '#161616'} onChange={(event) => updateCreative({ descriptionGeColor: event.target.value })} /></label>
      <label className="app-field"><span>Current price color</span><input type="color" value={creative.currentPriceColor ?? '#d83b32'} onChange={(event) => updateCreative({ currentPriceColor: event.target.value })} /></label>
      <label className="app-field"><span>Old price color</span><input type="color" value={creative.oldPriceColor ?? '#161616'} onChange={(event) => updateCreative({ oldPriceColor: event.target.value })} /></label>
      <label className="app-field"><span>Offer text color</span><input type="color" value={creative.offerTextColor ?? '#ffffff'} onChange={(event) => updateCreative({ offerTextColor: event.target.value })} /></label>
      <label className="app-field"><span>Offer color</span><input type="color" value={creative.accentColor ?? '#d83b32'} onChange={(event) => updateCreative({ accentColor: event.target.value })} /></label>
      <RangeControl label="English name size" value={creative.productNameSize ?? 68} min={18} max={180} onChange={(productNameSize) => updateCreative({ productNameSize })} suffix="px" />
      <RangeControl label="Georgian name size" value={creative.productNameGeSize ?? 48} min={16} max={150} onChange={(productNameGeSize) => updateCreative({ productNameGeSize })} suffix="px" />
      <RangeControl label="Description size" value={creative.descriptionSize ?? 28} min={14} max={100} onChange={(descriptionSize) => updateCreative({ descriptionSize })} suffix="px" />
      <RangeControl label="Price size" value={creative.priceSize ?? 88} min={28} max={220} onChange={(priceSize) => updateCreative({ priceSize })} suffix="px" />
      <RangeControl label="Old price size" value={creative.oldPriceSize ?? 44} min={18} max={140} onChange={(oldPriceSize) => updateCreative({ oldPriceSize })} suffix="px" />
      <RangeControl label="Offer size" value={creative.offerSize ?? 46} min={18} max={160} onChange={(offerSize) => updateCreative({ offerSize })} suffix="px" />
    </section>
  </>;
}

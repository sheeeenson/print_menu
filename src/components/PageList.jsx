import { useState } from 'react';
import { PAGE_TYPES, SOCIAL_CREATIVE_PRESETS, sizePresetsForPageType } from '../models/menu.js';

const PAGE_TYPE_OPTIONS = [
  [PAGE_TYPES.MENU, 'Menu'],
  [PAGE_TYPES.PROMO, 'Promo'],
  [PAGE_TYPES.FLYER, 'Flyer'],
  [PAGE_TYPES.SOCIAL_CREATIVE, 'Social Creative'],
];

export function PageList({ project, actions }) {
  const [pageType, setPageType] = useState(PAGE_TYPES.MENU);
  const [sizePreset, setSizePreset] = useState(sizePresetsForPageType(PAGE_TYPES.MENU)[5].id);
  const [creativePreset, setCreativePreset] = useState('sushiSetCreative');
  const sizeOptions = sizePresetsForPageType(pageType);
  const updatePageType = (event) => {
    const nextType = event.target.value;
    setPageType(nextType);
    setSizePreset(sizePresetsForPageType(nextType)[0].id);
  };
  const addPage = () => actions.addPage({ pageType, sizePreset, creativePreset });

  return (
    <section className="panel-section" aria-labelledby="page-list-title">
      <div className="subsection-title">
        <div>
          <p className="eyebrow">Pages</p>
          <h2 id="page-list-title">Canvases</h2>
        </div>
      </div>
      <div className="page-create-box">
        <label className="field-label">Type
          <select value={pageType} onChange={updatePageType}>{PAGE_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        <label className="field-label">Size
          <select value={sizePreset} onChange={(event) => setSizePreset(event.target.value)}>{sizeOptions.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
        </label>
        {pageType === PAGE_TYPES.SOCIAL_CREATIVE ? (
          <label className="field-label">Preset
            <select value={creativePreset} onChange={(event) => setCreativePreset(event.target.value)}>{SOCIAL_CREATIVE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
          </label>
        ) : null}
        <button className="primary-action compact" type="button" onClick={addPage}>+ Add canvas</button>
      </div>
      <div className="page-list">
        {project.pages.map((page) => (
          <button
            key={page.id}
            className={`page-list-item ${page.id === project.selectedPageId ? 'selected' : ''}`}
            type="button"
            onClick={() => actions.selectPage(page.id)}
          >
            <span>{page.name}</span>
            <small>{page.pageType} · {page.sizePreset} · {page.canvasWidth}×{page.canvasHeight}</small>
          </button>
        ))}
      </div>
      <div className="action-row page-actions">
        <button type="button" onClick={actions.duplicateSelectedPage}>Duplicate</button>
        <button className="danger" type="button" onClick={actions.deleteSelectedPage}>Delete</button>
      </div>
    </section>
  );
}

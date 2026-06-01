export function PageList({ project, actions }) {
  return (
    <section className="panel-section" aria-labelledby="page-list-title">
      <div className="subsection-title">
        <div>
          <p className="eyebrow">Pages</p>
          <h2 id="page-list-title">Menu pages</h2>
        </div>
        <button className="primary-action compact" type="button" onClick={actions.addPage}>+ Add</button>
      </div>
      <div className="page-list">
        {project.pages.map((page) => (
          <div
            key={page.id}
            className={`page-list-item page-list-editable ${page.id === project.selectedPageId ? 'selected' : ''}`}
            onClick={() => actions.selectPage(page.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') actions.selectPage(page.id);
            }}
          >
            <input
              aria-label="Page name"
              value={page.name}
              onClick={(event) => event.stopPropagation()}
              onFocus={() => actions.selectPage(page.id)}
              onChange={(event) => actions.updatePageName(page.id, event.target.value)}
            />
            <small>{page.paperSize} · {page.orientation}</small>
          </div>
        ))}
      </div>
      <div className="action-row page-actions">
        <button type="button" onClick={actions.duplicateSelectedPage}>Duplicate</button>
        <button className="danger" type="button" onClick={actions.deleteSelectedPage}>Delete</button>
      </div>
    </section>
  );
}

import { getA3Format } from './a3PosterStorage.js';

const getPrice = (dish) => {
  const variant = (dish?.priceVariants ?? []).find((item) => Number(item?.newPrice ?? item?.price ?? item?.oldPrice) > 0);
  const value = dish?.newPrice ?? variant?.newPrice ?? variant?.price ?? dish?.price;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}₾` : '';
};

export function A3PosterPreview({ poster, dishes }) {
  const format = getA3Format(poster.formatId);
  const selectedDishes = poster.selectedDishIds.map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean);
  const previewScale = format.previewWidth / format.width;
  const template = poster.template || 'single';
  const headline = poster.headline || selectedDishes[0]?.nameEn || 'A3 Poster';

  return (
    <section className="app-preview-shell" aria-label="A3 poster preview">
      <div className="app-canvas-wrap a3-poster-canvas-wrap" style={{ width: `${format.previewWidth}px`, aspectRatio: `${format.width} / ${format.height}` }}>
        <article
          className={`a3-poster-scene a3-template-${template}`}
          style={{
            width: `${format.width}px`,
            height: `${format.height}px`,
            transform: `scale(${previewScale})`,
            background: poster.backgroundColor,
            color: poster.textColor,
            '--a3-accent': poster.accentColor,
          }}
        >
          <div className="a3-copy" style={{ transform: `translateY(${poster.contentYOffset}px)` }}>
            <h2 style={{ fontSize: `${poster.headlineSize}px` }}>{headline}</h2>
            {poster.subheadline ? <p style={{ fontSize: `${poster.subheadlineSize}px` }}>{poster.subheadline}</p> : null}
          </div>

          <div className="a3-products" style={{ transform: `translateY(${poster.imageYOffset}px)` }}>
            {selectedDishes.map((dish) => (
              <div key={dish.id} className="a3-product-card">
                <div className="a3-product-image-wrap">
                  {dish.imageUrl ? <img className="a3-product-image" src={dish.imageUrl} alt="" style={{ transform: `scale(${poster.imageScale})` }} /> : null}
                </div>
                <div className="a3-product-meta">
                  <strong>{dish.nameEn || dish.nameGe || 'Untitled'}</strong>
                  {poster.showPrice && getPrice(dish) ? <span style={{ fontSize: `${poster.priceSize}px` }}>{getPrice(dish)}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <small className="app-preview-size">A3 output: {format.width} × {format.height}px at 300 DPI ratio</small>
    </section>
  );
}

const gridClassByVariant = {
  2: 'image-menu-grid-two',
  4: 'image-menu-grid-four',
  6: 'image-menu-grid-six',
};

const fallbackBackgrounds = ['#eef0b4', '#f8d9a1', '#dfeacf', '#f2cfc1', '#d8e5ef', '#eadcf3'];

const getPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return `${number.toFixed(2)}₾`;
};

const getAutoBackground = (dish, index) => dish?.imageMenuBackgroundColor || dish?.backgroundColor || fallbackBackgrounds[index % fallbackBackgrounds.length];

function ImageMenuCard({ dish, settings, index }) {
  const hasImage = Boolean(dish?.imageUrl);
  const backgroundColor = settings.backgroundMode === 'manual' ? settings.manualBackgroundColor : getAutoBackground(dish, index);
  const oldPrice = getPrice(dish?.oldPrice);
  const salePrice = getPrice(dish?.newPrice);
  const imageStyle = {
    width: `${settings.imageSize}%`,
    transform: `translate(${settings.imageX}%, ${settings.imageY}%)`,
  };

  return (
    <article className={`image-menu-card image-menu-bg-${settings.backgroundMode}`} style={{ backgroundColor }}>
      {settings.backgroundMode === 'blurred' && hasImage ? <img className="image-menu-blur-bg" src={dish.imageUrl} alt="" aria-hidden="true" /> : null}
      <div className="image-menu-photo-wrap">
        {hasImage ? (
          <img className="image-menu-photo" src={dish.imageUrl} alt={dish.nameEn || dish.nameGe || 'Dish'} style={imageStyle} crossOrigin="anonymous" />
        ) : (
          <div className="image-menu-photo-placeholder" style={imageStyle}>No image</div>
        )}
      </div>
      <div className="image-menu-text" style={{ bottom: `${settings.textBottomOffset}px` }}>
        <h2 className="image-menu-title-en" style={{ color: settings.textColor, fontFamily: settings.enTitleFont, fontSize: `${settings.enTitleSize}px` }}>
          {dish?.nameEn || 'Dish name'}
        </h2>
        <h3 className="image-menu-title-ge" style={{ color: settings.textColor, fontFamily: settings.geTitleFont, fontSize: `${settings.geTitleSize}px`, marginTop: `${settings.titleLanguageGap}px` }}>
          {dish?.nameGe || 'ქართული სახელი'}
        </h3>
        {settings.showDescriptions ? (
          <div className="image-menu-descriptions" style={{ marginTop: `${settings.titleDescriptionGap}px`, color: settings.descriptionColor, fontFamily: settings.descriptionFont, fontSize: `${settings.descriptionSize}px` }}>
            {dish?.descriptionEn ? <p>{dish.descriptionEn}</p> : null}
            {dish?.descriptionGe ? <p>{dish.descriptionGe}</p> : null}
          </div>
        ) : null}
        {(oldPrice || salePrice) ? (
          <div className="image-menu-prices" style={{ color: settings.textColor }}>
            {oldPrice ? <span className="image-menu-old-price">{oldPrice}</span> : null}
            {salePrice ? <strong className="image-menu-sale-price">{salePrice}</strong> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ImageMenuPreview({ page, dishes }) {
  const selectedDishes = page.selectedDishIds.map((dishId) => dishes.find((dish) => dish.id === dishId)).filter(Boolean);
  const emptySlots = Math.max(0, page.gridVariant - selectedDishes.length);

  return (
    <section className="image-menu-preview-shell" aria-label="Image Menu A4 landscape preview">
      <div className={`image-menu-page ${gridClassByVariant[page.gridVariant]}`} data-image-menu-print-page="true">
        {selectedDishes.map((dish, index) => <ImageMenuCard key={dish.id} dish={dish} settings={page.settings} index={index} />)}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div className="image-menu-card image-menu-empty-slot" key={`empty-${index}`}>
            Select dish
          </div>
        ))}
      </div>
    </section>
  );
}

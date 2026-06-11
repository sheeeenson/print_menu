import { BADGE_TYPES } from '../models/menu.js';
import { normalizeGoogleDriveImageUrl, normalizeGoogleDriveMediaUrl } from '../utils/imageUrls.js';
import { formatOptionalNumber, parseOptionalNumber } from '../utils/pricing.js';

const DEFAULT_SIZE_VARIANTS = Object.freeze([
  { labelEn: '24 cm', labelGe: '24 სმ', oldPrice: null, newPrice: null },
  { labelEn: '33 cm', labelGe: '33 სმ', oldPrice: null, newPrice: null },
  { labelEn: '40 cm', labelGe: '40 სმ', oldPrice: null, newPrice: null },
]);

const SIZE_GROUP_ID = 'pizza_size_prices';
const variantNewPrice = (variant) => (typeof variant.newPrice === 'number' ? variant.newPrice : variant.price);
const formatPriceCell = (price) => (typeof price === 'number' ? `${formatOptionalNumber(price)} ₾` : '');
const strikeText = (value) => String(value).split('').map((char) => `${char}̶`).join('');
const normalizeVariant = (variant) => ({
  labelEn: variant.labelEn ?? '',
  labelGe: variant.labelGe ?? '',
  oldPrice: typeof variant.oldPrice === 'number' ? variant.oldPrice : null,
  newPrice: typeof variant.newPrice === 'number' ? variant.newPrice : (typeof variant.price === 'number' ? variant.price : null),
});
const formatSizePriceBlock = (variants, labelField) => variants
  .map(normalizeVariant)
  .filter((variant) => variant[labelField] || typeof variant.oldPrice === 'number' || typeof variant.newPrice === 'number')
  .map((variant) => [
    variant[labelField] || '-',
    typeof variant.oldPrice === 'number' ? strikeText(formatPriceCell(variant.oldPrice)) : '',
    formatPriceCell(variant.newPrice),
  ].filter(Boolean).join('\n'))
  .join('\n\n');

export function DishEditor({ dish, actions }) {
  const hasSizePrices = (dish.priceVariants ?? []).length > 0;
  const updateText = (field) => (event) => actions.updateDish(dish.id, { [field]: event.target.value });
  const updateImageUrl = (event) => actions.updateDish(dish.id, { imageUrl: normalizeGoogleDriveImageUrl(event.target.value) });
  const updatePromoBackgroundUrl = (event) => actions.updateDish(dish.id, { promoBackgroundUrl: normalizeGoogleDriveMediaUrl(event.target.value) });
  const updateBoolean = (field) => (event) => actions.updateDish(dish.id, { [field]: event.target.checked });
  const updatePrice = (field) => (event) => actions.updateDish(dish.id, { [field]: parseOptionalNumber(event.target.value) }, field);
  const updateDishType = (event) => actions.updateDish(dish.id, { dishType: event.target.value, optionGroups: dish.optionGroups ?? [] });
  const isTransparentProduct = dish.imageMode === 'transparent' || dish.transparentImage === true;

  return (
    <article className={`editor-card dish-editor ${dish.visible ? '' : 'hidden-dish'} ${hasSizePrices ? 'has-size-prices' : ''}`}>
      <div className="editor-card-title">
        <div>
          <h3>{dish.nameEn || 'Untitled dish'}</h3>
          <p>{dish.visible ? 'Visible on menus' : 'Hidden from menus'}</p>
        </div>
        <div className="action-row">
          <button type="button" onClick={() => actions.toggleDishVisibility(dish.id)}>{dish.visible ? 'Hide' : 'Show'}</button>
          <button type="button" onClick={() => actions.duplicateDish(dish.id)}>Duplicate</button>
          <button className="danger" type="button" onClick={() => actions.deleteDish(dish.id)}>Delete</button>
        </div>
      </div>

      <label className="field-label">Dish type
        <select value={dish.dishType ?? 'simple'} onChange={updateDishType}>
          <option value="simple">Simple dish</option>
          <option value="configurable">Configurable dish</option>
          <option value="combo">Combo</option>
        </select>
      </label>
      <div className="two-column-fields">
        <TextInput dish={dish} field="nameEn" label="English name" onChange={updateText('nameEn')} />
        <TextInput dish={dish} field="nameGe" label="Georgian name" onChange={updateText('nameGe')} />
      </div>
      <div className="two-column-fields">
        <TextareaInput dish={dish} field="descriptionEn" label="English description" onChange={updateText('descriptionEn')} />
        <TextareaInput dish={dish} field="descriptionGe" label="Georgian description" onChange={updateText('descriptionGe')} />
      </div>
      {hasSizePrices ? null : (
        <div className="four-column-fields">
          <TextInput dish={dish} field="weight" label="Weight" placeholder="250 g" onChange={updateText('weight')} />
          <NumberInput dish={dish} field="oldPrice" label="Old price" step="0.01" onChange={updatePrice('oldPrice')} />
          <NumberInput dish={dish} field="newPrice" label="New price" step="0.01" onChange={updatePrice('newPrice')} />
          <NumberInput dish={dish} field="discountPercent" label="Discount %" step="1" onChange={updatePrice('discountPercent')} />
        </div>
      )}
      {hasSizePrices ? <p className="muted-text">Weight, discount, and base dish price are disabled for size-priced pizzas. Use only the prices below.</p> : null}
      <SizePriceEditor dish={dish} actions={actions} />
      <TextInput dish={dish} field="imageUrl" label="Image URL" placeholder="https://..." onChange={updateImageUrl} />
      <label className="toggle-label">
        <input type="checkbox" checked={Boolean(dish.blurImage)} onChange={updateBoolean('blurImage')} />
        Blur photo
      </label>
      <label className="toggle-label">
        <input
          type="checkbox"
          checked={isTransparentProduct}
          onChange={(event) => actions.updateDish(dish.id, { imageMode: event.target.checked ? 'transparent' : 'regular', transparentImage: event.target.checked })}
        />
        Product photo has no background
      </label>
      {isTransparentProduct ? (
        <TextInput
          dish={dish}
          field="promoBackgroundUrl"
          label="Default TV Promo Background URL"
          placeholder="Image/video URL or Google Drive link"
          onChange={updatePromoBackgroundUrl}
        />
      ) : null}
      {dish.imageUrl ? (
        <div className={`image-preview ${dish.blurImage ? 'blurred-image-preview' : ''}`}>
          <img src={dish.imageUrl} alt={`${dish.nameEn} preview`} />
        </div>
      ) : null}
      {dish.dishType === 'configurable' && !hasSizePrices ? <OptionGroupEditor dish={dish} actions={actions} /> : null}
      {hasSizePrices ? <p className="muted-text">Pizza size prices are shown without extra configurable modifiers.</p> : null}
      <BadgeEditor dish={dish} actions={actions} />
    </article>
  );
}

function TextInput({ dish, field, label, placeholder = '', onChange }) {
  return (
    <label className="field-label">
      {label}
      <input value={dish[field] ?? ''} placeholder={placeholder} onChange={onChange} />
    </label>
  );
}

function TextareaInput({ dish, field, label, onChange }) {
  return (
    <label className="field-label">
      {label}
      <textarea rows="3" value={dish[field] ?? ''} onChange={onChange} />
    </label>
  );
}

function NumberInput({ dish, field, label, step, onChange }) {
  return (
    <label className="field-label">
      {label}
      <input
        type="number"
        min="0"
        max={field === 'discountPercent' ? '99' : undefined}
        step={step}
        value={formatOptionalNumber(dish[field])}
        onChange={onChange}
      />
    </label>
  );
}

function withSizeOptionGroup(dish, nextVariants) {
  const variants = nextVariants.slice(0, 3).map(normalizeVariant);
  if (!variants.length) return { priceVariants: [], optionGroups: [], oldPrice: null, newPrice: null, weight: '', discountPercent: null };

  const sizeGroup = {
    id: SIZE_GROUP_ID,
    nameEn: 'Size',
    nameGe: 'ზომა',
    required: true,
    minSelect: 1,
    maxSelect: 1,
    options: [{
      id: 'pizza_size_price_table',
      nameEn: formatSizePriceBlock(variants, 'labelEn'),
      nameGe: formatSizePriceBlock(variants, 'labelGe'),
      priceDelta: 0,
    }],
  };

  return {
    dishType: 'configurable',
    priceVariants: variants,
    optionGroups: [sizeGroup],
    oldPrice: null,
    newPrice: null,
    weight: '',
    discountPercent: null,
  };
}

function SizePriceEditor({ dish, actions }) {
  const variants = (dish.priceVariants ?? []).slice(0, 3).map(normalizeVariant);
  const updateVariants = (nextVariants) => actions.updateDish(dish.id, withSizeOptionGroup(dish, nextVariants));
  const ensureDefaultVariants = () => updateVariants(variants.length ? variants : DEFAULT_SIZE_VARIANTS.map((variant) => ({ ...variant })));
  const addVariant = () => updateVariants([...variants, { labelEn: '', labelGe: '', oldPrice: null, newPrice: null }]);
  const updateVariant = (index, changes) => updateVariants(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...changes } : variant));
  const removeVariant = (index) => updateVariants(variants.filter((_, variantIndex) => variantIndex !== index));

  return (
    <div className="option-group-editor size-price-editor">
      <div className="subsection-title">
        <h4>Size prices</h4>
        {variants.length === 0 ? (
          <button type="button" onClick={ensureDefaultVariants}>+ 24 / 33 / 40 cm</button>
        ) : (
          <button type="button" onClick={addVariant} disabled={variants.length >= 3}>+ Size</button>
        )}
      </div>
      {variants.length === 0 ? <p className="muted-text">Use for pizza sizes such as 24 cm, 33 cm and 40 cm with old/new prices.</p> : null}
      {variants.map((variant, index) => (
        <div className="option-row size-price-row" key={`${variant.labelEn}-${index}`}>
          <input aria-label="Size English label" placeholder="24 cm" value={variant.labelEn ?? ''} onChange={(event) => updateVariant(index, { labelEn: event.target.value })} />
          <input aria-label="Size Georgian label" placeholder="24 სმ" value={variant.labelGe ?? ''} onChange={(event) => updateVariant(index, { labelGe: event.target.value })} />
          <input aria-label="Size old price" type="number" min="0" step="0.01" placeholder="Old" value={formatOptionalNumber(variant.oldPrice)} onChange={(event) => updateVariant(index, { oldPrice: parseOptionalNumber(event.target.value) })} />
          <input aria-label="Size new price" type="number" min="0" step="0.01" placeholder="New" value={formatOptionalNumber(variantNewPrice(variant))} onChange={(event) => updateVariant(index, { newPrice: parseOptionalNumber(event.target.value) })} />
          <button type="button" onClick={() => removeVariant(index)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function OptionGroupEditor({ dish, actions }) {
  const groups = (dish.optionGroups ?? []).filter((group) => group.id !== SIZE_GROUP_ID);
  return (
    <div className="option-group-editor">
      <div className="subsection-title">
        <h4>Configurable option groups</h4>
        <button type="button" onClick={() => actions.addOptionGroup(dish.id)}>+ Option group</button>
      </div>
      {groups.length === 0 ? <p className="muted-text">Add groups such as Base, Protein, and Sauce.</p> : null}
      {groups.map((group) => (
        <div className="option-group-card" key={group.id}>
          <div className="two-column-fields">
            <label className="field-label">Group EN<input value={group.nameEn} onChange={(event) => actions.updateOptionGroup(dish.id, group.id, { nameEn: event.target.value })} /></label>
            <label className="field-label">Group GE<input value={group.nameGe} onChange={(event) => actions.updateOptionGroup(dish.id, group.id, { nameGe: event.target.value })} /></label>
          </div>
          <div className="four-column-fields">
            <label className="toggle-label"><input type="checkbox" checked={group.required} onChange={(event) => actions.updateOptionGroup(dish.id, group.id, { required: event.target.checked })} /> Required</label>
            <label className="field-label">Min select<input type="number" min="0" max="12" value={group.minSelect} onChange={(event) => actions.updateOptionGroup(dish.id, group.id, { minSelect: Number(event.target.value) })} /></label>
            <label className="field-label">Max select<input type="number" min="0" max="12" value={group.maxSelect} onChange={(event) => actions.updateOptionGroup(dish.id, group.id, { maxSelect: Number(event.target.value) })} /></label>
            <button className="danger" type="button" onClick={() => actions.deleteOptionGroup(dish.id, group.id)}>Delete group</button>
          </div>
          <div className="subsection-title compact-subsection">
            <h5>Options</h5>
            <button type="button" onClick={() => actions.addOption(dish.id, group.id)}>+ Option</button>
          </div>
          {(group.options ?? []).map((option) => (
            <div className="option-row" key={option.id}>
              <input aria-label="Option English name" value={option.nameEn} onChange={(event) => actions.updateOption(dish.id, group.id, option.id, { nameEn: event.target.value })} />
              <input aria-label="Option Georgian name" value={option.nameGe} onChange={(event) => actions.updateOption(dish.id, group.id, option.id, { nameGe: event.target.value })} />
              <input aria-label="Option price delta" type="number" step="0.01" value={formatOptionalNumber(option.priceDelta)} onChange={(event) => actions.updateOption(dish.id, group.id, option.id, { priceDelta: parseOptionalNumber(event.target.value) ?? 0 })} />
              <button type="button" onClick={() => actions.deleteOption(dish.id, group.id, option.id)}>Delete option</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BadgeEditor({ dish, actions }) {
  return (
    <div className="badge-editor">
      <div className="subsection-title">
        <h4>Badges</h4>
        <button type="button" onClick={() => actions.addBadge(dish.id)}>+ Badge</button>
      </div>
      {(dish.badges ?? []).length === 0 ? <p className="muted-text">No badges yet.</p> : null}
      {(dish.badges ?? []).map((badge) => (
        <div className="badge-row" key={badge.id}>
          <select value={badge.type} onChange={(event) => actions.updateBadge(dish.id, badge.id, { type: event.target.value })}>
            {BADGE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input
            aria-label="Badge emoji"
            placeholder="Emoji"
            value={badge.emoji}
            onChange={(event) => actions.updateBadge(dish.id, badge.id, { emoji: event.target.value })}
          />
          <input
            aria-label="Custom badge text"
            placeholder="Custom text"
            value={badge.customText}
            onChange={(event) => actions.updateBadge(dish.id, badge.id, { customText: event.target.value })}
          />
          <button type="button" onClick={() => actions.deleteBadge(dish.id, badge.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

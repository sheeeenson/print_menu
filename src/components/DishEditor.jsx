import { BADGE_TYPES } from '../models/menu.js';
import { formatOptionalNumber, parseOptionalNumber } from '../utils/pricing.js';

export function DishEditor({ dish, actions }) {
  const updateText = (field) => (event) => actions.updateDish(dish.id, { [field]: event.target.value });
  const updatePrice = (field) => (event) => actions.updateDish(dish.id, { [field]: parseOptionalNumber(event.target.value) }, field);

  return (
    <article className={`editor-card dish-editor ${dish.visible ? '' : 'hidden-dish'}`}>
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

      <div className="two-column-fields">
        <TextInput dish={dish} field="nameEn" label="English name" onChange={updateText('nameEn')} />
        <TextInput dish={dish} field="nameGe" label="Georgian name" onChange={updateText('nameGe')} />
      </div>
      <div className="two-column-fields">
        <TextareaInput dish={dish} field="descriptionEn" label="English description" onChange={updateText('descriptionEn')} />
        <TextareaInput dish={dish} field="descriptionGe" label="Georgian description" onChange={updateText('descriptionGe')} />
      </div>
      <div className="four-column-fields">
        <TextInput dish={dish} field="weight" label="Weight" placeholder="250 g" onChange={updateText('weight')} />
        <NumberInput dish={dish} field="oldPrice" label="Old price" step="0.01" onChange={updatePrice('oldPrice')} />
        <NumberInput dish={dish} field="newPrice" label="New price" step="0.01" onChange={updatePrice('newPrice')} />
        <NumberInput dish={dish} field="discountPercent" label="Discount %" step="1" onChange={updatePrice('discountPercent')} />
      </div>
      <TextInput dish={dish} field="imageUrl" label="Image URL" placeholder="https://..." onChange={updateText('imageUrl')} />
      {dish.imageUrl ? (
        <div className="image-preview">
          <img src={dish.imageUrl} alt={`${dish.nameEn} preview`} />
        </div>
      ) : null}
      <BadgeEditor dish={dish} actions={actions} />
    </article>
  );
}

function TextInput({ dish, field, label, placeholder = '', onChange }) {
  return (
    <label className="field-label">
      {label}
      <input value={dish[field]} placeholder={placeholder} onChange={onChange} />
    </label>
  );
}

function TextareaInput({ dish, field, label, onChange }) {
  return (
    <label className="field-label">
      {label}
      <textarea rows="3" value={dish[field]} onChange={onChange} />
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

function BadgeEditor({ dish, actions }) {
  return (
    <div className="badge-editor">
      <div className="subsection-title">
        <h4>Badges</h4>
        <button type="button" onClick={() => actions.addBadge(dish.id)}>+ Badge</button>
      </div>
      {dish.badges.length === 0 ? <p className="muted-text">No badges yet.</p> : null}
      {dish.badges.map((badge) => (
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

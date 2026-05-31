import { BADGE_TYPES } from '../models/menu.js';
import { escapeHtml } from './dom.js';
import { formatOptionalNumber } from '../utils/pricing.js';

export function renderDishEditor(dish) {
  return `
    <article class="editor-card dish-editor ${dish.visible ? '' : 'hidden-dish'}">
      <div class="editor-card-title">
        <div>
          <h3>${escapeHtml(dish.nameEn || 'Untitled dish')}</h3>
          <p>${dish.visible ? 'Visible on menus' : 'Hidden from menus'}</p>
        </div>
        <div class="action-row">
          <button type="button" data-action="toggle-dish" data-dish-id="${dish.id}">${dish.visible ? 'Hide' : 'Show'}</button>
          <button type="button" data-action="duplicate-dish" data-dish-id="${dish.id}">Duplicate</button>
          <button class="danger" type="button" data-action="delete-dish" data-dish-id="${dish.id}">Delete</button>
        </div>
      </div>

      <div class="two-column-fields">
        ${textInput(dish, 'nameEn', 'English name')}
        ${textInput(dish, 'nameGe', 'Georgian name')}
      </div>
      <div class="two-column-fields">
        ${textareaInput(dish, 'descriptionEn', 'English description')}
        ${textareaInput(dish, 'descriptionGe', 'Georgian description')}
      </div>
      <div class="four-column-fields">
        ${textInput(dish, 'weight', 'Weight', '250 g')}
        ${numberInput(dish, 'oldPrice', 'Old price', '0.01')}
        ${numberInput(dish, 'newPrice', 'New price', '0.01')}
        ${numberInput(dish, 'discountPercent', 'Discount %', '1')}
      </div>
      ${textInput(dish, 'imageUrl', 'Image URL', 'https://...')}
      ${dish.imageUrl ? `<div class="image-preview"><img src="${escapeHtml(dish.imageUrl)}" alt="${escapeHtml(dish.nameEn)} preview" /></div>` : ''}
      ${renderBadgeEditor(dish)}
    </article>
  `;
}

function textInput(dish, field, label, placeholder = '') {
  return `
    <label class="field-label">
      ${label}
      <input data-action="dish-field" data-dish-id="${dish.id}" data-field="${field}" value="${escapeHtml(dish[field])}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `;
}

function textareaInput(dish, field, label) {
  return `
    <label class="field-label">
      ${label}
      <textarea rows="3" data-action="dish-field" data-dish-id="${dish.id}" data-field="${field}">${escapeHtml(dish[field])}</textarea>
    </label>
  `;
}

function numberInput(dish, field, label, step) {
  return `
    <label class="field-label">
      ${label}
      <input type="number" min="0" ${field === 'discountPercent' ? 'max="99"' : ''} step="${step}" data-action="price-field" data-dish-id="${dish.id}" data-field="${field}" value="${escapeHtml(formatOptionalNumber(dish[field]))}" />
    </label>
  `;
}

function renderBadgeEditor(dish) {
  return `
    <div class="badge-editor">
      <div class="subsection-title">
        <h4>Badges</h4>
        <button type="button" data-action="add-badge" data-dish-id="${dish.id}">+ Badge</button>
      </div>
      ${dish.badges.length === 0 ? '<p class="muted-text">No badges yet.</p>' : ''}
      ${dish.badges
        .map(
          (badge) => `
            <div class="badge-row">
              <select data-action="badge-field" data-dish-id="${dish.id}" data-badge-id="${badge.id}" data-field="type">
                ${BADGE_TYPES.map((type) => `<option value="${type}" ${badge.type === type ? 'selected' : ''}>${type}</option>`).join('')}
              </select>
              <input aria-label="Badge emoji" placeholder="Emoji" data-action="badge-field" data-dish-id="${dish.id}" data-badge-id="${badge.id}" data-field="emoji" value="${escapeHtml(badge.emoji)}" />
              <input aria-label="Custom badge text" placeholder="Custom text" data-action="badge-field" data-dish-id="${dish.id}" data-badge-id="${badge.id}" data-field="customText" value="${escapeHtml(badge.customText)}" />
              <button type="button" data-action="delete-badge" data-dish-id="${dish.id}" data-badge-id="${badge.id}">Remove</button>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

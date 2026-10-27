/**
 * Icon System - Monochrome SVG Icon Helper
 * Usage: import { icon, injectSprite } from './assets/icons/icons.js';
 *        injectSprite(); // Call once on page load
 *        element.innerHTML = icon('arrow-right', { class: 'icon-size-lg' });
 */

const SPRITE_PATH = '/assets/icons/sprite.svg';
let spriteInjected = false;

/**
 * Inject the SVG sprite into the document body (call once on page load)
 * @returns {Promise<void>}
 */
export async function injectSprite() {
  if (spriteInjected) return;

  try {
    const response = await fetch(SPRITE_PATH);
    if (!response.ok) throw new Error(`Failed to load sprite: ${response.status}`);

    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Insert at the beginning of body (hidden)
    document.body.insertAdjacentElement('afterbegin', svgElement);
    spriteInjected = true;
  } catch (error) {
    console.warn('[Icon System] Failed to inject sprite:', error);
  }
}

/**
 * Create an icon SVG element using the sprite
 * @param {string} name - Icon name (without 'icon-' prefix)
 * @param {Object} options - Options object
 * @param {string} options.class - Additional CSS classes
 * @param {string} options.size - Size preset: 'xs' (16px), 'sm' (20px), 'md' (24px), 'lg' (32px), 'xl' (48px)
 * @param {string} options.ariaLabel - Accessibility label
 * @param {boolean} options.ariaHidden - Hide from screen readers (default: true for decorative)
 * @returns {SVGElement}
 */
export function createIcon(name, options = {}) {
  const {
    class: className = '',
    size = 'md',
    ariaLabel,
    ariaHidden = !ariaLabel,
    ...attrs
  } = options;

  const sizeMap = {
    xs: '16',
    sm: '20',
    md: '24',
    lg: '32',
    xl: '48'
  };

  const iconName = name.startsWith('icon-') ? name : `icon-${name}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

  // Set attributes
  svg.setAttribute('class', `icon icon-${name} ${className}`.trim());
  svg.setAttribute('aria-hidden', ariaHidden.toString());
  svg.setAttribute('width', sizeMap[size] || size);
  svg.setAttribute('height', sizeMap[size] || size);
  svg.setAttribute('role', ariaLabel ? 'img' : 'presentation');

  if (ariaLabel) {
    svg.setAttribute('aria-label', ariaLabel);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = ariaLabel;
    svg.appendChild(title);
  }

  // Apply additional attributes
  Object.entries(attrs).forEach(([key, value]) => {
    svg.setAttribute(key, value);
  });

  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${iconName}`);
  svg.appendChild(use);

  return svg;
}

/**
 * Get icon HTML string (for use with innerHTML)
 * @param {string} name - Icon name
 * @param {Object} options - Same as createIcon
 * @returns {string}
 */
export function icon(name, options = {}) {
  const {
    class: className = '',
    size = 'md',
    ariaLabel,
    ariaHidden = !ariaLabel,
    ...attrs
  } = options;

  const sizeMap = {
    xs: '16',
    sm: '20',
    md: '24',
    lg: '32',
    xl: '48'
  };

  const iconName = name.startsWith('icon-') ? name : `icon-${name}`;
  const sizeValue = sizeMap[size] || size;
  const ariaAttrs = ariaLabel
    ? `role="img" aria-label="${ariaLabel}"`
    : `aria-hidden="${ariaHidden}"`;

  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `<svg class="icon icon-${name.replace('icon-', '')} ${className}" width="${sizeValue}" height="${sizeValue}" ${ariaAttrs} ${attrString}><use href="#${iconName}"/></svg>`;
}

/**
 * Replace all elements with data-icon attribute with actual icons
 * @param {Element} root - Root element to search (default: document)
 */
export function replaceIcons(root = document) {
  const elements = root.querySelectorAll('[data-icon]');
  elements.forEach(el => {
    const name = el.dataset.icon;
    const size = el.dataset.iconSize || 'md';
    const className = el.dataset.iconClass || '';
    const ariaLabel = el.dataset.iconLabel;
    const ariaHidden = el.dataset.iconHidden !== 'false';

    const svg = createIcon(name, { size, class: className, ariaLabel, ariaHidden });
    el.replaceWith(svg);
  });
}

/**
 * Auto-initialize: inject sprite and replace data-icon elements
 * Call this once in your main JS file
 */
export async function initIcons() {
  await injectSprite();
  replaceIcons();
  // Watch for dynamically added content
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          if (node.matches('[data-icon]')) {
            replaceIcons(node);
          }
          replaceIcons(node);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

// Default export for convenience
export default {
  injectSprite,
  createIcon,
  icon,
  replaceIcons,
  initIcons
};
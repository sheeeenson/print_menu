export const A3_ELEMENT_TYPES = Object.freeze([
  'image',
  'nameEn',
  'nameGe',
  'descriptionEn',
  'descriptionGe',
  'price',
  'oldPrice',
]);

export const getA3ElementKey = (dishId, type) => `${dishId}:${type}`;

const defaultElementTransform = (type, base, index) => {
  const z = 20 + index * 8;
  switch (type) {
    case 'image': return { x: base.x, y: base.y, scale: base.scale, z: base.z ?? z };
    case 'nameEn': return { x: Math.max(.08, base.x - .17), y: Math.min(.9, base.y + .18), scale: 1, z: z + 1 };
    case 'nameGe': return { x: Math.max(.08, base.x - .17), y: Math.min(.95, base.y + .235), scale: 1, z: z + 2 };
    case 'descriptionEn': return { x: Math.max(.08, base.x - .17), y: Math.min(.975, base.y + .29), scale: 1, z: z + 3 };
    case 'descriptionGe': return { x: Math.max(.08, base.x - .17), y: Math.min(.99, base.y + .335), scale: 1, z: z + 4 };
    case 'price': return { x: Math.min(.92, base.x + .18), y: Math.min(.9, base.y + .2), scale: 1, z: z + 5 };
    case 'oldPrice': return { x: Math.min(.92, base.x + .18), y: Math.min(.82, base.y + .12), scale: 1, z: z + 6 };
    default: return { x: base.x, y: base.y, scale: 1, z };
  }
};

export const buildDefaultA3ElementTransforms = (ids = [], getBaseTransform) => ids.reduce((result, id, index) => {
  const base = getBaseTransform(ids.length || 1, index);
  A3_ELEMENT_TYPES.forEach((type) => {
    result[getA3ElementKey(id, type)] = defaultElementTransform(type, base, index);
  });
  return result;
}, {});

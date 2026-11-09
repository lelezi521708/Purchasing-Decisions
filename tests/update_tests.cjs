const fs = require('fs');
const assert = require('assert');
const flowPath = process.argv[2] || '/tmp/pricewatch-abc-latest.json';
const cSourcePath = process.argv[3] || '/tmp/pricewatch-c-source.json';
const flows = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
const cSource = JSON.parse(fs.readFileSync(cSourcePath, 'utf8'));
const compiler = require('/data/node_modules/vue/compiler-sfc');

assert.equal(flows.length, 93, 'The latest integrated flow should contain 93 nodes');
assert.equal(new Set(flows.map(node => node.id)).size, flows.length, 'Node IDs must be unique');
const ids = new Set(flows.map(node => node.id));
for (const node of flows) {
  for (const output of node.wires || []) {
    for (const target of output) assert(ids.has(target), `Missing wire target ${target}`);
  }
  if (node.func) new Function('msg', node.func);
}

function node(id) {
  const value = flows.find(item => item.id === id);
  assert(value, `Missing node ${id}`);
  return value;
}

function component(id) {
  const source = node(id).format;
  const { descriptor } = compiler.parse(source);
  const result = compiler.compileTemplate({ source: descriptor.template.content, filename: `${id}.vue`, id });
  assert.deepEqual(result.errors, [], `${id} template compilation failed`);
  return new Function(descriptor.script.content.replace('export default', 'return'))();
}

function vm(componentDefinition) {
  const value = componentDefinition.data();
  for (const [key, method] of Object.entries(componentDefinition.methods || {})) value[key] = method.bind(value);
  return value;
}

// C's three changed nodes and global Favorites node must remain byte-for-byte unchanged.
for (const id of ['c7503query0000001', 'c7503analyse00001', 'c7503template001', 'c7503favoritesui']) {
  assert.deepEqual(node(id), cSource.find(item => item.id === id), `C node ${id} was changed by B`);
}

const query = node('b1c001a1a1a1a1a').func;
assert(query.includes('brand: 1') && query.includes('brandEn: 1'), 'B query must carry brand fields');

const format = new Function('msg', node('b1c003c3c3c3c3c').func);
const sourceRows = [
  { productCode: 'P000001819', merchantCode: 'PARKNSHOP', name: '(每個) (35220)', nameEn: '(each pc) (35220)', brand: '青椰菜', brandEn: 'Green Cabbage', category2: 'Vegetables', category2En: 'Vegetables', category3: 'Cabbage', category3En: 'Cabbage', price: 8, offerText: '買2件$12.00' },
  { productCode: 'P000001819', merchantCode: 'WELLCOME', name: '(每個) (35220)', nameEn: '(each pc) (35220)', brand: '青椰菜', brandEn: 'Green Cabbage', category2: 'Vegetables', category2En: 'Vegetables', category3: 'Cabbage', category3En: 'Cabbage', price: 9 },
  { productCode: 'P2', merchantCode: 'PARKNSHOP', name: 'Tissue', nameEn: 'Tissue', brand: 'Brand that must not be added', brandEn: 'Brand that must not be added', category2: 'Care', category3: 'Paper', price: 20 }
];
const formatted = format({ payload: [{ category: 'Food', batchId: 'b', collectedAt: '2026-11-09T00:00:00Z', requestedProductCode: 'P000001819', selectedProduct: { productCode: 'P000001819', name: '(每個) (35220)', nameEn: '(each pc) (35220)', brand: '青椰菜', brandEn: 'Green Cabbage' }, records: sourceRows }] })[0].payload[0];
assert.equal(formatted.selectedProduct.name, '青椰菜 (每個) (35220)');
assert.equal(formatted.selectedProduct.nameEn, 'Green Cabbage (each pc) (35220)');
assert.equal(formatted.products.find(item => item.productCode === 'P000001819').name, '青椰菜 (每個) (35220)');
assert.equal(formatted.offers[0].productName, '青椰菜 (每個) (35220)');
assert.equal(formatted.products.find(item => item.productCode === 'P2').name, 'Tissue');
assert.equal(sourceRows[0].name, '(每個) (35220)', 'Source records must not be mutated');

const source = node('b1c004d4d4d4d4d').format;
assert(source.includes("{{isFavorite(p.productCode) ? '★' : '☆'}}"));
assert(source.includes('pricewatch:favorites-changed'));
assert(source.includes("window.addEventListener('storage',this.syncFavorites)"));
assert(source.includes('aria-pressed="isFavorite(p.productCode)"'));
assert(source.includes('pw-best-saving'), 'Existing best-saving highlight must remain');
assert(source.includes('Number.isInteger(q)&&q>=1&&q<=99'), 'Existing quantity validation must remain');

global.window = { PriceWatchFavorites: null };
const b = component('b1c004d4d4d4d4d');
let view = vm(b);
view.syncFavorites();
assert.equal(view.favoriteReady, false, 'Buttons must remain disabled before shared API initialization');

window.PriceWatchFavorites = {
  list: () => [{ productCode: 'p000001819', name: 'old' }],
  toggle: () => { throw new Error('Quota exceeded'); }
};
view.syncFavorites();
assert.equal(view.favoriteReady, true);
assert.equal(view.isFavorite('P000001819'), true, 'Favorite state must be keyed by normalized product code');
const before = [...view.favoriteCodes];
view.toggleFavorite({ productCode: 'P000001819', name: '青椰菜 (每個) (35220)' });
assert.deepEqual(view.favoriteCodes, before, 'Failed save must preserve displayed state');
assert(view.favoriteError.includes('previous selection'));

let toggled = null;
window.PriceWatchFavorites = {
  list: () => [],
  toggle: item => { toggled = item; }
};
view.favoriteReady = true;
view.toggleFavorite({ productCode: 'P000001819', name: '青椰菜 (每個) (35220)' });
assert.deepEqual(toggled, { productCode: 'P000001819', name: '青椰菜 (每個) (35220)' });

console.log(JSON.stringify({
  nodes: flows.length,
  functionsChecked: flows.filter(node => node.func).length,
  templatesChecked: flows.filter(node => node.type === 'ui-template').length,
  cNodesPreserved: true,
  nameNormalization: true,
  favoriteStateByProductCode: true,
  failedSavePreservesState: true,
  existingBFeaturesPreserved: true
}, null, 2));

// Display-only normalization following A's shared naming rule.
function displayName(name, brand) {
    name = typeof name === 'string' ? name.trim() : '';
    brand = typeof brand === 'string' ? brand.trim() : '';
    const unit = /^(?:\(\s*(?:每個|每个|每件|每包|each\s*pc|each|per\s*pc)\s*\)|（\s*(?:每個|每个|每件|每包)\s*）)/i;
    return unit.test(name) && brand && !name.includes(brand) ? brand + ' ' + name : name;
}
const batches = msg.payload || [], q = msg.cQuery;
for (const batch of batches) {
    batch.quotes = (batch.quotes || []).map(row => ({...row,
        name: displayName(row.name, row.brand),
        nameEn: displayName(row.nameEn, row.brandEn)}));
}
const cents = p => typeof p === 'number' && Number.isFinite(p) && p > 0 ? Math.round(p * 100) : null;
const day = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
let result = { mode: q.mode, batches: batches.map(b => ({ batchId: b.batchId, time: b.collectedAt })), note: 'Successful collections only. Dates show Hong Kong collection times, which may differ from source update times.' };
if (q.mode === 'search' || q.mode === 'categories') result.items = batches[0]?.quotes || [];
else if (q.mode === 'history') {
    const names = [...new Set(batches.flatMap(b => b.quotes.map(r => r.merchantCode)))].sort();
    result.nameEn = batches.flatMap(b => b.quotes)[0]?.nameEn || ''; result.name = batches.flatMap(b => b.quotes)[0]?.name || ''; result.productCode = q.code;
    result.series = names.map(merchant => {
        const points = batches.map(b => ({ time: b.collectedAt, batchId: b.batchId, price: cents(b.quotes.find(r => r.merchantCode === merchant)?.price) }));
        const valid = points.filter(p => p.price !== null), last = valid.at(-1), prev = valid.at(-2), min = valid.length ? Math.min(...valid.map(p => p.price)) : null;
        return { merchant, points, observations: valid.length, min, last, previous: prev, drop: last && prev ? prev.price - last.price : null, dropPercent: last && prev ? (prev.price - last.price) / prev.price * 100 : null, gap: last ? last.price - min : null };
    });
} else {
    const maps = batches.map(b => { const m = new Map(); for (const r of b.quotes) { const p = cents(r.price); if (p === null) continue; if (!m.has(r.productCode)) m.set(r.productCode, {}); m.get(r.productCode)[r.merchantCode] = p; } return m; });
    const sample = maps.length ? [...maps[0].keys()].filter(code => maps.every(m => m.get(code)?.[q.a] != null && m.get(code)?.[q.b] != null)) : [];
    result.sampleSize = sample.length; result.a = q.a; result.b = q.b;
    result.periods = batches.map((b, i) => { let a = 0, equal = 0, bb = 0; for (const code of sample) { const v = maps[i].get(code); if (v[q.a] < v[q.b]) a++; else if (v[q.a] > v[q.b]) bb++; else equal++; } return { time: b.collectedAt, a, b: bb, equal }; });
    result.warning = batches.length < 2 ? 'Too few batches to assess persistence.' : sample.length < 10 ? 'Fewer than 10 products in the fixed sample; interpret with caution.' : '';
}
msg.payload = result; msg.headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }; return msg;

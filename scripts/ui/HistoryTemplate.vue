<template>
<section class="pw-c"><h1>Price History</h1><p>Explore collected prices and merchant advantages over time.</p>
<nav class="pw-c-tabs" aria-label="History views"><button @click="tab='history'" :aria-pressed="tab==='history'">Product history</button><button @click="tab='trends'" :aria-pressed="tab==='trends'">Merchant trends</button></nav>
<div v-show="tab==='history'">
<div class="pw-c-find">
<form @submit.prevent="search"><label>Category<select v-model="productCategory" @change="changeCategory"><option value="">All categories</option><option v-for="c in categories" :value="c._id">{{categoryLabel(c._id)}}</option></select></label><label>Search by name<input v-model="keyword" placeholder="Name, keyword or product code"></label><button>Search</button></form>
<form @submit.prevent="choose(code)"><label>Find by product code<input v-model="code" placeholder="P000003984"></label><button>View history</button></form>
</div>
<p>Search covers the latest successful collection. Showing up to 50 products; narrow the category or keyword if more results are available.</p>
<p role="status">{{states.search}}</p>
<select v-if="items.length>1" v-model="candidate" @change="choose(candidate)" aria-label="Choose a product"><option disabled value="">Choose a product</option><option v-for="i in items" :value="i._id">{{i.nameEn || i.name}} · {{i._id}}</option></select>
<h2 v-if="selectedCode">{{productName || 'Selected product'}} <button type="button" class="pw-fav-star" :disabled="!favoriteReady || !data || !data.series.length" :aria-pressed="favoriteSaved" :aria-label="favoriteSaved ? 'Remove from favorites' : 'Save to favorites'" @click="toggleFavorite">{{favoriteSaved ? '★' : '☆'}}</button><small>{{selectedCode}}</small></h2><p role="alert" v-if="favoriteError">{{favoriteError}}</p><p v-if="data &amp;&amp; data.name &amp;&amp; data.name!==productName">{{data.name}}</p>
<form @submit.prevent="history"><label>Start date<input type="date" v-model="start"></label><label>End date<input type="date" v-model="end"></label><button :disabled="!selectedCode">Apply dates</button><button type="button" @click="allDates" :disabled="!selectedCode">All dates</button></form>
<p v-if="start!==applied.start || end!==applied.end">Date changes have not been applied.</p>
<p role="status">{{states.history}}</p>
<p v-if="data">Applied range: {{range(applied)}}</p>
<div v-if="data"><p>{{data.note}} {{data.batches.length}} batches. Missing quotes and gaps in calendar coverage break the line. Same-day collections retain separate timestamps.</p>
<label>Chart merchant <select v-model="merchant"><option v-for="s in data.series" :value="s.merchant">{{s.merchant}}</option></select></label>
<svg v-if="selected && selected.observations" viewBox="0 0 900 260" role="img" :aria-label="merchant+' price history chart'">
<line x1="60" y1="220" x2="870" y2="220" stroke="#627587"/><line x1="60" y1="20" x2="60" y2="220" stroke="#627587"/>
<text x="4" y="18">HKD</text><text x="5" y="42">{{money(maxPrice)}}</text><text x="5" y="216">{{money(minPrice)}}</text>
<path :d="chartPath" fill="none" stroke="#386D83" stroke-width="3"/>
<circle v-for="p in selected.points.filter(p=>p.price!==null)" :cx="x(p.time)" :cy="y(p.price)" r="4" fill="#386D83"><title>{{date(p.time)}} — HKD {{money(p.price)}}</title></circle>
<text x="60" y="245">{{date(data.batches[0]?.time)}}</text><text x="870" y="245" text-anchor="end">{{date(data.batches.at(-1)?.time)}}</text></svg>
<div class="pw-c-scroll"><table><thead><tr><th>Merchant</th><th>Valid quotes</th><th>Period minimum (HKD)</th><th>Latest valid price (HKD)</th><th>Above period minimum (HKD)</th><th>Last two valid quotes: drop</th><th>Comparison dates</th></tr></thead><tbody><tr v-for="s in sortedSeries" :key="s.merchant" :class="{'pw-low':s.min!==null &amp;&amp; s.min===lowest,'pw-empty':!s.observations}"><td><img class="pw-logo" :src="'/pricewatch-assets/merchants/'+s.merchant+'.png'" alt="" @error="$event.target.style.display='none'">{{s.merchant}}<small v-if="s.min!==null &amp;&amp; s.min===lowest"> Lowest in selected period</small></td><td>{{s.observations}}</td><td>{{money(s.min)}}</td><td>{{money(s.last?.price)}}</td><td>{{money(s.gap)}}</td><td>{{s.drop==null?'Insufficient data':s.drop>0?money(s.drop)+' ('+s.dropPercent.toFixed(2)+'%)':s.drop===0?'Unchanged':'Increase '+money(-s.drop)}}</td><td>{{date(s.previous?.time)}} → {{date(s.last?.time)}}</td></tr></tbody></table></div>
<p>The latest valid quote may precede the latest collection. Minimum prices refer only to the selected period. See the comparison dates.</p>
<details v-if="selected"><summary>View individual collection records</summary><table><tr v-for="p in selected.points"><td>{{date(p.time)}}</td><td>{{money(p.price)}}</td></tr></table></details></div>
</div><div v-show="tab==='trends'"><h2>Merchant trends</h2><p>The fixed sample includes products with valid prices at both merchants in every selected batch. Each collection is counted separately.</p>
<form @submit.prevent="advantage"><label>Merchant A <select v-model="a"><option v-for="m in merchants">{{m}}</option></select></label><label>Merchant B <select v-model="b"><option v-for="m in merchants">{{m}}</option></select></label><label>Category <select v-model="category" aria-label="Category"><option value="">All categories</option><option v-for="c in categories" :value="c._id">{{categoryLabel(c._id)}}</option></select></label><label>Start date<input type="date" v-model="trendStart"></label><label>End date<input type="date" v-model="trendEnd"></label><button>Compare</button><button type="button" @click="allTrendDates">All dates</button></form>
<p role="status">{{states.advantage}}</p><p v-if="trendStart!==trendApplied.start || trendEnd!==trendApplied.end">Date changes have not been applied.</p><div v-if="comparison"><p>Applied range: {{range(trendApplied)}}</p><p>Fixed sample {{comparison.sampleSize}} products · {{comparison.periods.length}} batches</p><p>{{comparison.warning}}</p><p v-if="comparison.periods.length">Coverage: {{date(comparison.periods[0].time)}} to {{date(comparison.periods.at(-1).time)}}</p><div class="pw-c-scroll"><table><thead><tr><th>Collection time (Hong Kong)</th><th>{{comparison.a}} cheaper</th><th>Equal</th><th>{{comparison.b}} cheaper</th></tr></thead><tbody><tr v-for="p in comparison.periods"><td>{{date(p.time)}}</td><td>{{p.a}} · {{pct(p.a)}}</td><td>{{p.equal}} · {{pct(p.equal)}}</td><td>{{p.b}} · {{pct(p.b)}}</td></tr></tbody></table></div><p>All shares use the same denominator of {{comparison.sampleSize}}. Results represent only this fixed sample.</p></div>
</div></section>
</template>
<script>export default {
data(){return {favoriteReady:false,favoriteSaved:false,favoriteError:'',tab:'history',start:'',end:'',trendStart:'',trendEnd:'',applied:{start:'',end:''},trendApplied:{start:'',end:''},keyword:'',code:'',selectedCode:'',productName:'',candidate:'',productCategory:'',items:[],categories:[],data:null,comparison:null,merchant:'',a:'PARKNSHOP',b:'WELLCOME',category:'',states:{search:'',history:'',advantage:'',categories:''},requests:{search:0,history:0,advantage:0,categories:0},merchants:['AEON','DCHFOOD','JASONS','LUNGFUNG','MANNINGS','PARKNSHOP','SASA','WATSONS','WELLCOME']};},computed:{sortedSeries(){return [...(this.data?.series||[])].sort((a,b)=>(Number(b.observations>0)-Number(a.observations>0))||((a.min??Infinity)-(b.min??Infinity))||a.merchant.localeCompare(b.merchant))},lowest(){const values=(this.data?.series||[]).filter(s=>s.min!==null).map(s=>s.min);return values.length?Math.min(...values):null},selected(){return this.data?.series.find(s=>s.merchant===this.merchant)},minPrice(){return Math.min(...(this.selected?.points.filter(p=>p.price!==null).map(p=>p.price)||[0]))},maxPrice(){return Math.max(...(this.selected?.points.filter(p=>p.price!==null).map(p=>p.price)||[0]))},chartPath(){let d='',prev=null;for(const p of this.selected?.points||[]){if(p.price===null){prev=null;continue}const gap=prev?Math.floor((+new Date(p.time)+28800000)/86400000)-Math.floor((+new Date(prev.time)+28800000)/86400000):99;d+=(prev&&gap<=1?' L':' M')+this.x(p.time)+','+this.y(p.price);prev=p;}return d;}},
methods:{
syncFavorite() {
    this.favoriteReady = Boolean(window.PriceWatchFavorites);
    if (!this.favoriteReady) return;
    try {
        this.favoriteSaved = this.data ? window.PriceWatchFavorites.has(this.data.productCode) : false;
        this.favoriteError = '';
    } catch (error) {
        this.favoriteReady = false;
        this.favoriteError = 'Favorites could not be read. Check browser storage and retry.';
    }
},
toggleFavorite() {
    if (!this.favoriteReady || !this.data || !this.data.series.length) return;
    try {
        window.PriceWatchFavorites.toggle({productCode:this.data.productCode,name:this.productName || this.data.name || this.data.productCode});
        this.syncFavorite();
    } catch (error) {
        this.favoriteError = 'Could not save favorites. Your previous selection has been kept.';
    }
},
money(v){return v==null?'No quote':(v/100).toFixed(2)},date(t){return t?new Date(t).toLocaleString('en-GB',{timeZone:'Asia/Hong_Kong',hour12:false}):'—'},pct(v){return this.comparison.sampleSize?(v/this.comparison.sampleSize*100).toFixed(1)+'%':'—'},x(t){const lo=+new Date(this.data.batches[0].time),hi=+new Date(this.data.batches.at(-1).time);return 60+(hi===lo?0.5:(+new Date(t)-lo)/(hi-lo))*810},y(p){return this.maxPrice===this.minPrice?120:220-(p-this.minPrice)/(this.maxPrice-this.minPrice)*190},range(value) {
    return value.start || value.end ? (value.start || 'First available') + ' to ' + (value.end || 'Latest available') : 'All available dates';
},
categoryLabel(value) {
    const labels = {'個人護理':'Personal care','奶粉 / 嬰兒用品':'Infant formula / Baby products','奶類及乳製品 / 大豆製品 / 蛋類':'Dairy / Soy / Eggs','家居用品 / 寵物食品及用品':'Household / Pet supplies','米 / 食油 / 罐頭 / 蔬果 / 肉類':'Rice / Oil / Canned food / Produce / Meat','粉麵 / 煮食用料 / 冷凍加工食品':'Noodles / Cooking ingredients / Frozen food','糖果 / 餅乾 / 小食':'Confectionery / Biscuits / Snacks','酒類':'Alcohol','飲品':'Beverages','麵包蛋糕 / 穀類早餐 / 麵包醬':'Bread / Cakes / Cereals / Spreads'};
    return labels[value] || value;
},
async request(key, query) {
    const id = ++this.requests[key];
    this.states[key] = 'Loading…';
    try {
        const response = await fetch('/pricewatch-c/api?' + new URLSearchParams(query));
        const result = await response.json();
        if (id !== this.requests[key]) return null;
        if (!response.ok || result.error) throw new Error(result.error || 'Query failed. Please retry.');
        this.states[key] = 'Results loaded';
        return result;
    } catch (error) {
        if (id === this.requests[key]) this.states[key] = error.message || 'Connection failed. Please retry.';
        return null;
    }
},
async loadCategories() {
    const result = await this.request('categories', {mode:'categories'});
    if (result) this.categories = result.items;
},
changeCategory() {
    this.requests.search++;
    this.requests.history++;
    this.states.search = '';
    this.states.history = '';
    this.items = [];
    this.candidate = '';
    this.selectedCode = '';
    this.productName = '';
    this.data = null;
    this.search();
},
async search() {
    this.items = [];
    this.candidate = '';
    const keyword = this.keyword.trim();
    if (/^P[0-9]{1,20}$/i.test(keyword)) {
        this.choose(keyword);
        return;
    }
    const result = await this.request('search', {mode:'search', keyword, category:this.productCategory});
    if (!result) return;
    this.items = result.items.slice(0,50);
    this.states.search = result.items.length > 50 ? 'Showing the first 50 matches. Narrow your search.' : result.items.length + ' matching products';
    if (!result.items.length) this.states.search = 'No matching products in the latest successful collection. Try another category or keyword.';
    if (result.items.length === 1) this.choose(result.items[0]._id);
},
choose(value) {
    this.requests.search++;
    this.states.search = '';
    this.items = [];
    this.candidate = '';
    this.code = String(value || '').trim().toUpperCase();
    this.selectedCode = this.code;
    this.productName = '';
    this.start = '';
    this.end = '';
    this.productCategory = '';
    this.history();
},
allDates() {
    this.start = '';
    this.end = '';
    this.history();
},
async history() {
    this.data = null;
    const range = {start:this.start,end:this.end};
    const result = await this.request('history', {mode:'history',productCode:this.selectedCode,...range});
    if (!result) return;
    this.data = result;
    this.syncFavorite();
    this.productName = result.nameEn || result.name;
    this.applied = range;
    this.merchant = result.series.find(s=>s.observations>0)?.merchant || result.series[0]?.merchant || '';
    if (!result.batches.length || !result.series.some(s=>s.observations>0)) this.states.history = 'No valid quotations for this product in the applied range.';
},
allTrendDates() {
    this.trendStart = '';
    this.trendEnd = '';
    this.advantage();
},
async advantage() {
    this.comparison = null;
    const range = {start:this.trendStart,end:this.trendEnd};
    const result = await this.request('advantage', {mode:'advantage',a:this.a,b:this.b,category:this.category,...range});
    if (!result) return;
    this.comparison = result;
    this.trendApplied = range;
    if (!result.periods.length || !result.sampleSize) this.states.advantage = 'No common valid sample for these filters.';
}
},
mounted(){window.addEventListener("pricewatch:favorites-changed",this.syncFavorite);window.addEventListener("storage",this.syncFavorite);this.syncFavorite();this.loadCategories();const code=new URLSearchParams(window.location.search).get("productCode");if(code)this.choose(code)},unmounted(){window.removeEventListener("pricewatch:favorites-changed",this.syncFavorite);window.removeEventListener("storage",this.syncFavorite);for(const key of Object.keys(this.requests))this.requests[key]++}
};</script>
<style>

.pw-c{font-family:inherit;font-size:13px;line-height:1.6;color:#334257;padding:16px 20px 24px;width:100%;max-width:100%;min-width:0;margin:auto;box-sizing:border-box}
.pw-c h1{color:#26384a;font-size:27px;line-height:1.4;font-weight:700;margin:8px 0 12px}
.pw-c h2{color:#26384a;font-size:19px;line-height:1.4;font-weight:700;margin:26px 0 14px}
.pw-c p{font-size:12px;line-height:1.7;color:#486373;margin:10px 0 18px}
.pw-c small{font-size:12px;color:#627587;font-weight:400}
.pw-c label{min-width:0;max-width:100%;font-size:12px;color:#486373}
.pw-c input,.pw-c select,.pw-c button{font-family:inherit;font-size:13px;line-height:1.5;box-sizing:border-box;min-height:44px;border:1px solid #dae2e8;border-radius:6px;padding:10px 14px;margin:0;background:#fff;color:#334257;max-width:100%}
.pw-c input{width:240px}.pw-c input[type=date]{width:180px}
.pw-c button{background:#386d83;border-color:#386d83;color:#fff;font-size:14px;font-weight:600;padding:10px 22px;cursor:pointer;transition:background .15s}
.pw-c button:hover:not(:disabled){background:#2c586b;border-color:#2c586b}
.pw-c button:disabled{opacity:.5;cursor:not-allowed}
.pw-c input:focus-visible,.pw-c select:focus-visible,.pw-c button:focus-visible{outline:2px solid #386d83;outline-offset:2px}
.pw-c-controls{display:flex;flex-wrap:wrap;gap:20px;margin:22px 0}
.pw-c-controls label{display:flex;align-items:center;gap:10px}
.pw-c form{display:flex;flex-wrap:wrap;align-items:end;gap:16px;margin:16px 0}
.pw-c form label{display:flex;flex-direction:column;gap:6px}
.pw-c>select{display:block;margin:14px 0;min-width:260px}
.pw-c svg{display:block;width:100%;max-height:320px;background:#f0f2f4;margin:22px 0;font-family:inherit}
.pw-c-scroll,.pw-c details{overflow-x:auto}
.pw-c table{min-width:760px;border-collapse:collapse;width:100%;font-size:13px;color:#334257}
.pw-c td,.pw-c th{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #e3e9ee}
.pw-c td{font-variant-numeric:tabular-nums}
.pw-c th{background:#f0f4f7;font-size:12px;font-weight:700}
.pw-c hr{margin:34px 0;border:0;border-top:1px solid #dae2e8}
.pw-c summary{font-size:12px;color:#386d83;cursor:pointer;padding:8px 0}
@media(max-width:600px){.pw-c{padding:12px}.pw-c h1{font-size:23px}.pw-c-controls{gap:12px}.pw-c-controls label{flex:1 1 100%;justify-content:space-between}.pw-c form{gap:12px}.pw-c form input{flex:1 1 180px;min-width:0}.pw-c form label{flex:1 1 150px}}

.pw-c-tabs{display:flex;gap:12px;margin:20px 0}.pw-c-tabs button[aria-pressed=true]{outline:3px solid #adc6d1}.pw-c-find{display:grid;grid-template-columns:2fr 1fr;gap:24px}.pw-c form label{flex:1;min-width:140px}.pw-c label input,.pw-c label select{width:100%}.pw-c .pw-logo{width:32px;height:32px;object-fit:contain;vertical-align:middle;margin-right:8px}.pw-c .pw-low{background:#eaf3f8}.pw-c .pw-low td:nth-child(3){font-weight:700;color:#245c75}.pw-c .pw-empty{color:#697a87}.pw-c small{display:block}@media(max-width:700px){.pw-c-find{grid-template-columns:1fr}.pw-c-tabs{flex-wrap:wrap}}
.pw-c input,.pw-c select{height:44px!important;min-height:44px!important;flex:initial!important}.pw-c form{align-items:end}.pw-c form label{display:flex;flex-direction:column}
.pw-c .pw-fav-star{background:transparent;color:#9a6800;border:0;padding:4px 10px;margin-left:8px;font-size:26px;min-height:40px;vertical-align:middle}.pw-c .pw-fav-star[aria-pressed=true]{color:#b87900}.pw-c .pw-fav-star:hover:not(:disabled){background:#fff4d1;color:#b87900}
</style>

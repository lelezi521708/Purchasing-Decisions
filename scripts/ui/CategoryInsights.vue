<template>
  <section class="pw-b-insights" v-if="report">
    <header class="pw-b-header">
      <p class="pw-b-eyebrow">PRICEWATCH ANALYTICS</p>
      <h1>Category Insights</h1>
      <p class="pw-b-subtitle">Compare like-for-like product prices and review simple multi-buy offers.</p>
    </header>
    <div v-if="report.requestedProductCode && report.selectedProduct" class="pw-b-product-context">
      <strong>Selected product: {{selectedProductName}}</strong>
      <span>{{report.selectedProduct.productCode}}</span>
      <p>The results below compare products in this product's category, not only the selected product.</p>
    </div>
    <p v-else-if="report.requestedProductCode" class="pw-b-warning">Product {{report.requestedProductCode}} was not found in the latest successful batch. No unrelated category has been selected.</p>
    <h2>Category advantage comparison</h2>
    <p class="pw-b-meta">Category: <strong>{{ report.category }}</strong> · Latest successful batch: {{
      formatDate(report.collectedAt) }}</p>
    <div class="pw-b-controls">
      <label>Category level 2<select v-model="category2"><option value="">All level-2 categories</option><option v-for="x in category2Options" :key="x.value" :value="x.value">{{x.label}}</option></select></label>
      <label>Category level 3<select v-model="category3"><option value="">All level-3 categories</option><option v-for="x in category3Options" :key="x.value" :value="x.value">{{x.label}}</option></select></label>
      <label>Merchant A<select v-model="merchantA"><option v-for="x in merchantOptions" :key="x" :value="x" :disabled="x===merchantB">{{x}}</option></select></label>
      <label>Merchant B<select v-model="merchantB"><option v-for="x in merchantOptions" :key="x" :value="x" :disabled="x===merchantA">{{x}}</option></select></label>
    </div>
    <p class="pw-b-note">Comparing <strong>{{summary.common}}</strong> products with valid prices from both merchants. Ties are shown separately; missing prices are not treated as zero.</p>
    <details class="pw-b-method">
      <summary>Comparison method</summary>
      <p>Products are matched by the same product code. All percentages use the current common valid-price sample as the denominator. Results describe this sample only, not either merchant's entire store.</p>
    </details>
    <p v-if="summary.common===0" class="pw-b-warning">No common valid-price products for this selection. Choose another
      category or merchant pair.</p>
    <p v-else-if="summary.common<10" class="pw-b-warning">Small comparison sample ({{summary.common}} products).
      Interpret the percentages cautiously.</p>
    <div class="pw-b-cards">
      <div>
        <span class="pw-b-logo-line"><img v-if="showLogo(merchantA)" :src="logoUrl(merchantA)" :alt="merchantA+' logo'" @error="logoError(merchantA)"><strong>{{merchantA}}</strong></span><span>Lower on {{summary.aLower}} products</span><b>{{pct(summary.aLower)}}</b>
      </div>
      <div><strong>Tie</strong><span>{{summary.tie}} products</span><b>{{pct(summary.tie)}}</b></div>
      <div>
        <span class="pw-b-logo-line"><img v-if="showLogo(merchantB)" :src="logoUrl(merchantB)" :alt="merchantB+' logo'" @error="logoError(merchantB)"><strong>{{merchantB}}</strong></span><span>Lower on {{summary.bLower}} products</span><b>{{pct(summary.bLower)}}</b>
      </div>
    </div>
    <h3>Price-difference distribution</h3>
    <div class="pw-b-table-wrap">
      <table class="pw-b-small">
        <thead>
          <tr>
            <th>Absolute difference</th>
            <th>Products</th>
            <th>Share of common sample</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in distribution" :key="b.label">
            <td>{{b.label}}</td>
            <td>{{b.count}}</td>
            <td>{{summary.common ? (b.count/summary.common*100).toFixed(1)+'%' : 'N/A'}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <h3>Common product details</h3>
    <p class="pw-b-muted">Savings percentage = absolute price gap ÷ higher listed price. Use the minimum-gap filter to
      focus on meaningful savings.</p>
    <p v-if="favoriteError" class="pw-b-warning" role="alert">{{favoriteError}}</p>
    <div class="pw-b-filter">
      <input v-model.trim="search" placeholder="Filter product name or code"/><select v-model="resultFilter"><option value="all">All results</option><option value="a">Merchant A lower</option><option value="tie">Same price</option><option value="b">Merchant B lower</option></select><select v-model="sortMode"><option value="gapHkd">Largest HKD gap</option><option value="gapPct">Largest savings %</option><option value="code">Product code</option></select><label>Minimum gap (HKD)<input v-model.number="minGap" type="number" min="0" step="0.1"></label>
    </div>
    <div class="pw-b-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>
              <span class="pw-b-logo-line"><img v-if="showLogo(merchantA)" :src="logoUrl(merchantA)" :alt="merchantA+' logo'" @error="logoError(merchantA)">{{merchantA}}</span>
            </th>
            <th>
              <span class="pw-b-logo-line"><img v-if="showLogo(merchantB)" :src="logoUrl(merchantB)" :alt="merchantB+' logo'" @error="logoError(merchantB)">{{merchantB}}</span>
            </th>
            <th>Difference (A - B)</th>
            <th>Savings vs higher price</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in detailRows" :key="p.productCode" :class="{'pw-best-saving': isBestSaving(p)}">
            <td><div class="pw-b-product-cell"><div><strong>{{p.productCode}}</strong><br>{{p.name}}</div><button type="button" class="pw-b-fav-star" :disabled="!favoriteReady" :aria-pressed="isFavorite(p.productCode)" :aria-label="(isFavorite(p.productCode) ? 'Remove from favorites: ' : 'Save to favorites: ') + (p.name || p.productCode)" @click="toggleFavorite(p)">{{isFavorite(p.productCode) ? '★' : '☆'}}</button></div></td>
            <td>{{money(p.priceA)}}</td>
            <td>{{money(p.priceB)}}</td>
            <td>{{signedMoney(p.diff)}}</td>
            <td>{{p.gapPct.toFixed(1)}}% <span v-if="isBestSaving(p)" class="pw-best-badge">Largest savings %</span></td>
            <td>{{p.resultLabel}}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="comparisons.length>200" class="pw-b-muted">Showing the first 200 matching products. Use the filters to
        narrow the list.</p>
    </div>
    <h3>Simple multi-buy offers</h3>
    <label class="pw-b-quantity">Quantity to buy <input v-model.number="quantity" type="number" min="1" max="99" step="1" /></label>
    <p v-if="quantityError" class="pw-b-warning">{{quantityError}}</p>
    <p class="pw-b-note">Single-unit prices and quantity promotions are shown separately. A promotion is calculated only
      at its exact stated threshold. For quantities above the threshold, repeated use and remainder pricing are not
      assumed unless the original rule states them.</p>
    <div class="pw-b-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Merchant</th>
            <th>Product</th>
            <th>Original unit</th>
            <th>Original offer text</th>
            <th>Applicable quantity</th>
            <th>Status</th>
            <th>Total</th>
            <th>Average unit</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in offerRows" :key="o.merchantCode+o.productCode+o.rule">
            <td>
              <span class="pw-b-logo-line"><img v-if="showLogo(o.merchantCode)" :src="logoUrl(o.merchantCode)" :alt="o.merchantCode+' logo'" @error="logoError(o.merchantCode)">{{o.merchantCode}}</span>
            </td>
            <td>{{o.productName}}</td>
            <td>{{money(o.originalUnitPrice)}}</td>
            <td>{{o.rule}}</td>
            <td>{{o.buyN || 'Not reliably parsed'}}</td>
            <td>{{o.status}}</td>
            <td>{{money(o.calculatedTotal)}}</td>
            <td>{{money(o.averageUnit)}}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!offerRows.length" class="pw-b-muted">No offer records for the selected merchants and filters.</p>
    </div>
  </section>
  <p v-else class="pw-b-muted">Loading category data...</p>
</template>
<script>
  export default {
 data(){return{merchantA:'PARKNSHOP',merchantB:'WELLCOME',category2:'',category3:'',quantity:2,search:'',resultFilter:'all',sortMode:'gapHkd',minGap:0,failedLogos:{},urlProductCode:'',urlCheckTimer:null,favoriteReady:false,favoriteCodes:[],favoriteError:''}},
 mounted(){
  window.addEventListener('pricewatch:favorites-changed',this.syncFavorites);
  window.addEventListener('storage',this.syncFavorites);
  this.syncFavorites();
  const readCode=()=>String(new URLSearchParams(window.location.search).get('productCode')||'').trim();
  const sendCurrent=()=>{const code=readCode();this.urlProductCode=code;if(code)this.send({payload:{productCode:code}});else{const category=this.currentCategory();if(category)this.send({payload:{value:category}})}};
  window.setTimeout(sendCurrent,0);
  this.urlCheckTimer=window.setInterval(()=>{const code=readCode();if(code===this.urlProductCode)return;this.urlProductCode=code;if(code)this.send({payload:{productCode:code}});else{const category=this.currentCategory();if(category)this.send({payload:{value:category}})}},250);
 },
 unmounted(){if(this.urlCheckTimer)window.clearInterval(this.urlCheckTimer);window.removeEventListener('pricewatch:favorites-changed',this.syncFavorites);window.removeEventListener('storage',this.syncFavorites)},
 computed:{
  report(){return this.msg?.payload?.[0]||null}, merchantOptions(){return this.report?.merchantCodes||[]},
  selectedProductName(){const p=this.report?.selectedProduct;if(!p)return'';return String(p.nameEn||p.name||p.productCode||'').trim()},
  quantityError(){const q=Number(this.quantity);return Number.isInteger(q)&&q>=1&&q<=99?'':'Enter a whole-number quantity from 1 to 99. Totals are not calculated for an invalid quantity.'},
  category2Options(){const m=new Map();(this.report?.products||[]).forEach(p=>{if(p.category2)m.set(p.category2,p.category2Label||p.category2)});return [...m].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label))},
  category3Options(){const m=new Map();(this.report?.products||[]).filter(p=>!this.category2||p.category2===this.category2).forEach(p=>{if(p.category3)m.set(p.category3,p.category3Label||p.category3)});return [...m].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label))},
  filteredProducts(){return (this.report?.products||[]).filter(p=>(!this.category2||p.category2===this.category2)&&(!this.category3||p.category3===this.category3))},
  comparisons(){return this.filteredProducts.flatMap(p=>{const a=p.prices[this.merchantA],b=p.prices[this.merchantB];if(a==null||b==null)return[];const ca=Math.round(a*100),cb=Math.round(b*100),diff=(ca-cb)/100,absDiff=Math.abs(diff),gapPct=Math.max(a,b)>0?absDiff/Math.max(a,b)*100:0,result=ca<cb?'a':ca>cb?'b':'tie';return[{...p,priceA:a,priceB:b,diff,absDiff,gapPct,result,resultLabel:result==='a'?this.merchantA+' lower':result==='b'?this.merchantB+' lower':'Same price'}]})},
  summary(){const x={common:this.comparisons.length,aLower:0,bLower:0,tie:0};this.comparisons.forEach(p=>p.result==='a'?x.aLower++:p.result==='b'?x.bLower++:x.tie++);return x},
  distribution(){const bins=[{label:'Same price',min:0,max:0,count:0},{label:'HKD 0.01–0.99',min:.01,max:.99,count:0},{label:'HKD 1.00–4.99',min:1,max:4.99,count:0},{label:'HKD 5.00–9.99',min:5,max:9.99,count:0},{label:'HKD 10.00 or more',min:10,max:Infinity,count:0}];this.comparisons.forEach(p=>{const d=Math.abs(p.diff);const b=bins.find(x=>d>=x.min&&d<=x.max);if(b)b.count++});return bins},
  detailRows(){const q=this.search.toLowerCase(),min=Math.max(0,Number(this.minGap)||0);const rows=this.comparisons.filter(p=>(this.resultFilter==='all'||p.result===this.resultFilter)&&p.absDiff>=min&&(!q||p.productCode.toLowerCase().includes(q)||p.name.toLowerCase().includes(q)));rows.sort((a,b)=>this.sortMode==='gapPct'?b.gapPct-a.gapPct||b.absDiff-a.absDiff:this.sortMode==='code'?a.productCode.localeCompare(b.productCode):b.absDiff-a.absDiff||b.gapPct-a.gapPct);return rows.slice(0,200)},
  offerRows(){const q=Number(this.quantity);return (this.report?.offers||[]).filter(o=>(o.merchantCode===this.merchantA||o.merchantCode===this.merchantB)&&(!this.category2||o.category2===this.category2)&&(!this.category3||o.category3===this.category3)).slice(0,100).map(o=>{if(this.quantityError)return{...o,status:'Invalid quantity',calculatedTotal:null,averageUnit:null};if(!o.supported)return{...o,status:'Needs offer terms',calculatedTotal:null,averageUnit:null};if(q<o.buyN){const t=q*o.originalUnitPrice;return{...o,status:'Offer not triggered',calculatedTotal:t,averageUnit:o.originalUnitPrice}}if(q===o.buyN)return{...o,status:'Offer applied',calculatedTotal:o.offerTotal,averageUnit:o.offerTotal/q};return{...o,status:'Needs repeat/remainder terms',calculatedTotal:null,averageUnit:null}})}
 },
 watch:{category2(){this.category3=''},merchantA(v){if(v&&v===this.merchantB)this.merchantB=this.merchantOptions.find(x=>x!==v)||''},merchantB(v){if(v&&v===this.merchantA)this.merchantA=this.merchantOptions.find(x=>x!==v)||''},report:{immediate:true,handler(r){if(!r)return;if(r.category){try{window.localStorage.setItem('pricewatch-b-category',String(r.category))}catch(e){}}const m=r.merchantCodes||[];if(!m.includes(this.merchantA))this.merchantA=m[0]||'';if(!m.includes(this.merchantB)||this.merchantB===this.merchantA)this.merchantB=m.find(x=>x!==this.merchantA)||'';this.category2='';this.category3=''}}},
 methods:{
 syncFavorites(){this.favoriteReady=Boolean(window.PriceWatchFavorites);if(!this.favoriteReady)return;try{this.favoriteCodes=window.PriceWatchFavorites.list().map(item=>String(item?.productCode||'').trim().toUpperCase()).filter(Boolean);this.favoriteError=''}catch(error){this.favoriteReady=false;this.favoriteError='Favorites could not be read. Check browser storage and retry.'}},
 isFavorite(code){return this.favoriteCodes.includes(String(code||'').trim().toUpperCase())},
 toggleFavorite(product){if(!this.favoriteReady||!product?.productCode)return;try{window.PriceWatchFavorites.toggle({productCode:product.productCode,name:product.name||product.nameEn||product.productCode});this.syncFavorites()}catch(error){this.favoriteError='Could not save favorites. Your previous selection has been kept.'}},
 isBestSaving(p){const rows=this.detailRows;return p.gapPct>0 && rows.length>0 && Math.abs(p.gapPct-Math.max(...rows.map(x=>x.gapPct)))<0.000001},
currentCategory(){if(this.report?.category)return String(this.report.category);try{const saved=window.localStorage.getItem('pricewatch-b-category');if(saved)return saved}catch(e){}const label=String(document.querySelector('input[role="combobox"]')?.value||'').trim();const categories=['奶類及乳製品 / 大豆製品 / 蛋類','米 / 食油 / 罐頭 / 蔬果 / 肉類','粉麵 / 煮食用料 / 冷凍加工食品','麵包蛋糕 / 穀類早餐 / 麵包醬','家居用品 / 寵物食品及用品','奶粉 / 嬰兒用品','糖果 / 餅乾 / 小食','個人護理','酒類','飲品'];return categories.find(x=>label===x||label.startsWith(x+' /'))||''},logoUrl(code){return '/pricewatch-assets/merchants/'+encodeURIComponent(code)+'.png'},showLogo(code){return code&&!this.failedLogos[code]},logoError(code){this.failedLogos[code]=true},money(v){return v==null?'Not calculated':'HKD '+Number(v).toFixed(2)},signedMoney(v){return (v>0?'+':'')+'HKD '+Number(v).toFixed(2)},pct(n){return this.summary.common?(n/this.summary.common*100).toFixed(1)+'%':'N/A'},formatDate(v){return v?new Date(v).toLocaleString('en-HK',{dateStyle:'medium',timeStyle:'short'}):'Unknown'}}
}
</script>
<style>
  .pw-b-insights {
    padding: 16px;
    color: #334257
  }

  .pw-b-header {
    margin: 0 0 18px
  }

  .pw-b-eyebrow {
    margin: 0 0 3px;
    color: #386d83;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em
  }

  .pw-b-insights h1 {
    margin: 0;
    color: #26384a;
    font-size: 30px;
    line-height: 1.25
  }

  .pw-b-subtitle {
    margin: 5px 0 0;
    color: #627587
  }

  .pw-b-product-context {
    margin: 0 0 16px;
    padding: 12px 14px;
    background: #f0f7fa;
    border: 1px solid #cfe0e8;
    border-radius: 6px
  }

  .pw-b-product-context>strong,
  .pw-b-product-context>span {
    display: block
  }

  .pw-b-product-context>span {
    margin-top: 2px;
    color: #386d83;
    font-variant-numeric: tabular-nums
  }

  .pw-b-product-context>p {
    margin: 6px 0 0;
    color: #486373
  }

  .pw-b-insights h2 {
    margin: 0 0 10px;
    font-size: 24px
  }

  .pw-b-insights h3 {
    margin: 24px 0 10px;
    font-size: 20px
  }

  .pw-b-meta,
  .pw-b-muted {
    color: #687887
  }

  .pw-b-note {
    padding: 10px 12px;
    background: #eaf3f7;
    border-left: 3px solid #386d83
  }

  .pw-b-warning {
    padding: 10px 12px;
    background: #fff5dc;
    border-left: 3px solid #d49524;
    color: #6f521b
  }

  .pw-b-method {
    margin: -3px 0 12px;
    color: #627587;
    font-size: 12px
  }

  .pw-b-method summary {
    cursor: pointer;
    color: #386d83;
    font-weight: 600
  }

  .pw-b-method p {
    margin: 6px 0 0
  }

  .pw-b-controls {
    display: grid;
    grid-template-columns: repeat(4, minmax(150px, 1fr));
    gap: 10px
  }

  .pw-b-controls label {
    display: flex;
    flex-direction: column;
    gap: 5px
  }

  .pw-b-controls select,
  .pw-b-filter input,
  .pw-b-filter select,
  .pw-b-filter label input {
    padding: 9px;
    border: 1px solid #dae2e8;
    border-radius: 4px;
    background: #fff
  }

  .pw-b-logo-line img {
    width: 80px;
    height: 28px;
    object-fit: contain;
    object-position: left center
  }

  .pw-b-logo-line {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 28px
  }

  .pw-b-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 12px 0
  }

  .pw-b-cards div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px;
    background: #fff;
    border: 1px solid #dae2e8;
    border-radius: 4px
  }

  .pw-b-cards b {
    font-size: 22px;
    color: #286b80
  }

  .pw-b-table-wrap {
    overflow-x: auto
  }

  .pw-b-insights table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    background: #fff
  }

  .pw-b-insights th,
  .pw-b-insights td {
    text-align: left;
    padding: 9px;
    border-bottom: 1px solid #e1e7eb;
    vertical-align: top
  }

  .pw-b-insights th {
    background: #eef3f6;
    white-space: nowrap
  }

  .pw-b-small {
    max-width: 650px;
    min-width: 500px
  }

  .pw-b-filter {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(150px, auto)) minmax(150px, auto);
    gap: 8px;
    margin-bottom: 8px;
    align-items: end
  }

  .pw-b-filter label {
    display: flex;
    flex-direction: column;
    gap: 3px
  }

  .pw-b-quantity {
    display: inline-flex;
    align-items: center;
    gap: 8px
  }

  .pw-b-quantity input {
    width: 80px;
    padding: 8px;
    border: 1px solid #dae2e8;
    border-radius: 4px
  }

  @media(max-width:760px) {

    .pw-b-controls {
      grid-template-columns: 1fr
    }

    .pw-b-cards {
      grid-template-columns: 1fr
    }

    .pw-b-filter {
      grid-template-columns: 1fr
    }
  }

/* Match A typography and theme; scoped to B only. */
.pw-b-insights{font-family:inherit;font-size:13px;line-height:1.6;color:#334257;padding:8px 12px 16px}
.pw-b-insights h1{font-size:30px;line-height:1.25;font-weight:750;color:#26384a}
.pw-b-insights h2{font-size:27px;line-height:1.4;font-weight:700;color:#26384a;margin:8px 0 14px}
.pw-b-insights h3{font-size:19px;line-height:1.4;font-weight:700;color:#26384a;margin:24px 0 10px}
.pw-b-insights .pw-b-meta,.pw-b-insights .pw-b-muted{font-size:12px;line-height:1.6;color:#627587}
.pw-b-insights label{font-size:12px;color:#486373}
.pw-b-insights input,.pw-b-insights select,.pw-b-insights button{font-family:inherit;font-size:13px;line-height:1.5;box-sizing:border-box}
.pw-b-insights input,.pw-b-insights select{min-height:40px;padding:8px 12px;border:1px solid #dae2e8;border-radius:6px;background:#fff;color:#334257;max-width:100%}
.pw-b-insights input:focus-visible,.pw-b-insights select:focus-visible,.pw-b-insights button:focus-visible{outline:2px solid #386d83;outline-offset:2px}
.pw-b-insights button{min-height:40px;padding:8px 16px;border:1px solid #386d83;border-radius:6px;background:#386d83;color:#fff;cursor:pointer}
.pw-b-insights button:hover{background:#2c586b}
.pw-b-insights button:disabled{background:#f5f7f9;color:#687887;border-color:#dae2e8;cursor:not-allowed}
.pw-b-insights table{font-size:13px;color:#334257}
.pw-b-insights th{font-size:12px;font-weight:700;color:#334257;background:#f0f4f7}
.pw-b-insights th,.pw-b-insights td{padding:12px;border-bottom:1px solid #e3e9ee}
.pw-b-insights td{font-variant-numeric:tabular-nums}
.pw-b-insights .pw-b-note{font-size:12px;line-height:1.6;color:#486373;background:#eaf3f7;border-left:3px solid #386d83}
.pw-b-insights .pw-b-cards>div{border-color:#dae2e8;border-radius:6px}
.pw-b-insights .pw-b-cards b{font-size:32px;line-height:1.3;font-weight:750;color:#286b80;font-variant-numeric:tabular-nums}
@media(max-width:600px){.pw-b-insights h1{font-size:25px}.pw-b-insights h2{font-size:23px}.pw-b-insights .pw-b-cards b{font-size:28px}}

.pw-b-insights tr.pw-best-saving td{background:#fff7df;}
.pw-b-insights .pw-best-badge{display:inline-block;margin:6px 0 0 8px;padding:4px 8px;border-radius:5px;background:#f4d477;color:#654800;font-size:12px;font-weight:700;}
.pw-b-product-cell{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:190px}
.pw-b-product-cell>div{min-width:0;overflow-wrap:anywhere}
.pw-b-fav-star{flex:0 0 auto;border:0;border-radius:5px;background:transparent;color:#9a6800;font:700 25px/1 sans-serif;padding:5px 8px;min-width:38px;min-height:38px;cursor:pointer}
.pw-b-fav-star[aria-pressed=true]{color:#b87900}
.pw-b-fav-star:hover:not(:disabled){background:#fff4d1;color:#b87900}
.pw-b-fav-star:focus-visible{outline:2px solid #386d83;outline-offset:2px}
.pw-b-fav-star:disabled{opacity:.45;cursor:wait}
</style>


<template>
<div class="pw-favorites-global">
<button ref="favoritesTrigger" type="button" class="pw-favorites-trigger" :disabled="!ready" :aria-expanded="opened" @click="openList">★ Favorites <span v-if="items.length">({{items.length}})</span></button>
<div v-if="opened" class="pw-favorites-shade" @click.self="closeList">
<section ref="favoritesPanel" class="pw-favorites-panel" role="dialog" aria-modal="true" aria-labelledby="pw-favorites-title" tabindex="-1" @keydown="handleKey">
<header><h2 id="pw-favorites-title">Favorites</h2><button type="button" aria-label="Close favorites" @click="closeList">Close</button></header>
<p>Saved in this browser.</p><p role="alert" v-if="error">{{error}}</p>
<p v-if="!items.length &amp;&amp; !error">No favorites yet. Save a product using its star button.</p>
<ul><li v-for="item in items" :key="item.productCode"><div><strong>{{item.name || item.productCode}}</strong><small>{{item.productCode}}</small></div><button type="button" :aria-label="'Remove '+(item.name || item.productCode)+' from favorites'" @click="removeItem(item.productCode)">Remove</button></li></ul>
</section></div>
<p class="pw-favorites-error" v-if="error &amp;&amp; !opened" role="alert">{{error}}</p>
</div>
</template>
<script>
export default {
    data() { return {ready:false, opened:false, items:[], error:''}; },
    methods: {
        refreshFavorites() {
            this.ready = Boolean(window.PriceWatchFavorites);
            if (!this.ready) return;
            try {
                this.items = window.PriceWatchFavorites.list();
                this.error = '';
            } catch (error) {
                this.error = 'Favorites could not be read. Check browser storage and retry.';
            }
        },
        openList() {
            this.refreshFavorites();
            this.opened = true;
            this.$nextTick(() => this.$refs.favoritesPanel?.focus());
        },
        closeList() {
            this.opened = false;
            this.$nextTick(() => this.$refs.favoritesTrigger?.focus());
        },
        removeItem(code) {
            try {
                window.PriceWatchFavorites.remove(code);
                this.refreshFavorites();
                this.$nextTick(() => this.$refs.favoritesPanel?.focus());
            } catch (error) {
                this.error = 'Could not remove this favorite. Your saved list has been kept.';
            }
        },
        handleKey(event) {
            if (event.key === 'Escape') { event.preventDefault(); this.closeList(); }
            if (event.key !== 'Tab') return;
            const focusable = [...this.$refs.favoritesPanel.querySelectorAll('button:not(:disabled),a[href]')];
            const first = focusable[0], last = focusable[focusable.length-1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === this.$refs.favoritesPanel)) {
                event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first?.focus();
            }
        }
    },
    mounted() {
        window.addEventListener('pricewatch:favorites-changed', this.refreshFavorites);
        window.addEventListener('storage', this.refreshFavorites);
        this.refreshFavorites();
    },
    unmounted() {
        window.removeEventListener('pricewatch:favorites-changed', this.refreshFavorites);
        window.removeEventListener('storage', this.refreshFavorites);
    }
};
</script>
<style>
.pw-favorites-trigger{position:fixed;right:14px;top:10px;z-index:2100;background:#fff;color:#334257;border:1px solid #dae2e8;border-radius:6px;padding:9px 12px;font:600 13px/1.5 sans-serif;cursor:pointer}
.pw-favorites-trigger:disabled{opacity:.6;cursor:wait}
.pw-favorites-shade{position:fixed;inset:0;z-index:2200;background:#17273680;display:flex;justify-content:flex-end}
.pw-favorites-panel{background:#fff;color:#334257;width:min(440px,100%);height:100%;padding:22px;overflow:auto;box-sizing:border-box;font:14px/1.6 sans-serif}
.pw-favorites-panel header{display:flex;justify-content:space-between;align-items:center;gap:16px}
.pw-favorites-panel h2{font-size:22px;margin:0}
.pw-favorites-panel ul{list-style:none;padding:0}
.pw-favorites-panel li{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 0;border-bottom:1px solid #dae2e8}
.pw-favorites-panel li div{min-width:0;overflow-wrap:anywhere}
.pw-favorites-panel small{display:block}
.pw-favorites-panel button{background:#f4f7f9;border:1px solid #cbd6dd;border-radius:5px;padding:8px 10px;color:#334257;cursor:pointer;flex-shrink:0}
.pw-favorites-global button:focus-visible,.pw-favorites-panel:focus-visible{outline:2px solid #386d83;outline-offset:3px}
.pw-favorites-error{position:fixed;right:10px;top:60px;max-width:300px;background:#fff3e0;color:#7b3d00;padding:10px;z-index:2101}
</style>

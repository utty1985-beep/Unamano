const parts = ["app.part01.txt", "app.part02.txt", "app.part03.txt", "app.part04.txt", "app.part05.txt", "app.part06.txt", "app.part07.txt", "app.part08.txt"];
const base = new URL('./parts/', location.href);

function showBootError(message) {
  console.error('CacciaTraccia boot error:', message);
  let box = document.getElementById('bootError');
  if (!box) {
    box = document.createElement('div');
    box.id = 'bootError';
    box.style.cssText = 'position:fixed;left:12px;right:12px;top:86px;z-index:99999;background:#fff1f0;color:#8b1e16;border:2px solid #c73a30;border-radius:14px;padding:14px;font:600 14px/1.4 system-ui;box-shadow:0 6px 28px #0002';
    document.body.appendChild(box);
  }
  box.textContent = 'Errore avvio CacciaTraccia: ' + message;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { s.remove(); reject(new Error('non raggiungibile: ' + src)); };
    document.head.appendChild(s);
  });
}

function ensureLeafletCss() {
  if (document.getElementById('leafletCssCT')) return;
  const link = document.createElement('link');
  link.id = 'leafletCssCT';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  link.onerror = () => {
    link.onerror = null;
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  };
  document.head.appendChild(link);
}

async function ensureLeaflet() {
  if (window.L?.map) return;
  const sources = [
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  ];
  const errors = [];
  for (const src of sources) {
    try {
      await loadScript(src);
      if (window.L?.map) return;
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error('Leaflet non caricato. ' + errors.join(' | '));
}

function mapLibreLeafletShim() {
  const L = window.L;

  class NavigationControl {
    constructor(options = {}) { this.options = options; }
  }

  class MapShim {
    constructor(options = {}) {
      this.container = typeof options.container === 'string' ? document.getElementById(options.container) : options.container;
      this._events = new Map();
      this._sources = new Map();
      this._layers = new Map();
      this._bearing = 0;
      this._style = options.style || null;
      this._base = null;
      this._leaflet = L.map(this.container, { zoomControl: true, attributionControl: true }).setView(
        [options.center?.[1] ?? 41.46, options.center?.[0] ?? 15.55],
        options.zoom ?? 8
      );
      this._leaflet.on('click', e => this._emit('click', { lngLat: { lng: e.latlng.lng, lat: e.latlng.lat }, originalEvent: e.originalEvent }));
      this._applyStyle(this._style, false);
      setTimeout(() => {
        this._emit('style.load', {});
        this._emit('load', {});
        this._leaflet.invalidateSize();
      }, 0);
    }
    _emit(type, payload) {
      const set = this._events.get(type);
      if (set) for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error(e); } }
    }
    on(type, fn) {
      if (!this._events.has(type)) this._events.set(type, new Set());
      this._events.get(type).add(fn);
      return this;
    }
    off(type, fn) { this._events.get(type)?.delete(fn); return this; }
    addControl() { return this; }
    isStyleLoaded() { return true; }
    getZoom() { return this._leaflet.getZoom(); }
    getBearing() { return this._bearing || 0; }
    easeTo(opts = {}) {
      if (Number.isFinite(opts.bearing)) this._bearing = opts.bearing;
      if (opts.center) {
        const z = Number.isFinite(opts.zoom) ? opts.zoom : this._leaflet.getZoom();
        this._leaflet.setView([opts.center[1], opts.center[0]], z, { animate: true });
      } else if (Number.isFinite(opts.zoom)) {
        this._leaflet.setZoom(opts.zoom);
      }
      return this;
    }
    flyTo(opts = {}) { return this.easeTo(opts); }
    fitBounds(bounds, opts = {}) {
      if (!Array.isArray(bounds) || bounds.length < 2) return this;
      const sw = bounds[0], ne = bounds[1];
      const leafletBounds = L.latLngBounds([sw[1], sw[0]], [ne[1], ne[0]]);
      const pad = typeof opts.padding === 'number' ? [opts.padding, opts.padding] : (opts.padding || [30, 30]);
      this._leaflet.fitBounds(leafletBounds, { padding: pad, maxZoom: opts.maxZoom });
      return this;
    }
    _styleTileUrl(style) {
      try {
        const sources = style?.sources || {};
        for (const source of Object.values(sources)) {
          if (source?.type === 'raster' && Array.isArray(source.tiles) && source.tiles[0]) return source.tiles[0];
        }
      } catch {}
      return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
    _styleAttribution(style) {
      try {
        for (const source of Object.values(style?.sources || {})) if (source?.attribution) return source.attribution;
      } catch {}
      return '© OpenStreetMap contributors';
    }
    _applyStyle(style, emit = true) {
      this._style = style;
      if (this._base) this._leaflet.removeLayer(this._base);
      const url = this._styleTileUrl(style);
      this._base = L.tileLayer(url, { maxZoom: 19, attribution: this._styleAttribution(style) }).addTo(this._leaflet);
      if (emit) setTimeout(() => this._emit('style.load', {}), 0);
    }
    setStyle(style) { this._applyStyle(style, true); return this; }
    addSource(id, source) { this._sources.set(id, source); return this; }
    getSource(id) { return this._sources.get(id) || null; }
    removeSource(id) { this._sources.delete(id); return this; }
    addLayer(layer) {
      const source = this._sources.get(layer.source);
      if (layer?.type === 'line' && source?.data?.geometry?.type === 'LineString') {
        const latlngs = source.data.geometry.coordinates.map(c => [c[1], c[0]]);
        const paint = layer.paint || {};
        const dash = paint['line-dasharray'];
        const poly = L.polyline(latlngs, {
          color: paint['line-color'] || '#173f2b',
          weight: paint['line-width'] || 4,
          opacity: paint['line-opacity'] ?? 1,
          dashArray: Array.isArray(dash) ? dash.map(n => n * 4).join(' ') : undefined
        }).addTo(this._leaflet);
        this._layers.set(layer.id, poly);
      }
      return this;
    }
    getLayer(id) { return this._layers.get(id) || null; }
    removeLayer(id) {
      const layer = this._layers.get(id);
      if (layer) this._leaflet.removeLayer(layer);
      this._layers.delete(id);
      return this;
    }
  }

  class MarkerShim {
    constructor(options = {}) {
      this.options = options;
      this.element = options.element || document.createElement('div');
      this._lngLat = [0, 0];
      this._marker = null;
      this._map = null;
      this._events = new Map();
    }
    setLngLat(v) {
      this._lngLat = [Number(v[0]), Number(v[1])];
      if (this._marker) this._marker.setLatLng([this._lngLat[1], this._lngLat[0]]);
      return this;
    }
    addTo(mapShim) {
      this._map = mapShim;
      const icon = L.divIcon({ className: 'ct-leaflet-marker', html: '', iconSize: null });
      this._marker = L.marker([this._lngLat[1], this._lngLat[0]], { icon, draggable: !!this.options.draggable, keyboard: false }).addTo(mapShim._leaflet);
      const host = this._marker.getElement();
      if (host && this.element && !host.contains(this.element)) host.appendChild(this.element);
      this._marker.on('dragend', e => this._emit('dragend', e));
      return this;
    }
    _emit(type, e) { for (const fn of this._events.get(type) || []) { try { fn(e); } catch (err) { console.error(err); } } }
    on(type, fn) {
      if (!this._events.has(type)) this._events.set(type, new Set());
      this._events.get(type).add(fn);
      return this;
    }
    getLngLat() {
      if (this._marker) { const ll = this._marker.getLatLng(); return { lng: ll.lng, lat: ll.lat }; }
      return { lng: this._lngLat[0], lat: this._lngLat[1] };
    }
    getElement() { return this.element; }
    remove() { if (this._marker && this._map) this._map._leaflet.removeLayer(this._marker); this._marker = null; return this; }
  }

  return { Map: MapShim, Marker: MarkerShim, NavigationControl };
}

try {
  ensureLeafletCss();
  await ensureLeaflet();
  window.maplibregl = mapLibreLeafletShim();

  const texts = await Promise.all(parts.map(async name => {
    const url = new URL(name, base);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Impossibile caricare ${name}: ${r.status}`);
    return r.text();
  }));

  let src = texts.join('');
  src = src.replace(/^\s*import\s+\*\s+as\s+maplibregl\s+from\s+['"][^'"]+['"];?\s*/, '');

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = `${src}\n//# sourceURL=cacciatraccia-app.js`;
  document.body.appendChild(script);
} catch (err) {
  showBootError(err?.message || String(err));
}

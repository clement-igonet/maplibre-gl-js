// Side-by-side comparison of two MapLibre builds with synced cameras and switchable scenes.
// Each scene: {label, note, style, camera, onStyle(map), readout(map, pane)}.

export function setupCompare({mainLib, prLib, scenes, initial}) {
    const buttons = document.getElementById('scenes');
    const note = document.getElementById('note');
    let maps = [];

    function build(key) {
        for (const m of maps) m.remove();
        const s = scenes[key];
        note.textContent = s.note;
        for (const b of buttons.children) b.classList.toggle('on', b.dataset.key === key);
        maps = [mainLib, prLib].map((lib, i) => {
            const map = new lib.Map({
                container: i === 0 ? 'map-a' : 'map-b',
                style: typeof s.style === 'function' ? s.style() : s.style,
                ...s.camera,
                maxPitch: 85,
                fadeDuration: 0,
                canvasContextAttributes: {antialias: true},
                attributionControl: s.attributionControl ?? {compact: true}
            });
            if (s.onStyle) map.on('style.load', () => s.onStyle(map));
            if (s.readout) map.on('idle', () => {
                document.getElementById(i === 0 ? 'readout-a' : 'readout-b').textContent = s.readout(map, i);
            });
            return map;
        });
        let syncing = false;
        maps.forEach((m, i) => m.on('move', () => {
            if (syncing) return;
            syncing = true;
            const o = maps[1 - i];
            o.jumpTo({center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch()});
            syncing = false;
        }));
        for (const r of ['readout-a', 'readout-b']) document.getElementById(r).textContent = '';
        const url = new URL(location.href);
        url.searchParams.set('scene', key);
        history.replaceState(null, '', url);
        window.__maps = maps;
    }

    for (const [key, s] of Object.entries(scenes)) {
        const b = document.createElement('button');
        b.textContent = s.label;
        b.dataset.key = key;
        b.addEventListener('click', () => build(key));
        buttons.appendChild(b);
    }
    const requested = new URLSearchParams(location.search).get('scene');
    build(scenes[requested] ? requested : initial);
}

/* Perspective 3D spatial workspace for NWIS Industrial Drilling Intelligence.
   Renders well trajectories, current drill bit, casing strings, formation layers,
   historical incidents, and future predicted risk zones along trajectory.
*/
(function(root){
  let dispose = () => {};
  const camera = { x: -0.58, y: 0, z: 0.42, zoom: 1.05, panX: 0, panY: 0, scale: 1.8 };
  let selected = null;
  let showEvidence = true;
  let showGrid = true;
  let showFormations = true;
  let showRiskZones = true;
  let showOffsets = true;

  function mountScene(host, opts = {}) {
    if (!host) return;
    const isStandalone = !!opts.standalone;
    host.innerHTML = `
      <div class="scene-toolbar">
        <div>
          <span class="scene-tag">3D SPATIAL WORKSPACE · ${isStandalone ? 'FULL VIEW' : 'EMBEDDED'}</span>
          <h2 style="font-size:16px;margin:3px 0 1px;font-weight:700;letter-spacing:-0.02em;">Subsurface Trajectory & Risk Horizons</h2>
          <p style="font-size:11px;color:#94a3b8;margin:0;">Interactive 3D model: drill bit position, casing shoes, formation strata, offset wells, and upcoming hazard zones</p>
        </div>
        <div class="scene-actions">
          <button data-preset="orbit" class="btn-scene active">Perspective</button>
          <button data-preset="top" class="btn-scene">Top (XY)</button>
          <button data-preset="front" class="btn-scene">Front (XZ)</button>
          <button data-preset="side" class="btn-scene">Side (YZ)</button>
          <button data-preset="reset" class="btn-scene" aria-label="Reset camera">Reset</button>
          ${!isStandalone ? '<button id="btn-toggle-2d" class="btn-scene">2D Map</button>' : ''}
        </div>
      </div>
      <div class="scene-stage" style="height:${isStandalone ? 'calc(100vh - 280px)' : '460px'};min-height:380px;position:relative;">
        <canvas tabindex="0" aria-label="Interactive 3D subsurface workspace: drag to orbit, Shift-drag to pan, scroll to zoom." style="width:100%;height:100%;display:block;cursor:grab;"></canvas>
        <div class="scene-corner">
          <span class="scene-dot"></span> <b>ACTIVE: A-17 (1,842.4 m)</b> · Upper Shale<br>
          <small>Study radius: 10 km · MD Depth Scale: ${camera.scale.toFixed(1)}×</small>
        </div>
        <div class="scene-hint">Drag to orbit · Shift + drag to pan · Scroll to zoom · Click markers for alert explanation</div>
        <div class="scene-key">
          <span style="color:#22d3ee">● Active Bit (1,842 m)</span>
          <span style="color:#a5b4fc">● Offset Wells</span>
          <span style="color:#f59e0b">● Historical Incidents</span>
          <span style="color:#ef4444">● Predicted Risk Zones</span>
          <span style="color:#38bdf8">▬ Casing Shoe (1,650 m)</span>
        </div>
      </div>
      <div class="scene-controls">
        <label>Rotate X<input data-axis="x" type="range" min="-180" max="180" step="1"></label>
        <label>Rotate Y<input data-axis="y" type="range" min="-180" max="180" step="1"></label>
        <label>Rotate Z<input data-axis="z" type="range" min="-180" max="180" step="1"></label>
        <label>Depth Scale <output id="scale-value">${camera.scale.toFixed(1)}×</output><input id="depth-scale" type="range" min="0.5" max="4" step="0.1" value="${camera.scale}"></label>
        <label class="scene-check"><input id="show-formations" type="checkbox" ${showFormations ? 'checked' : ''}>Strata</label>
        <label class="scene-check"><input id="show-risk-zones" type="checkbox" ${showRiskZones ? 'checked' : ''}>Risk Zones</label>
        <label class="scene-check"><input id="show-incidents" type="checkbox" ${showEvidence ? 'checked' : ''}>Incidents</label>
        <label class="scene-check"><input id="show-offsets" type="checkbox" ${showOffsets ? 'checked' : ''}>Offsets</label>
        <label class="scene-check"><input id="show-grid" type="checkbox" ${showGrid ? 'checked' : ''}>Grid</label>
        <button id="scene-save" class="btn-scene" title="Download snapshot image">Export PNG</button>
      </div>
      <div class="scene-inspector" aria-live="polite"></div>
    `;

    const canvas = host.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      host.innerHTML = '<p class="notice error">Canvas 2D context unavailable in this browser.</p>';
      return;
    }

    let width = 800, height = 500, hit = [], drag = null, frame = 0;
    const stateRef = window.appState || NWIS.seed();
    const activeWell = stateRef.wells?.find(w => w.id === (stateRef.active || 'A-17')) || stateRef.wells?.[0] || { id: 'A-17', lat: 27.5, lon: 71.5, depth: 1842.4 };
    const allWells = stateRef.wells || [activeWell];
    const visibleWells = allWells.filter(w => showOffsets || w.id === activeWell.id);
    const span = Math.max(stateRef.radius || 10, 1);
    selected = visibleWells.some(w => w.id === selected) ? selected : activeWell.id;

    const formationsList = (window.NWISData && window.NWISData.formations) ? window.NWISData.formations : [
      { name: 'Upper Sandstone', top: 0, bottom: 1450, color: '#475569' },
      { name: 'Upper Shale', top: 1450, bottom: 1750, color: '#334155' },
      { name: 'Jodhpur Sandstone', top: 1750, bottom: 1975, color: '#b45309' },
      { name: 'Lower Reactive Shale', top: 1975, bottom: 2250, color: '#991b1b' },
      { name: 'Basal Sandstone', top: 2250, bottom: 2600, color: '#78350f' }
    ];

    // Predicted risk zones along active well's future trajectory
    const riskZones = [
      { id: 'stuck', name: 'Stuck-Pipe Zone (72% Risk)', depth: 2040, span: 40, color: '#ef4444', desc: 'Lower Reactive Shale pack-off zone (+198 m ahead)' },
      { id: 'loss', name: 'Mud Loss Interval', depth: 1860, span: 25, color: '#f59e0b', desc: 'Permeable Sandstone Seepage (+18 m ahead)' },
      { id: 'pressure', name: 'Overpressure Alert Zone', depth: 1920, span: 30, color: '#f97316', desc: 'Gas influx analogue depth (+78 m ahead)' },
      { id: 'cement', name: 'Cementing Complication', depth: 2250, span: 35, color: '#8b5cf6', desc: 'Transition interval (+408 m ahead)' }
    ];

    function position(w, depth = 0) {
      const cosLat = Math.cos(activeWell.lat * Math.PI / 180);
      const eastKm = (w.lon - activeWell.lon) * 111.32 * cosLat;
      const northKm = (w.lat - activeWell.lat) * 111.32;
      return [
        (eastKm / span) * 2.2,
        (northKm / span) * 2.2,
        (-depth / 1000 / span) * 2.2 * camera.scale
      ];
    }

    function project(v) {
      let [x, y, z] = v;
      const maxD = Math.max(...allWells.map(w => w.depth || 0), activeWell.depth || 1842, 2800);
      const extent = (maxD / 1000 / span) * 2.2 * camera.scale;
      z += extent * 0.45;
      const fit = 2.4 / Math.max(2.4, extent * 0.5);
      x *= fit; y *= fit; z *= fit;

      // Z rotation
      let c = Math.cos(camera.z), s = Math.sin(camera.z);
      [x, y] = [x * c - y * s, x * s + y * c];
      // Y rotation
      c = Math.cos(camera.y); s = Math.sin(camera.y);
      [x, z] = [x * c + z * s, -x * s + z * c];
      // X rotation
      c = Math.cos(camera.x); s = Math.sin(camera.x);
      [y, z] = [y * c - z * s, y * s + z * c];

      const d = 8.5 - y;
      const fovScale = Math.min(width, height) * 1.35 * camera.zoom / Math.max(d, 0.5);
      return {
        x: width / 2 + x * fovScale + camera.panX,
        y: height * 0.48 - z * fovScale + camera.panY,
        d
      };
    }

    function line(v1, v2, color, size = 1, dash = []) {
      const p = project(v1), q = project(v2);
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function label(text, v, color = '#94a3b8', font = '10px ui-monospace, monospace') {
      const p = project(v);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(text, p.x + 7, p.y - 7);
    }

    function polygon(vs, color) {
      ctx.beginPath();
      vs.forEach((v, i) => {
        const p = project(v);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function draw() {
      frame = 0;
      ctx.clearRect(0, 0, width, height);

      // Deep graphite/navy operational radial gradient
      const bg = ctx.createRadialGradient(width * 0.48, height * 0.35, 0, width * 0.5, height * 0.5, width * 0.85);
      bg.addColorStop(0, '#0e1828');
      bg.addColorStop(0.7, '#080f1a');
      bg.addColorStop(1, '#050a12');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      hit = [];

      const bottomZ = (-Math.max(...allWells.map(w => w.depth || 0), 2800) / 1000 / span) * 2.2 * camera.scale;

      // Base bounding floor
      polygon([[-2.2, -2.2, bottomZ], [2.2, -2.2, bottomZ], [2.2, 2.2, bottomZ], [-2.2, 2.2, bottomZ]], '#0f172a55');

      // Formation Slices
      if (showFormations) {
        formationsList.forEach(f => {
          const topZ = (-f.top / 1000 / span) * 2.2 * camera.scale;
          if (topZ <= 0 && topZ >= bottomZ) {
            polygon([[-2.2, -2.2, topZ], [2.2, -2.2, topZ], [2.2, 2.2, topZ], [-2.2, 2.2, topZ]], f.color + '12');
            line([-2.2, -2.2, topZ], [2.2, -2.2, topZ], f.color + '44', 1, [2, 4]);
            label(`${f.name} (Top: ${f.top} m)`, [-2.15, -2.15, topZ], f.color + 'bb', '9px system-ui');
          }
        });
      }

      // Spatial Grid
      if (showGrid) {
        for (let i = -2.2; i <= 2.21; i += 0.55) {
          line([i, -2.2, 0], [i, 2.2, 0], '#1e293b66');
          line([-2.2, i, 0], [2.2, i, 0], '#1e293b66');
        }
        for (const x of [-2.2, 2.2]) {
          for (const y of [-2.2, 2.2]) {
            line([x, y, 0], [x, y, bottomZ], '#33415555', 1, [3, 5]);
          }
        }
      }

      // Active Depth Plane (1,842.4 m)
      const currentDepth = Number(activeWell.depth || 1842.4);
      const activeZ = (-currentDepth / 1000 / span) * 2.2 * camera.scale;
      polygon([[-2.2, -2.2, activeZ], [2.2, -2.2, activeZ], [2.2, 2.2, activeZ], [-2.2, 2.2, activeZ]], '#06b6d412');
      line([-2.2, -2.2, activeZ], [2.2, -2.2, activeZ], '#22d3ee88', 1.5, [4, 4]);
      label(`Current Bit Depth: ${currentDepth.toFixed(1)} m MD`, [-2.15, -2.15, activeZ], '#22d3ee', 'bold 11px system-ui');

      // Reference Axes
      line([-2.2, -2.2, 0], [2.6, -2.2, 0], '#f43f5e', 2);
      label('East (X)', [2.65, -2.2, 0], '#f43f5e');
      line([-2.2, -2.2, 0], [-2.2, 2.6, 0], '#10b981', 2);
      label('North (Y)', [-2.2, 2.65, 0], '#10b981');
      line([-2.2, -2.2, 0], [-2.2, -2.2, bottomZ - 0.3], '#38bdf8', 2);
      label('Depth (Z)', [-2.2, -2.2, bottomZ - 0.35], '#38bdf8');

      // Wells sorted by distance for painter's algorithm
      const wellsToDraw = [...visibleWells].sort((u, v) => project(position(v)).d - project(position(u)).d);

      wellsToDraw.forEach(w => {
        const isCurrent = w.id === activeWell.id;
        const top = position(w, 0);
        const base = position(w, w.depth || 2200);
        const p = project(top);
        const q = project(base);
        const color = isCurrent ? '#22d3ee' : '#818cf8';

        // Wellbore shaft
        line(top, base, color + '25', w.id === selected ? 18 : 10);
        line(top, base, color + '66', 5);
        line(top, base, color, 2);

        // Casing shoe section (e.g. 1650 m)
        const casingDepth = w.casing || (isCurrent ? 1650 : 1600);
        const casingPos = position(w, casingDepth);
        const casingProj = project(casingPos);
        line(top, casingPos, '#38bdf8', 3.5);
        line([casingPos[0] - 0.08, casingPos[1], casingPos[2]], [casingPos[0] + 0.08, casingPos[1], casingPos[2]], '#38bdf8', 2);
        label(`Shoe: ${casingDepth} m`, casingPos, '#38bdf8cc', '9px system-ui');

        // Wellhead marker
        ctx.shadowColor = color;
        ctx.shadowBlur = isCurrent ? 14 : 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isCurrent ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wellhead badge
        ctx.font = 'bold 11px system-ui';
        const tw = ctx.measureText(w.id).width;
        ctx.fillStyle = '#091322e6';
        ctx.strokeStyle = color + '66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(p.x - tw / 2 - 8, p.y - 28, tw + 16, 20, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(w.id, p.x - tw / 2, p.y - 14);

        // TD label
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${Math.round(w.depth)} m TD`, q.x + 8, q.y + 4);

        hit.push({ x: p.x, y: p.y, id: w.id, type: 'well' });

        // If active well, draw Drill Bit cone at active depth
        if (isCurrent) {
          const bitPos = position(w, currentDepth);
          const bitProj = project(bitPos);
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(bitProj.x, bitProj.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#0891b2';
          ctx.beginPath();
          ctx.moveTo(bitProj.x - 7, bitProj.y);
          ctx.lineTo(bitProj.x + 7, bitProj.y);
          ctx.lineTo(bitProj.x, bitProj.y + 12);
          ctx.closePath();
          ctx.fill();

          hit.push({ x: bitProj.x, y: bitProj.y, id: w.id, depth: currentDepth, type: 'bit' });

          // Predicted Future Risk Zones along active well's future path
          if (showRiskZones) {
            riskZones.forEach(rz => {
              if (rz.depth > currentDepth) {
                const zTop = position(w, rz.depth - rz.span / 2);
                const zBot = position(w, rz.depth + rz.span / 2);
                line(zTop, zBot, rz.color, 8);
                const rzMid = project(position(w, rz.depth));
                ctx.fillStyle = rz.color;
                ctx.beginPath();
                ctx.arc(rzMid.x, rzMid.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.font = 'bold 10px system-ui';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`▲ ${rz.name} (${rz.depth} m)`, rzMid.x + 12, rzMid.y + 3);

                hit.push({ x: rzMid.x, y: rzMid.y, riskId: rz.id, depth: rz.depth, name: rz.name, type: 'risk' });
              }
            });
          }
        }

        // Historical Incident Markers along offset wells
        if (showEvidence) {
          const incidents = stateRef.incidents || [];
          incidents.filter(f => f.well === w.id && Number.isFinite(f.depth) && !f.excluded).forEach(f => {
            const incPos = project(position(w, f.depth));
            ctx.fillStyle = f.type.toLowerCase().includes('stuck') ? '#ef4444' : f.type.toLowerCase().includes('pressure') ? '#f97316' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(incPos.x, incPos.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff88';
            ctx.lineWidth = 1;
            ctx.stroke();

            hit.push({ x: incPos.x, y: incPos.y, id: w.id, evidence: f.id, type: 'incident', depth: f.depth, name: f.type });
          });
        }
      });

      // HUD readout
      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(
        `EULER: X ${Math.round(camera.x * 180 / Math.PI)}° | Y ${Math.round(camera.y * 180 / Math.PI)}° | Z ${Math.round(camera.z * 180 / Math.PI)}° · ZOOM: ${camera.zoom.toFixed(2)}× · VERTICAL EXAG: ${camera.scale.toFixed(1)}×`,
        20,
        height - 18
      );
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function sync() {
      host.querySelectorAll('[data-axis]').forEach(el => {
        el.value = camera[el.dataset.axis] * 180 / Math.PI;
      });
      schedule();
    }

    function inspect() {
      const inspector = host.querySelector('.scene-inspector');
      if (!inspector) return;
      const w = allWells.find(w => w.id === selected) || activeWell;
      const incidents = (stateRef.incidents || []).filter(f => f.well === w.id && !f.excluded);
      const isCurrent = w.id === activeWell.id;

      inspector.innerHTML = `
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:12px 18px;background:#0d1829;border:1px solid #1e293b;border-radius:10px;font-size:12px;margin-top:10px;">
          <div><span class="scene-tag">${isCurrent ? 'ACTIVE TARGET' : 'OFFSET WELL'}</span><strong style="font-size:14px;color:#f8fafc;">${w.id}</strong> <small style="color:#94a3b8;">${w.formation || 'Upper Shale'}</small></div>
          <div><b style="color:#22d3ee;">${Number(w.depth).toLocaleString()} m</b> <small style="color:#64748b;">Reported Depth · ${w.depthType || 'MD'}</small></div>
          <div><b style="color:#f8fafc;">${isCurrent ? '0.00 km' : (NWIS.distance ? NWIS.distance(activeWell, w).toFixed(2) + ' km' : 'Offset')}</b> <small style="color:#64748b;">Distance from A-17</small></div>
          <div><b style="color:#f59e0b;">${incidents.length}</b> <small style="color:#64748b;">Recorded Incidents</small></div>
          <div style="margin-left:auto;display:flex;gap:8px;">
            <button id="inspect-well-btn" class="btn" style="height:32px;padding:0 12px;font-size:11px;">Open Well Dossier</button>
            ${!isCurrent ? '<button id="inspect-make-active" class="btn primary" style="height:32px;padding:0 12px;font-size:11px;">Set as Active Well</button>' : ''}
          </div>
        </div>
      `;

      host.querySelector('#inspect-well-btn').onclick = () => {
        if (window.showWellModal) window.showWellModal(w.id);
        else if (window.showWell) window.showWell(w.id);
      };
      const makeActiveBtn = host.querySelector('#inspect-make-active');
      if (makeActiveBtn) {
        makeActiveBtn.onclick = () => {
          if (window.setActiveWell) window.setActiveWell(w.id);
        };
      }
    }

    // Pointer event bindings
    canvas.onpointerdown = e => {
      canvas.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
      canvas.style.cursor = 'grabbing';
    };

    canvas.onpointermove = e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved ||= Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4;

      if (e.shiftKey || e.buttons === 2) {
        camera.panX += dx;
        camera.panY += dy;
      } else {
        camera.z += dx * 0.008;
        camera.x += dy * 0.008;
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
      sync();
    };

    canvas.onpointerup = e => {
      canvas.style.cursor = 'grab';
      if (drag && !drag.moved) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const nearest = hit.map(h => ({ ...h, dist: Math.hypot(h.x - x, h.y - y) }))
                           .sort((a, b) => a.dist - b.dist)[0];

        if (nearest && nearest.dist < 25) {
          if (nearest.type === 'risk') {
            if (window.openAlertDrawer) window.openAlertDrawer(nearest.riskId);
          } else if (nearest.type === 'incident') {
            if (window.openEvidenceModal) window.openEvidenceModal(nearest.evidence);
            else if (window.evidence) window.evidence(nearest.evidence);
          } else if (nearest.id) {
            selected = nearest.id;
            inspect();
            schedule();
          }
        }
      }
      drag = null;
    };

    canvas.onpointercancel = () => {
      drag = null;
      canvas.style.cursor = 'grab';
    };

    canvas.oncontextmenu = e => e.preventDefault();

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      camera.zoom = Math.max(0.4, Math.min(3.5, camera.zoom * Math.exp(-e.deltaY * 0.0012)));
      schedule();
    }, { passive: false });

    // Slider bindings
    host.querySelectorAll('[data-axis]').forEach(el => {
      el.oninput = () => {
        camera[el.dataset.axis] = Number(el.value) * Math.PI / 180;
        schedule();
      };
    });

    host.querySelector('#depth-scale').oninput = e => {
      camera.scale = Number(e.target.value);
      host.querySelector('#scale-value').textContent = camera.scale.toFixed(1) + '×';
      schedule();
    };

    host.querySelector('#show-formations').onchange = e => { showFormations = e.target.checked; schedule(); };
    host.querySelector('#show-risk-zones').onchange = e => { showRiskZones = e.target.checked; schedule(); };
    host.querySelector('#show-incidents').onchange = e => { showEvidence = e.target.checked; schedule(); };
    host.querySelector('#show-offsets').onchange = e => { showOffsets = e.target.checked; schedule(); };
    host.querySelector('#show-grid').onchange = e => { showGrid = e.target.checked; schedule(); };

    // Presets
    host.querySelectorAll('[data-preset]').forEach(b => {
      b.onclick = () => {
        host.querySelectorAll('[data-preset]').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        const v = {
          orbit: [-0.58, 0, 0.42],
          reset: [-0.58, 0, 0.42],
          top: [-Math.PI / 2, 0, 0],
          front: [0, 0, 0],
          side: [0, 0, Math.PI / 2]
        }[b.dataset.preset];
        [camera.x, camera.y, camera.z] = v;
        camera.zoom = 1.05;
        camera.panX = 0;
        camera.panY = 0;
        sync();
      };
    });

    // 2D Map toggle
    const toggle2d = host.querySelector('#btn-toggle-2d');
    if (toggle2d) {
      toggle2d.onclick = () => {
        if (window.setMapMode) window.setMapMode('2D');
      };
    }

    // Save image
    host.querySelector('#scene-save').onclick = () => {
      draw();
      const link = document.createElement('a');
      link.download = `NWIS-3D-Subsurface-${activeWell.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    // Responsive Canvas Resizer
    const observer = new ResizeObserver(() => {
      const r = canvas.parentElement.getBoundingClientRect();
      width = r.width || 800;
      height = r.height || 500;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    });

    observer.observe(canvas.parentElement);
    inspect();
    sync();

    dispose = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }

  const api = {
    mountScene,
    camera,
    dispose: () => dispose()
  };

  if (typeof module !== 'undefined') module.exports = api;
  else root.NWISWorkbench = api;
})(typeof window === 'undefined' ? globalThis : window);

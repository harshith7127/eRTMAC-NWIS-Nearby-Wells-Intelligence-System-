import React, { useRef, useEffect } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { ChevronUp, ChevronDown, SkipBack, Rewind, FastForward, SkipForward } from 'lucide-react';

export const BottomDock: React.FC = () => {
  const {
    currentDepth,
    setCurrentDepth,
    depthBasis,
    setDepthBasis,
    activeWellId
  } = useSelectionStore();

  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Linked Canvas Well-Log Track Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isCollapsed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Depth Ruler Horizon
    const minD = 1000;
    const maxD = 3500;
    const depthToX = (d: number) => ((d - minD) / (maxD - minD)) * width;

    // Draw Formations Color Bands
    const formations = [
      { name: 'Nordland', top: 1000, base: 1050, color: '#e0f2fe' },
      { name: 'Utsira', top: 1050, base: 1250, color: '#fed7aa' },
      { name: 'Up Hordaland', top: 1250, base: 1975, color: '#e9d5ff' },
      { name: 'Low Hordaland', top: 1975, base: 2220, color: '#fecaca' },
      { name: 'Rogaland', top: 2220, base: 2480, color: '#fef08a' },
      { name: 'Shetland Chalk', top: 2480, base: 2840, color: '#bbf7d0' },
      { name: 'Viking', top: 2960, base: 3085, color: '#ddd6fe' },
      { name: 'Hugin Res', top: 3085, base: 3280, color: '#bae6fd' }
    ];

    formations.forEach(f => {
      const x1 = depthToX(f.top);
      const x2 = depthToX(f.base);
      ctx.fillStyle = f.color;
      ctx.fillRect(x1, 0, x2 - x1, 24);

      ctx.fillStyle = '#1e293b';
      ctx.font = '10px Noto Sans';
      if (x2 - x1 > 30) {
        ctx.fillText(f.name, x1 + 4, 16);
      }
    });

    // Synthetic/Real GR Curve preview
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < width; x += 4) {
      const d = minD + (x / width) * (maxD - minD);
      // Deterministic synthetic preview wave
      const gr = 60 + Math.sin(d * 0.03) * 35 + Math.cos(d * 0.1) * 15;
      const y = 30 + (gr / 150) * (height - 35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Linked Cursor Marker at currentDepth
    const curX = depthToX(currentDepth);
    if (curX >= 0 && curX <= width) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(curX, 0);
      ctx.lineTo(curX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cursor Flag
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(curX - 35, height - 20, 70, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Noto Sans Mono';
      ctx.fillText(`${currentDepth.toFixed(0)}m`, curX - 25, height - 7);
    }
  }, [currentDepth, isCollapsed]);

  const stepDepth = (delta: number) => {
    setCurrentDepth(Math.max(0, currentDepth + delta));
  };

  return (
    <div
      style={{
        height: isCollapsed ? '32px' : 'var(--bottom-dock-height)',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height var(--transition-normal)',
        zIndex: 40
      }}
    >
      {/* Dock Bar / Scrubber Controls */}
      <div
        style={{
          height: '32px',
          padding: '0 var(--space-4)',
          backgroundColor: 'var(--bg-surface-raised)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--font-size-xs)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span style={{ fontWeight: 'bold' }}>
              Linked Depth Ruler &amp; Well-Log Tracks ({activeWellId || 'No Well'})
            </span>
          </button>

          {/* Basis Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-medium)', paddingLeft: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Basis:</span>
            {(['MD', 'TVD'] as const).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setDepthBasis(b)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '2px',
                  backgroundColor: depthBasis === b ? 'var(--color-brand-primary)' : 'transparent',
                  color: depthBasis === b ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: depthBasis === b ? 'bold' : 'normal'
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Stepper Buttons & Scrubber Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button type="button" onClick={() => stepDepth(-50)} title="Step -50m" style={{ padding: '2px' }}><SkipBack size={13} /></button>
          <button type="button" onClick={() => stepDepth(-10)} title="Step -10m" style={{ padding: '2px' }}><Rewind size={13} /></button>
          
          <input
            type="range"
            min="1000"
            max="3500"
            step="1"
            value={currentDepth}
            onChange={(e) => setCurrentDepth(parseFloat(e.target.value))}
            style={{ width: 'clamp(90px, 14vw, 200px)', height: '4px', cursor: 'ew-resize' }}
          />

          <button type="button" onClick={() => stepDepth(10)} title="Step +10m" style={{ padding: '2px' }}><FastForward size={13} /></button>
          <button type="button" onClick={() => stepDepth(50)} title="Step +50m" style={{ padding: '2px' }}><SkipForward size={13} /></button>

          <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'bold', minWidth: '70px', textAlign: 'right' }}>
            {currentDepth.toFixed(1)} m
          </span>
        </div>
      </div>

      {/* Interactive Canvas Track Area */}
      {!isCollapsed && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={180}
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const newD = 1000 + ratio * (3500 - 1000);
              setCurrentDepth(newD);
            }}
          />
          <div style={{ position: 'absolute', top: '4px', left: '8px', pointerEvents: 'none', fontSize: '10px', color: '#2563eb', fontWeight: 'bold' }}>
            Track 1: Gamma Ray (0 - 150 GAPI) &amp; Stratigraphic Intervals
          </div>
        </div>
      )}
    </div>
  );
};

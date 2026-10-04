import React, { useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { ProvenanceChip } from '../common/ProvenanceChip';
import { Layers, ChevronDown, ChevronRight, Sliders } from 'lucide-react';
import type { LayerConfig } from '../../types';

export const LayerManager: React.FC = () => {
  const { layers, setLayerVisibility, setLayerOpacity } = useSelectionStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedSliders, setExpandedSliders] = useState<Record<string, boolean>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleSlider = (layerId: string) => {
    setExpandedSliders(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const groups: Array<{ key: 'SURFACE' | 'SUBSURFACE' | 'WELLS' | 'DATA'; label: string }> = [
    { key: 'SURFACE', label: 'Surface Features' },
    { key: 'SUBSURFACE', label: 'Subsurface Geology' },
    { key: 'WELLS', label: 'Well Catalog' },
    { key: 'DATA', label: 'Exploration Data' }
  ];

  if (isSidebarCollapsed) {
    return (
      <aside
        aria-label="Layer Manager (Collapsed)"
        onClick={() => setIsSidebarCollapsed(false)}
        title="Click to expand Layer Manager"
        style={{
          width: '36px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          cursor: 'pointer',
          gap: '12px',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <button
          type="button"
          aria-label="Expand Layer Manager"
          style={{ padding: '4px', color: 'var(--color-brand-primary)' }}
        >
          <Layers size={16} />
        </button>
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)'
          }}
        >
          LAYERS
        </span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Geographic and Subsurface Layers"
      style={{
        width: 'var(--sidebar-left-width)',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--color-brand-primary)" />
          <h2 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' }}>
            Layer Manager
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(true)}
          title="Collapse Layer Manager"
          style={{
            padding: '3px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronDown style={{ transform: 'rotate(90deg)' }} size={15} />
        </button>
      </div>

      {/* Layer Groups */}
      <div style={{ padding: 'var(--space-2) 0' }}>
        {groups.map(({ key, label }) => {
          const groupLayers = layers.filter((l) => l.group === key);
          const isCollapsed = collapsedGroups[key];

          return (
            <div key={key} style={{ marginBottom: 'var(--space-2)' }}>
              {/* Group Title Accordion */}
              <button
                type="button"
                onClick={() => toggleGroup(key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px var(--space-4)',
                  backgroundColor: 'var(--bg-surface-sunken)',
                  borderTop: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  fontWeight: 'var(--font-weight-bold)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>{label}</span>
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div style={{ padding: '4px var(--space-2)' }}>
                  {groupLayers.map((layer) => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      onToggle={(v) => setLayerVisibility(layer.id, v)}
                      onOpacity={(op) => setLayerOpacity(layer.id, op)}
                      showSlider={!!expandedSliders[layer.id]}
                      onToggleSlider={() => toggleSlider(layer.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

interface LayerRowProps {
  layer: LayerConfig;
  onToggle: (visible: boolean) => void;
  onOpacity: (opacity: number) => void;
  showSlider: boolean;
  onToggleSlider: () => void;
}

const LayerRow: React.FC<LayerRowProps> = ({
  layer,
  onToggle,
  onOpacity,
  showSlider,
  onToggleSlider
}) => {
  return (
    <div
      style={{
        padding: '6px 8px',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: layer.available ? 1 : 0.55
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--font-size-xs)',
            cursor: layer.available ? 'pointer' : 'not-allowed',
            flex: 1
          }}
        >
          <input
            type="checkbox"
            checked={layer.visible && layer.available}
            disabled={!layer.available}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ cursor: layer.available ? 'pointer' : 'not-allowed' }}
          />
          <span
            title={layer.name}
            style={{
              color: layer.available ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: layer.available ? 'none' : 'line-through',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '135px',
              display: 'inline-block'
            }}
          >
            {layer.name}
          </span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ProvenanceChip origin={layer.origin} size="sm" />
          {layer.available && layer.visible && (
            <button
              type="button"
              onClick={onToggleSlider}
              title="Adjust opacity"
              style={{ padding: '2px', color: showSlider ? 'var(--color-brand-primary)' : 'var(--text-muted)' }}
            >
              <Sliders size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Unavailable Reason Rule R3 */}
      {!layer.available && layer.unavailableReason && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '22px' }}>
          • {layer.unavailableReason}
        </span>
      )}

      {/* Opacity Slider */}
      {showSlider && layer.available && layer.visible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px', paddingTop: '2px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Opacity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layer.opacity}
            onChange={(e) => onOpacity(parseFloat(e.target.value))}
            style={{ width: '100px', height: '4px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '28px' }}>
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

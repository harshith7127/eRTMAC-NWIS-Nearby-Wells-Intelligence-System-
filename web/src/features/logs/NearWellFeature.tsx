import React, { useState } from 'react';
import { NearWellViewer } from '../../components/nearwell/NearWellViewer';
import { WellLogViewer } from '../../components/logs/WellLogViewer';
import { useSelectionStore } from '../../store/useSelectionStore';
import { Compass, BarChart2 } from 'lucide-react';

export const NearWellFeature: React.FC = () => {
  const { selectedWell } = useSelectionStore();
  const [activeSubTab, setActiveSubTab] = useState<'3d' | 'tracks'>('3d');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Toggle for 3D Borehole vs Wireline Tracks */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '80px',
          zIndex: 20,
          display: 'flex',
          gap: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('3d')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: activeSubTab === '3d' ? '600' : '400',
            backgroundColor: activeSubTab === '3d' ? 'var(--color-brand-primary)' : 'transparent',
            color: activeSubTab === '3d' ? '#ffffff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Compass size={13} />
          <span>3D Borehole</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('tracks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: activeSubTab === 'tracks' ? '600' : '400',
            backgroundColor: activeSubTab === 'tracks' ? 'var(--color-brand-primary)' : 'transparent',
            color: activeSubTab === 'tracks' ? '#ffffff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <BarChart2 size={13} />
          <span>Well Logs Tracks</span>
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeSubTab === '3d' ? (
          <NearWellViewer wellId={selectedWell || '15/9-F-12'} />
        ) : (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto', backgroundColor: '#ffffff' }}>
            <WellLogViewer />
          </div>
        )}
      </div>
    </div>
  );
};

export default NearWellFeature;

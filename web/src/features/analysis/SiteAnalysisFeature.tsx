import React from 'react';
import { SiteAnalysisModal } from '../../components/analysis/SiteAnalysisModal';
import { useSelectionStore } from '../../store/useSelectionStore';

export const SiteAnalysisFeature: React.FC = () => {
  const { setActiveMode } = useSelectionStore();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflowY: 'auto' }}>
      <SiteAnalysisModal isOpen={true} embedded={true} onClose={() => setActiveMode('MAP')} />
    </div>
  );
};

export default SiteAnalysisFeature;

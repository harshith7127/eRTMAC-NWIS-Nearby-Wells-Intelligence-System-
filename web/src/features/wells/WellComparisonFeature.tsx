import React from 'react';
import { WellComparisonModal } from '../../components/wells/WellComparisonModal';
import { useSelectionStore } from '../../store/useSelectionStore';

export const WellComparisonFeature: React.FC = () => {
  const { setActiveMode } = useSelectionStore();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflowY: 'auto' }}>
      <WellComparisonModal isOpen={true} embedded={true} onClose={() => setActiveMode('MAP')} />
    </div>
  );
};

export default WellComparisonFeature;

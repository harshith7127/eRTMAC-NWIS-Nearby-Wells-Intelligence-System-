import React from 'react';
import { PrintableReportModal } from '../../components/reports/PrintableReportModal';
import { useSelectionStore } from '../../store/useSelectionStore';

export const ReportFeature: React.FC = () => {
  const {
    selectedWorkspace,
    selectedLocation,
    selectedDepth,
    selectedFormation,
    setActiveMode
  } = useSelectionStore();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflowY: 'auto' }}>
      <PrintableReportModal
        isOpen={true}
        embedded={true}
        onClose={() => setActiveMode('MAP')}
        lat={selectedLocation?.lat ?? 58.441636}
        lon={selectedLocation?.lon ?? 1.887483}
        targetDepth={selectedDepth ?? 3100}
        targetFormation={selectedFormation ?? 'Vestland Group (Hugin Reservoir)'}
        workspaceId={selectedWorkspace ?? 'volve'}
      />
    </div>
  );
};

export default ReportFeature;

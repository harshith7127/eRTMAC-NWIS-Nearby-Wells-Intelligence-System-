import React from 'react';
import { Subsurface3DViewer } from '../../components/subsurface/Subsurface3DViewer';

export const SubsurfaceFeature: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0f172a' }}>
      <Subsurface3DViewer />
    </div>
  );
};

export default SubsurfaceFeature;

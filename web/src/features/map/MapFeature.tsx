import React from 'react';
import { MapViewer } from '../../components/map/MapViewer';

export const MapFeature: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapViewer />
    </div>
  );
};

export default MapFeature;

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  CheckCircle
} from 'lucide-react';
import { api } from '../../api/client';

interface DashboardTelemetryProps {
  telemetry: any;
  activeWellId: string | null;
}

export const DashboardTelemetry: React.FC<DashboardTelemetryProps> = ({
  telemetry: initialTelemetry,
  activeWellId
}) => {
  const [telemetry, setTelemetry] = useState<any>(initialTelemetry);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    api.getTelemetryChannels().then(setChannels).catch(console.warn);
  }, []);

  // Simulation tick when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTelemetry((prev: any) => {
        const curMd = (prev?.md ?? 1842.58) + 0.2 * playbackSpeed;
        const curIdx = ((prev?.current_index ?? 0) + 1) % 600;
        // Minor natural sensor fluctuation
        const rop = Math.max(10, Math.min(200, (prev?.rop ?? 133.7) + (Math.random() - 0.5) * 8));
        const wob = Math.max(2, Math.min(25, (prev?.wob ?? 11.9) + (Math.random() - 0.5) * 1.5));
        const rpm = Math.max(100, Math.min(180, (prev?.rpm ?? 145) + (Math.random() - 0.5) * 5));
        const torque = Math.max(3, Math.min(15, (prev?.torque ?? 7.1) + (Math.random() - 0.5) * 0.4));

        return {
          ...prev,
          md: curMd,
          current_index: curIdx,
          rop,
          wob,
          rpm,
          torque
        };
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const rop = telemetry?.rop ?? 133.76;
  const wob = telemetry?.wob ?? 11.9;
  const rpm = telemetry?.rpm ?? 145.0;
  const torque = telemetry?.torque ?? 7.13;
  const spp = telemetry?.spp ?? 1315.1;
  const mudWeight = telemetry?.mud_weight ?? 1.28;
  const hookLoad = telemetry?.hook_load ?? 206.4;
  const flowIn = telemetry?.flow_in ?? 3515.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Telemetry Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isPlaying ? '#22c55e' : '#eab308' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
              WITSML Telemetry Stream ({isPlaying ? 'LIVE STREAMING' : 'PAUSED'})
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Wellbore: {activeWellId || '15/9-F-12'} • MD: {(telemetry?.md ?? 1842.58).toFixed(1)} m • Index: #{telemetry?.current_index ?? 0}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: isPlaying ? '#f59e0b' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause Stream' : 'Start Simulation'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-surface-sunken)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
            {[1, 2, 5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setPlaybackSpeed(s)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: playbackSpeed === s ? 'bold' : 'normal',
                  backgroundColor: playbackSpeed === s ? 'var(--color-brand-primary)' : 'transparent',
                  color: playbackSpeed === s ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Drilling Sensor Instrumentation Gauges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}
      >
        {/* Gauge 1: ROP */}
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate of Penetration</span>
            <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 'bold' }}>m/hr</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0284c7', fontFamily: 'var(--font-family-mono)' }}>
            {rop.toFixed(1)}
          </div>
          <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (rop / 200) * 100)}%`, height: '100%', backgroundColor: '#0284c7', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Gauge 2: WOB */}
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weight on Bit</span>
            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold' }}>kN</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', fontFamily: 'var(--font-family-mono)' }}>
            {wob.toFixed(1)}
          </div>
          <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (wob / 30) * 100)}%`, height: '100%', backgroundColor: '#16a34a', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Gauge 3: RPM */}
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rotary Speed</span>
            <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 'bold' }}>RPM</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706', fontFamily: 'var(--font-family-mono)' }}>
            {rpm.toFixed(0)}
          </div>
          <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (rpm / 220) * 100)}%`, height: '100%', backgroundColor: '#d97706', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Gauge 4: Surface Torque */}
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Surface Torque</span>
            <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 'bold' }}>kNm</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed', fontFamily: 'var(--font-family-mono)' }}>
            {torque.toFixed(2)}
          </div>
          <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (torque / 20) * 100)}%`, height: '100%', backgroundColor: '#7c3aed', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Gauge 5: Mud Density */}
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Mud Weight</span>
            <span style={{ fontSize: '10px', color: '#0f766e', fontWeight: 'bold' }}>SG</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f766e', fontFamily: 'var(--font-family-mono)' }}>
            {mudWeight.toFixed(2)}
          </div>
          <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ((mudWeight - 1.0) / 0.8) * 100)}%`, height: '100%', backgroundColor: '#0f766e', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Gauge 6: Standpipe Pressure */}
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Standpipe Pressure</span>
            <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 'bold' }}>psi</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', fontFamily: 'var(--font-family-mono)' }}>
            {spp.toFixed(0)}
          </div>
          <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (spp / 3000) * 100)}%`, height: '100%', backgroundColor: '#dc2626', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* 3. WITSML Channel Inventory Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--color-brand-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>
              Standard WITSML Sensor Channel Inventory ({channels.length > 0 ? channels.length : 11} Channels Monitored)
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Real Volve High-Frequency Drilling Record
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-sunken)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Channel Name</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Mnemonic</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Unit</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Current Value</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Physical Description</th>
                <th style={{ padding: '10px 14px', fontWeight: 'bold' }}>Channel Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Rate of Penetration', mnem: 'ROP', unit: 'm/h', val: `${rop.toFixed(1)} m/h`, desc: 'Instantaneous drilling penetration rate' },
                { name: 'Weight on Bit', mnem: 'WOB', unit: 'kN', val: `${wob.toFixed(1)} kN`, desc: 'Axial force exerted on the drill bit' },
                { name: 'Rotary Speed', mnem: 'RPM', unit: 'rpm', val: `${rpm.toFixed(0)} rpm`, desc: 'Top-drive drill string rotational speed' },
                { name: 'Surface Torque', mnem: 'TORQUE', unit: 'kNm', val: `${torque.toFixed(2)} kNm`, desc: 'Rotational mechanical resistance torque' },
                { name: 'Standpipe Pressure', mnem: 'SPP', unit: 'psi', val: `${spp.toFixed(0)} psi`, desc: 'Drilling mud circulation pressure at standpipe' },
                { name: 'Hook Load', mnem: 'HOOK_LOAD', unit: 'klbf', val: `${hookLoad.toFixed(1)} klbf`, desc: 'Total suspended load on traveling block' },
                { name: 'Mud Flow Rate In', mnem: 'FLOW_IN', unit: 'L/min', val: `${flowIn.toFixed(0)} L/min`, desc: 'Surface mud pump volumetric discharge rate' },
                { name: 'Mud Density In', mnem: 'MUD_WEIGHT', unit: 'SG', val: `${mudWeight.toFixed(2)} SG`, desc: 'Drilling fluid specific gravity' },
                { name: 'Total Gas', mnem: 'GAS', unit: '%', val: '0.05 %', desc: 'Continuous mud logging gas trap chromatography' }
              ].map((c) => (
                <tr key={c.mnem} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>{c.mnem}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>{c.unit}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold' }}>{c.val}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{c.desc}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>
                      <CheckCircle size={12} color="#16a34a" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

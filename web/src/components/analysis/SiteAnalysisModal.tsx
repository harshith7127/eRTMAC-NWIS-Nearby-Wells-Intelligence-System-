/**
 * SiteAnalysisModal — Explainable Proposed Location Analysis
 * Implements Phase 6 Site Analysis:
 * - Strictly Rule 5: NO arbitrary composite percentage scores
 * - Explainable factor checklist: Factor, Status (OK, UNKNOWN, CONCERN), Evidence, Source
 * - Data Confidence: HIGH, MODERATE, LOW, UNKNOWN with defensible methodology
 * - Explicit Data Gaps & Limitations
 * - Workspace A (Real Volve) vs Workspace B (Demo) separation
 * - Launch Printable A4 Exploration Dossier
 */

import React, { useState, useEffect } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { api } from '../../api/client';
import { ProvenanceChip } from '../common/ProvenanceChip';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Printer,
  RefreshCw
} from 'lucide-react';
import { PrintableReportModal } from '../reports/PrintableReportModal';

interface SiteAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export const SiteAnalysisModal: React.FC<SiteAnalysisModalProps> = ({ isOpen, onClose, embedded = false }) => {
  const {
    workspaceId,
    proposedLocation,
    currentDepth
  } = useSelectionStore();

  const [lat, setLat] = useState<number>(proposedLocation?.lat || 58.4412);
  const [lon, setLon] = useState<number>(proposedLocation?.lon || 1.8950);
  const [targetDepth, setTargetDepth] = useState<number>((proposedLocation as any)?.target_depth_m || (currentDepth > 0 ? currentDepth : 3200));
  const [targetFormation, setTargetFormation] = useState<string>('Hugin Formation');
  const [radiusKm, setRadiusKm] = useState<number>(5.0);

  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  // Sync coords from store when modal opens or proposedLocation updates
  useEffect(() => {
    if (proposedLocation) {
      setLat(proposedLocation.lat);
      setLon(proposedLocation.lon);
      if ((proposedLocation as any).target_depth_m) {
        setTargetDepth((proposedLocation as any).target_depth_m);
      }
    }
  }, [proposedLocation, isOpen]);

  // Execute Analysis Query
  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await api.analyzeLocation({
        latitude: lat,
        longitude: lon,
        target_depth_m: targetDepth,
        target_formation: targetFormation,
        radius_km: radiusKm,
        workspace: workspaceId
      });
      setAnalysisResult(res);
    } catch (err) {
      console.warn('Location analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    }
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const isDemo = workspaceId.includes('demo') || workspaceId.includes('onshore');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
            <CheckCircle size={12} /> OK
          </span>
        );
      case 'CONCERN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
            <AlertTriangle size={12} /> CONCERN
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
            <HelpCircle size={12} /> UNKNOWN
          </span>
        );
    }
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'HIGH':
        return { label: 'HIGH DATA CONFIDENCE', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' };
      case 'MEDIUM':
      case 'MODERATE':
        return { label: 'MEDIUM DATA CONFIDENCE', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
      case 'LOW':
        return { label: 'LOW DATA CONFIDENCE', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' };
      default:
        return { label: 'UNKNOWN CONFIDENCE', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
    }
  };

  const confInfo = getConfidenceBadge(analysisResult?.overall_confidence || 'MEDIUM');

  return (
    <>
      <div
        style={
          embedded
            ? {
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                backgroundColor: '#0b1120',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 16px 40px 16px',
                boxSizing: 'border-box'
              }
            : {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 20px 20px 20px',
                boxSizing: 'border-box'
              }
        }
      >
        <div
          style={{
            width: '100%',
            maxWidth: embedded ? '1040px' : '980px',
            maxHeight: embedded ? 'none' : '85vh',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-medium)',
            marginBottom: embedded ? '24px' : '0'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="#38bdf8" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                  Explainable Proposed Well Site Analysis
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Deterministic evidence checklist — Strictly NO arbitrary composite percentage scores (Rule R5)
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ProvenanceChip origin={isDemo ? 'SYNTHETIC' : 'REAL'} size="sm" />
              <button
                type="button"
                onClick={onClose}
                title={embedded ? 'Return to Map' : 'Close Analysis'}
                aria-label="Close Analysis Modal"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <X size={15} />
                <span>{embedded ? 'Return to Map' : 'Close'}</span>
              </button>
            </div>
          </div>

          {/* Location Query Parameters Bar */}
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr) auto',
              gap: '12px',
              alignItems: 'flex-end'
            }}
          >
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={e => setLat(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={e => setLon(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Target Depth (m)
              </label>
              <input
                type="number"
                step="50"
                value={targetDepth}
                onChange={e => setTargetDepth(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Target Horizon
              </label>
              <select
                value={targetFormation}
                onChange={e => setTargetFormation(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="Hugin Formation">Hugin Fm (Jurassic Sand)</option>
                <option value="Shetland Group">Shetland Gp (Chalk)</option>
                <option value="Rogaland Group">Rogaland Gp</option>
                <option value="Lower Hordaland">Lower Hordaland (Shale)</option>
                <option value="Utsira Formation">Utsira Fm (Shallow Sand)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Offset Search Radius
              </label>
              <select
                value={radiusKm}
                onChange={e => setRadiusKm(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="3.0">3.0 km (Local Cluster)</option>
                <option value="5.0">5.0 km (Field Scale)</option>
                <option value="10.0">10.0 km (Regional)</option>
              </select>
            </div>

            <div>
              <button
                onClick={runAnalysis}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#0284c7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Evaluating...' : 'Re-Evaluate'}
              </button>
            </div>
          </div>

          {/* Analysis Body */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Confidence Banner */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                backgroundColor: confInfo.bg,
                border: `1px solid ${confInfo.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color={confInfo.color} />
                <div>
                  <strong style={{ color: confInfo.color, fontSize: '13px' }}>
                    {confInfo.label}
                  </strong>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    Confidence evaluated from verified offset well density, structural fault clearance, and mapped stratigraphy.
                  </div>
                </div>
              </div>

              {/* Print Dossier Button */}
              <button
                onClick={() => setReportModalOpen(true)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={14} /> Generate Printable A4 Report
              </button>
            </div>

            {/* Nearby Offset Well Control Chips */}
            {analysisResult?.nearby_wells && analysisResult.nearby_wells.length > 0 && (
              <div style={{ padding: '10px 14px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0369a1', marginBottom: '6px' }}>
                  Nearby Offset Well Control ({analysisResult.nearby_wells.length} wells within {radiusKm} km search radius)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {analysisResult.nearby_wells.map((nw: any) => (
                    <span key={nw.well_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #7dd3fc', borderRadius: '4px', padding: '3px 8px', fontSize: '11px' }}>
                      <strong>{nw.name}</strong>
                      <span style={{ color: '#0284c7', fontWeight: 'bold' }}>{nw.dist_km} km</span>
                      <span style={{ color: '#64748b', fontSize: '10px' }}>TD: {nw.td} m</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Explainable Factor Checklist Table */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                Explainable Feasibility Factors (Deterministic Evidence Checklist)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left', width: '24%' }}>Evaluation Factor</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '14%' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: '42%' }}>Evidence &amp; Analysis</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: '20%' }}>Data Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(analysisResult?.factors || []).map((f: any) => (
                    <tr key={f.factor} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                        <div>{f.factor.replace(/_/g, ' ').toUpperCase()}</div>
                        {f.rule && (
                          <div style={{ fontSize: '9px', color: '#0284c7', fontFamily: 'monospace', marginTop: '2px', fontWeight: 'normal' }}>
                            {f.rule}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {getStatusBadge(f.status)}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '2px' }}>{f.summary}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.35 }}>{f.evidence}</div>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '11px', color: '#475569' }}>
                        <div>{f.source}</div>
                        <ProvenanceChip origin={f.provenance} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explicit Data Gaps Callout */}
            <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <HelpCircle size={12} /> Documented Technical Limitations &amp; Data Gaps
              </span>
              {(analysisResult?.data_gaps || []).length === 0 ? (
                <div style={{ fontSize: '11px', color: '#15803d' }}>
                  ✓ All regional criteria covered by verified survey and offset records.
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                  {(analysisResult?.data_gaps || []).map((gap: string, i: number) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#f1f5f9',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#64748b'
            }}
          >
            <span>
              Evaluation governed by Rule R5 (Explainable checklists only). No arbitrary scores.
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {embedded ? 'Return to Map' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Printable A4 Report Modal */}
      <PrintableReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        analysisData={analysisResult}
        lat={lat}
        lon={lon}
        targetDepth={targetDepth}
        targetFormation={targetFormation}
        workspaceId={workspaceId}
      />
    </>
  );
};

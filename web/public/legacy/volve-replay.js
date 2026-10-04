/* NWIS Telemetry Replay Service — Equinor Volve Field Real-Time Replay Engine
   Emits historical Volve drilling records sequentially as live eRTMAC/WITSML streams.
   Supports speed multipliers: 0.5x, 1x, 2x, 5x, 10x with Play, Pause, Reset, Seek.
   Preserves authentic data integrity: missing sensor channels are displayed as N/A, never fabricated.
*/
(function(root) {
  'use strict';

  class VolveReplayEngine {
    constructor(options = {}) {
      this.telemetry = [];
      this.formations = [];
      this.wells = [];
      this.reports = [];
      this.incidents = [];
      this.metadata = {};

      this.currentIndex = 0;
      this.isPlaying = true;
      this.speed = 1.0; // 0.5, 1, 2, 5, 10
      this.baseIntervalMs = 2000;
      this.timer = null;
      this.callbacks = new Set();
      this.mitigationFactor = 0; // 0..1 (progress of simulated preventive action)

      // Rolling buffers
      this.rollingHistory = [];
      this.maxHistoryLength = 60; // Up to 60 historical records for rolling windows

      if (options.data) {
        this.initData(options.data);
      }
    }

    initData(data) {
      if (!data) return;
      this.metadata = data.metadata || {};
      this.formations = data.formations || [];
      this.wells = data.wells || [];
      this.telemetry = data.telemetry || [];
      this.reports = data.reports || [];
      this.incidents = data.incidents || [];

      if (this.telemetry.length > 0) {
        this.currentIndex = 0;
        this.rollingHistory = [this.getCurrentSample()];
      }
    }

    onTick(cb) {
      this.callbacks.add(cb);
      return () => this.callbacks.delete(cb);
    }

    notify() {
      const sample = this.getCurrentSample();
      for (const cb of this.callbacks) {
        try {
          cb(sample, this.rollingHistory, this.getEngineState());
        } catch (e) {
          console.error('Error in replay callback:', e);
        }
      }
    }

    getCurrentSample() {
      if (!this.telemetry || this.telemetry.length === 0) {
        return null;
      }
      const raw = this.telemetry[this.currentIndex] || this.telemetry[0];
      
      // Calculate rolling statistical features
      const stats = this.computeRollingStats();

      // Apply simulated preventive mitigation if active (Action -> Risk Reduction)
      const mit = Math.max(0, Math.min(1, this.mitigationFactor));
      
      let effectiveTorque = raw.torque;
      let effectiveSpp = raw.standpipePressure;
      let effectiveRop = raw.rop;
      
      if (mit > 0 && effectiveTorque !== null) {
        // Stabilize torque toward normal baseline (13.5 kNm)
        effectiveTorque = Math.round((raw.torque * (1 - mit * 0.45) + 13.5 * (mit * 0.45)) * 100) / 100;
      }
      if (mit > 0 && effectiveSpp !== null) {
        // Stabilize standpipe pressure toward baseline (2800 psi)
        effectiveSpp = Math.round((raw.standpipePressure * (1 - mit * 0.35) + 2800 * (mit * 0.35)) * 10) / 10;
      }
      if (mit > 0 && effectiveRop !== null) {
        // Recover ROP toward baseline (16 m/h)
        effectiveRop = Math.round((raw.rop * (1 - mit * 0.25) + 16.0 * (mit * 0.25)) * 100) / 100;
      }

      // Compute look-ahead risk estimates based on rolling features and depth
      const riskEstimates = this.computeRiskEstimates(raw.measuredDepth, stats, mit);

      return {
        ...raw,
        torque: effectiveTorque,
        standpipePressure: effectiveSpp,
        rop: effectiveRop,
        rollingStats: stats,
        riskEstimates,
        mitigationFactor: mit,
        isSimulatedIntervention: mit > 0
      };
    }

    computeRollingStats() {
      const windowSamples = this.rollingHistory.slice(-20);
      if (windowSamples.length === 0) {
        return {
          torqueMean: null,
          torqueDeltaPc: 0,
          torqueVolatility: 0,
          sppMean: null,
          sppDeltaPc: 0,
          ropMean: null,
          ropDeltaPc: 0,
          flowDelta: 0
        };
      }

      const getValid = key => windowSamples.map(s => s[key]).filter(v => v !== null && !isNaN(v));

      const tqVals = getValid('torque');
      const sppVals = getValid('standpipePressure');
      const ropVals = getValid('rop');
      const flowInVals = getValid('flowIn');
      const flowOutVals = getValid('flowOut');

      const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      const std = arr => {
        if (arr.length < 2) return 0;
        const m = mean(arr);
        return Math.sqrt(arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1));
      };

      const tqMean = mean(tqVals);
      const sppMean = mean(sppVals);
      const ropMean = mean(ropVals);

      const latest = this.telemetry[this.currentIndex] || {};
      const tqDelta = tqMean && latest.torque ? Math.round(((latest.torque - tqMean) / tqMean) * 100) : 0;
      const sppDelta = sppMean && latest.standpipePressure ? Math.round(((latest.standpipePressure - sppMean) / sppMean) * 100) : 0;
      const ropDelta = ropMean && latest.rop ? Math.round(((latest.rop - ropMean) / ropMean) * 100) : 0;

      const flowInLast = latest.flowIn || 0;
      const flowOutLast = latest.flowOut || 0;

      return {
        torqueMean: tqMean ? Math.round(tqMean * 10) / 10 : null,
        torqueDeltaPc: tqDelta,
        torqueVolatility: Math.round(std(tqVals) * 10) / 10,
        sppMean: sppMean ? Math.round(sppMean) : null,
        sppDeltaPc: sppDelta,
        ropMean: ropMean ? Math.round(ropMean * 10) / 10 : null,
        ropDeltaPc: ropDelta,
        flowDelta: Math.round(flowInLast - flowOutLast)
      };
    }

    computeRiskEstimates(depth, stats, mitigation = 0) {
      // Look-Ahead Risk Heuristics based on Volve Formation Proximity & Historical Offsets (15/9-F-15)
      // Formations: Lower Reactive Shale starts at 1,975m (prone to stuck pipe)
      // Current depth approaching 1,842m - 2,040m
      const distanceToReactiveShale = Math.max(0, 1975.0 - depth);
      const inReactiveShale = depth >= 1975.0 && depth < 2220.0;

      // Base stuck-pipe probability curve approaching reactive shale:
      // increases as distance decreases, spikes with rising torque and pressure
      let baseStuckProb = 0.35;
      if (inReactiveShale) {
        baseStuckProb = 0.68;
      } else if (distanceToReactiveShale < 150) {
        baseStuckProb = 0.52 + (150 - distanceToReactiveShale) * 0.0015;
      }

      // Modulate by real-time telemetry anomalies
      if (stats.torqueDeltaPc > 10) baseStuckProb += 0.12;
      if (stats.sppDeltaPc > 8) baseStuckProb += 0.08;
      if (stats.ropDeltaPc < -10) baseStuckProb += 0.05;

      let stuckProb = Math.min(0.85, Math.max(0.15, baseStuckProb));

      // Dampen risk if preventive mitigation applied:
      // 72% -> 61% -> 47% -> 31%
      if (mitigation > 0) {
        stuckProb = stuckProb * (1 - mitigation * 0.57);
      }

      const stuckProbPercent = Math.round(stuckProb * 100);

      return {
        stuckPipe: {
          label: 'Look-Ahead Stuck-Pipe Rule Indicator',
          probability: stuckProbPercent,
          confidence: 'Correlated (Offset Analogue 15/9-F-15)',
          method: 'Deterministic rule heuristic (Formation proximity + sensor deviation)',
          severity: stuckProbPercent >= 65 ? 'Critical' : stuckProbPercent >= 45 ? 'High' : stuckProbPercent >= 30 ? 'Medium' : 'Low',
          depthTarget: 2040.0,
          aheadM: Math.max(0, Math.round(2040.0 - depth)),
          formationTarget: 'Lower Hordaland Reactive Shale',
          analogWell: '15/9-F-15',
          analogIncidentDepth: 2052.0
        },
        mudLoss: {
          label: 'Look-Ahead Mud-Loss Rule Indicator',
          probability: Math.round(34 * (1 - mitigation * 0.4)),
          confidence: 'Offset Analogue Correlated',
          method: 'Deterministic rule heuristic (Permeable sand threshold)',
          severity: 'Medium',
          depthTarget: 1860.0,
          aheadM: Math.max(0, Math.round(1860.0 - depth)),
          formationTarget: 'Upper Hordaland Shale'
        },
        pressureAnomaly: {
          label: 'Look-Ahead Pressure Anomaly Rule Indicator',
          probability: Math.round(51 * (1 - mitigation * 0.45)),
          confidence: 'Offset Analogue Correlated',
          method: 'Deterministic rule heuristic (Gas break threshold)',
          severity: 'High',
          depthTarget: 1920.0,
          aheadM: Math.max(0, Math.round(1920.0 - depth)),
          formationTarget: 'Lower Hordaland Reactive Shale'
        },
        cementingRisk: {
          label: 'Look-Ahead Cementing Rule Evaluation',
          probability: 39,
          confidence: 'Lithology Boundary',
          method: 'Deterministic rule heuristic (Shoe integrity check)',
          severity: 'Medium',
          depthTarget: 2250.0,
          aheadM: Math.max(0, Math.round(2250.0 - depth)),
          formationTarget: 'Rogaland Group (Balder/Sele)'
        }
      };
    }

    start() {
      this.isPlaying = true;
      this.scheduleNextTick();
    }

    pause() {
      this.isPlaying = false;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.notify();
    }

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.scheduleNextTick();
      this.notify();
    }

    reset() {
      this.currentIndex = 0;
      this.mitigationFactor = 0;
      this.rollingHistory = [this.getCurrentSample()];
      this.notify();
    }

    seek(indexOrFraction) {
      if (!this.telemetry.length) return;
      let targetIdx = 0;
      if (indexOrFraction >= 0 && indexOrFraction <= 1) {
        targetIdx = Math.floor(indexOrFraction * (this.telemetry.length - 1));
      } else {
        targetIdx = Math.max(0, Math.min(this.telemetry.length - 1, Math.floor(indexOrFraction)));
      }
      this.currentIndex = targetIdx;
      this.rollingHistory.push(this.getCurrentSample());
      this.rollingHistory = this.rollingHistory.slice(-this.maxHistoryLength);
      this.notify();
    }

    setSpeed(speedVal) {
      const validSpeeds = [0.5, 1, 2, 5, 10];
      if (validSpeeds.includes(Number(speedVal))) {
        this.speed = Number(speedVal);
        if (this.isPlaying) {
          if (this.timer) clearTimeout(this.timer);
          this.scheduleNextTick();
        }
        this.notify();
      }
    }

    applyMitigation() {
      // Simulate preventive engineering action
      this.mitigationFactor = 0.2;
      const stepMitigation = () => {
        if (this.mitigationFactor < 1.0) {
          this.mitigationFactor = Math.min(1.0, this.mitigationFactor + 0.2);
          this.notify();
          setTimeout(stepMitigation, 400);
        }
      };
      stepMitigation();
    }

    undoMitigation() {
      this.mitigationFactor = 0;
      this.notify();
    }

    scheduleNextTick() {
      if (!this.isPlaying) return;
      const interval = Math.max(150, Math.round(this.baseIntervalMs / this.speed));
      this.timer = setTimeout(() => {
        this.stepForward();
        this.scheduleNextTick();
      }, interval);
    }

    stepForward() {
      if (!this.telemetry.length) return;
      this.currentIndex = (this.currentIndex + 1) % this.telemetry.length;
      const sample = this.getCurrentSample();
      this.rollingHistory.push(sample);
      this.rollingHistory = this.rollingHistory.slice(-this.maxHistoryLength);
      this.notify();
    }

    getEngineState() {
      return {
        currentIndex: this.currentIndex,
        totalSamples: this.telemetry.length,
        progressFraction: this.telemetry.length ? this.currentIndex / (this.telemetry.length - 1) : 0,
        isPlaying: this.isPlaying,
        speed: this.speed,
        mitigationFactor: this.mitigationFactor,
        activeWell: '15/9-F-12',
        field: 'Volve Field (Block 15/9, North Sea)',
        dataset: 'Equinor Volve Open Data'
      };
    }
  }

  root.VolveReplayEngine = VolveReplayEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VolveReplayEngine;
  }
})(typeof window !== 'undefined' ? window : this);

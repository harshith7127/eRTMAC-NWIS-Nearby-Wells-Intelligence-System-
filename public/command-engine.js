/* Synthetic scenario engine. Probabilities are illustrative rule outputs, never calibrated forecasts. */
(function(root){
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  const profileData = {
    'A-17': [0, 8, 1.14, 1.18],
    'B-04': [-35, 12, 1.16, 1.20],
    'B-09': [45, 19, 1.22, 1.24],
    'C-02': [150, 32, 1.35, 1.38],
    'D-11': [-90, 6, 1.12, 1.16],
    'C-11': [10, 16.5, 1.20, 1.24],
    'D-09': [60, 22, 1.26, 1.28],
    'F-15': [25, 14, 1.18, 1.22],
    'E-02': [120, 28, 1.25, 1.30]
  };

  function profile(w) {
    if (!w?.demo || !profileData[w.id]) return null;
    const [shift, inclination, pressure, mud] = profileData[w.id];
    return {
      shift,
      inclination,
      pressure,
      mud,
      trajectory: 'Synthetic inclination ' + inclination + '°',
      tops: [
        { name: 'Upper sandstone', depth: 1200 + shift },
        { name: 'Upper shale', depth: 1500 + shift },
        { name: 'Jodhpur Sandstone', depth: 1750 + shift },
        { name: 'Lower reactive shale', depth: 1975 + shift },
        { name: 'Basal sandstone', depth: 2250 + shift },
        { name: 'Basement gneiss', depth: 2600 + shift }
      ],
      casing: 1650 + shift,
      zone: [1975 + shift, 2220 + shift]
    };
  }

  const metrics = [
    ['rop', 'ROP', 'm/h'],
    ['torque', 'Torque', 'kN·m'],
    ['hook', 'Hook load', 't'],
    ['spp', 'Standpipe pressure', 'bar'],
    ['mud', 'Mud weight', 'SG'],
    ['flow', 'Flow rate', 'L/min'],
    ['gas', 'Gas', '%'],
    ['rpm', 'RPM', 'rpm'],
    ['wob', 'Weight on bit', 't'],
    ['depth', 'Current depth', 'm']
  ];

  const baselines = {
    rop: 24.2,
    torque: 15.4,
    hook: 145.0,
    spp: 215.0,
    mud: 1.20,
    flow: 1500.0,
    gas: 0.52,
    rpm: 110,
    wob: 12.5
  };

  function sample(t, base, scenario, mitigation = 0) {
    const wave = (n, freq = 0.38) => Math.sin(t * freq + n);
    const rising = (1 + Math.sin(t * 0.11)) / 2;
    const stress = scenario === 'normal' ? 0 : 0.6 + 0.4 * rising;

    // Mitigation dampening factor (0 = no mitigation, 1 = fully mitigated)
    const mit = clamp(mitigation, 0, 1);
    const effectiveStress = stress * (1 - mit * 0.85);

    let rop = 24.2 + 1.8 * wave(0) - (scenario === 'stuck' ? 9.4 * effectiveStress : 0) + (scenario === 'influx' ? 12 * effectiveStress : 0);
    let torque = 15.4 + 0.9 * wave(1) + (scenario === 'stuck' ? 6.4 * effectiveStress : 0) + (scenario === 'drag' ? 8.2 * effectiveStress : 0);
    let hook = 145.0 + 2.5 * wave(2) + (scenario === 'drag' ? 18.0 * effectiveStress : 0) + (scenario === 'stuck' ? 12.0 * effectiveStress * wave(5, 0.9) : 0);
    let spp = 215.0 + 4.0 * wave(3) + (scenario === 'stuck' ? 27.0 * effectiveStress : 0) + (scenario === 'drag' ? 22.0 * effectiveStress : 0) - (scenario === 'loss' ? 32.0 * effectiveStress : 0);
    let mud = 1.20 + 0.004 * wave(4) + (mit > 0 ? 0.03 * mit : 0);
    let flow = 1500.0 + 20.0 * wave(5) - (scenario === 'loss' ? 210.0 * effectiveStress : 0) + (mit > 0 ? 120.0 * mit : 0);
    let gas = 0.52 + 0.08 * wave(6) + (scenario === 'influx' ? 3.4 * effectiveStress : 0);
    let rpm = 110 + 2.0 * wave(7) - (scenario === 'stuck' ? 18.0 * effectiveStress : 0);
    let wob = 12.5 + 0.6 * wave(8) - (mit > 0 ? 2.5 * mit : 0);

    return {
      rop: Number(rop.toFixed(1)),
      torque: Number(torque.toFixed(1)),
      hook: Number(hook.toFixed(1)),
      spp: Number(spp.toFixed(0)),
      mud: Number(mud.toFixed(3)),
      flow: Number(flow.toFixed(0)),
      gas: Number(gas.toFixed(2)),
      rpm: Number(rpm.toFixed(0)),
      wob: Number(wob.toFixed(1)),
      depth: Number((base + t * 24 / 1800).toFixed(1)),
      scenario,
      mitigation: mit,
      baselines
    };
  }

  const definitions = [
    {
      id: 'loss',
      name: 'Mud loss',
      type: 'Mud loss',
      at: 80,
      severity: 'High',
      checks: [['flow', 1350, 'below'], ['spp', 195, 'below']],
      recommend: 'Review offset loss intervals and the approved lost-circulation contingency with the drilling engineer; verify flow measurement and prepare LCM pill before penetrating fracture zone.'
    },
    {
      id: 'kick',
      name: 'Kick / influx',
      type: 'Pressure anomaly',
      at: 130,
      severity: 'Critical',
      checks: [['gas', 1.5, 'above'], ['rop', 32, 'above']],
      recommend: 'Review the approved well-control response and verify independent flow and pit-volume indicators with the responsible crew. Conduct immediate flow check upon any drilling break.'
    },
    {
      id: 'stuck',
      name: 'Stuck pipe',
      type: 'Stuck pipe',
      at: 210,
      severity: 'Critical',
      checks: [['hook', 155, 'above'], ['torque', 20.0, 'above']],
      recommend: 'Condition mud with 3-5% KCl / polyglycol shale inhibitor before entering reactive shale interval; adjust circulation rate to 1,650 L/min and avoid static connections > 15 minutes.'
    },
    {
      id: 'pressure',
      name: 'Overpressure',
      type: 'Pressure anomaly',
      at: 290,
      severity: 'Critical',
      checks: [['gas', 1.5, 'above'], ['rop', 32, 'above']],
      recommend: 'Review the pressure prognosis and offset evidence (D-09 kick at 2,105 m); require validated formation-pressure and survey data before changing operating mud weight envelope.'
    },
    {
      id: 'torque',
      name: 'Torque spike',
      type: 'Torque / drag',
      at: 360,
      severity: 'Medium',
      checks: [['torque', 20.5, 'above'], ['spp', 230, 'above']],
      recommend: 'Review the approved torque envelope, BHA stabilizer wear and hole-cleaning evidence; pump 25 bbl high-vis sweep before reaming.'
    },
    {
      id: 'cement',
      name: 'Cementing integrity',
      type: 'Cementing',
      at: 450,
      severity: 'High',
      checks: [['flow', 1350, 'below'], ['spp', 195, 'below']],
      recommend: 'Before planned intermediate cement job, review offset loss history in D-11 and C-02; run caliper log and verify standoff centralization design.'
    }
  ];

  function similarity(a, w, incidents, N, radius) {
    const p = profile(a), q = profile(w);
    const ae = new Set(incidents.filter(f => f.well === a.id && !f.excluded).map(f => f.type));
    const be = new Set(incidents.filter(f => f.well === w.id && !f.excluded).map(f => f.type));
    const union = new Set([...ae, ...be]);

    const parts = [
      ['Geology', 0.3, N.formationMatch(a.formation, w.formation)],
      ['Distance', 0.2, clamp(1 - N.distance(a, w) / Math.max(radius, 0.1))],
      ['Trajectory', 0.15, p && q ? clamp(1 - Math.abs(p.inclination - q.inclination) / 45) : null],
      ['Pressure regime', 0.15, p && q ? clamp(1 - Math.abs(p.pressure - q.pressure) / 0.4) : null],
      ['Mud program', 0.1, p && q ? clamp(1 - Math.abs(p.mud - q.mud) / 0.3) : null],
      ['Historical events', 0.1, ae.size && be.size ? [...ae].filter(x => be.has(x)).length / union.size : null]
    ];

    const coverage = parts.reduce((s, [, weight, v]) => s + (v === null ? 0 : weight), 0);
    const score = Math.round(parts.reduce((s, [, weight, v]) => s + weight * (v ?? 0), 0) / Math.max(coverage, 0.01) * 100);

    return {
      well: w,
      parts,
      coverage: Math.round(coverage * 100),
      score
    };
  }

  function alerts(s, live, N, horizon = 500) {
    const a = s.wells.find(w => w.id === s.active);
    return definitions.filter(d => d.at <= horizon).map(d => {
      const eligible = s.wells.filter(w => w.id !== a.id && N.distance(a, w) <= s.radius && (!s.same || N.formationMatch(w.formation, a.formation) >= 0.75));
      const ids = new Set(eligible.map(w => w.id));
      const citations = s.incidents.filter(f => ids.has(f.well) && !f.excluded && Number.isFinite(f.depth) && f.type === d.type && (s.wells.find(w => w.id === f.well)?.depthType || 'MD') === (s.depthType || 'MD') && s.reports.some(r => r.id === f.report));
      
      const triggers = d.checks.map(([key, threshold, direction]) => ({
        key,
        threshold,
        direction,
        value: live[key],
        hit: direction === 'above' ? live[key] > threshold : live[key] < threshold
      }));

      const hits = triggers.filter(t => t.hit).length;
      let rawProbability = clamp(0.08 + 0.24 * hits + 0.06 * Math.min(3, citations.length), 0.03, 0.92);

      // If stuck pipe hazard and simulation is in stuck-pipe scenario vs mitigated scenario
      if (d.id === 'stuck') {
        if (live.scenario === 'stuck' && (!live.mitigation || live.mitigation === 0)) {
          rawProbability = 0.72;
        } else if (live.mitigation > 0) {
          rawProbability = clamp(0.72 - live.mitigation * 0.41, 0.31, 0.72);
        }
      }

      const probability = Math.round(rawProbability * 100);

      return {
        ...d,
        citations,
        triggers,
        probability,
        confidence: citations.length >= 2 ? 'High' : citations.length ? 'Medium' : 'Insufficient',
        from: Math.max(50, d.at - 30),
        to: Math.min(horizon, d.at + 35),
        wells: eligible.filter(w => citations.some(f => f.well === w.id)).map(w => similarity(a, w, s.incidents, N, s.radius)).sort((x, y) => y.score - x.score)
      };
    });
  }

  const api = {
    sample,
    metrics,
    baselines,
    definitions,
    profile,
    profileData,
    similarity,
    alerts
  };

  if(typeof module !== 'undefined') module.exports = api;
  else root.NWISCommand = api;
})(typeof window === 'undefined' ? globalThis : window);

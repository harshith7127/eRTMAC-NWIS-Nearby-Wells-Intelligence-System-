/* NWIS Industrial Drilling Intelligence — Centralized Operational Dataset & Models
   Consistent across all pages, components, analytics, and 3D views.
   Demonstration / synthetic data for SIH26121 ERTMAC-NWIS.
*/
(function(root){
  const PROVENANCE = {
    REAL: 'REAL',
    DERIVED: 'DERIVED',
    SYNTHETIC: 'SYNTHETIC',
    ILLUSTRATIVE: 'ILLUSTRATIVE'
  };

  function getProvenanceLabel(provenance) {
    if (typeof provenance === 'object' && provenance !== null) {
      provenance = provenance.provenance || provenance.label || provenance.name || 'REAL';
    }
    switch (provenance) {
      case 'REAL':
      case 'REAL_VOLVE':
        return 'PUBLIC VOLVE DATA';
      case 'DERIVED':
        return 'DERIVED DATA';
      case 'SYNTHETIC':
      case 'SYNTHETIC_DEMO':
        return 'SYNTHETIC DEMO';
      case 'ILLUSTRATIVE':
        return 'ILLUSTRATIVE / SIMULATED';
      default:
        return String(provenance || 'UNSPECIFIED');
    }
  }

  function renderProvenanceBadge(provenance, options = {}) {
    const label = getProvenanceLabel(provenance);
    const colorMap = {
      'PUBLIC VOLVE DATA': { bg: 'rgba(6, 182, 212, 0.15)', text: '#38bdf8', border: 'rgba(6, 182, 212, 0.4)' },
      'DERIVED DATA': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' },
      'SYNTHETIC DEMO': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
      'ILLUSTRATIVE / SIMULATED': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' }
    };
    const style = colorMap[label] || colorMap['SYNTHETIC DEMO'];
    return `<span class="badge-provenance" style="background:${style.bg};color:${style.text};border:1px solid ${style.border};font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;letter-spacing:0.04em;text-transform:uppercase;display:inline-flex;align-items:center;gap:3px;" title="${options.tooltip || label}">${label}</span>`;
  }

  const formations = [
    { name: 'Upper Sandstone', top: 0, bottom: 1450, lithology: 'Fine to medium quartz sandstone with interbedded siltstone', porePressure: 1.05, hazard: 'Low', color: '#94a3b8', description: 'Competent, porous formation with hydrostatic pore pressure regime.', provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO' },
    { name: 'Upper Shale', top: 1450, bottom: 1750, lithology: 'Dark grey fissile shale with calcareous laminations', porePressure: 1.12, hazard: 'Medium', color: '#64748b', description: 'Moderately reactive shale; slight dispersion in water-based mud.', provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO' },
    { name: 'Jodhpur Sandstone', top: 1750, bottom: 1975, lithology: 'Porous quartz arenite with permeable loss-prone intervals', porePressure: 1.16, hazard: 'Medium', color: '#d5b883', description: 'Primary reservoir interval. Prone to differential sticking and seepage losses in permeable sands.', provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO' },
    { name: 'Lower Reactive Shale', top: 1975, bottom: 2250, lithology: 'Smectite-rich swelling shale with overpressured micro-fractures', porePressure: 1.28, hazard: 'High / Critical', color: '#b45309', description: 'Highly reactive swelling shale. Swelling and borehole collapse observed in offset wells B-04, C-11, D-09.', provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO' },
    { name: 'Basal Sandstone', top: 2250, bottom: 2600, lithology: 'Tightly cemented hard sandstone with chert inclusions', porePressure: 1.34, hazard: 'High', color: '#9a7b56', description: 'Abrasive formation causing severe drillstring vibration and torque fluctuations.', provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO' },
    { name: 'Basement Gneiss', top: 2600, bottom: 3200, lithology: 'Crystalline granitic gneiss and metamorphic basement', porePressure: 1.40, hazard: 'Medium', color: '#475569', description: 'Extremely hard basement complex; low ROP and bit wear.', provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO' }
  ];

  const wells = [
    {
      id: 'A-17',
      name: 'Rig-04 / A-17 (Active Drill)',
      lat: 27.5000,
      lon: 71.5000,
      depth: 1842.4,
      targetDepth: 2850,
      depthType: 'MD',
      formation: 'Upper Shale',
      casing: 1650,
      status: 'DRILLING',
      mudWeight: 1.20,
      pressureEMW: 1.14,
      inclination: 4.2,
      spudDate: '2026-08-12',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 04 (3,000 HP Cyber)',
      bha: '8-1/2" PDC + Mud Motor 1.5° + MWD/LWD',
      demo: true,
      active: true
    },
    {
      id: 'B-04',
      name: 'B-04 (Discovery Offset)',
      lat: 27.5120,
      lon: 71.4860,
      depth: 2450.0,
      targetDepth: 2450,
      depthType: 'MD',
      formation: 'Lower Reactive Shale',
      casing: 1620,
      status: 'COMPLETED',
      mudWeight: 1.20,
      pressureEMW: 1.16,
      inclination: 12.0,
      spudDate: '2024-03-10',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 02',
      bha: '8-1/2" Tricone/PDC Hybrid',
      demo: true,
      similarityScore: 91,
      similarityFactors: {
        geology: 96,
        formationSeq: 94,
        depthProfile: 91,
        pressureRegime: 89,
        mudProgram: 82,
        trajectory: 88,
        geographic: 84
      },
      keyIncidents: [
        { type: 'High torque', depth: 2018, desc: 'Torque climbed to 28 kN·m at 2,018 m before sticking.' },
        { type: 'Stuck pipe', depth: 2052, desc: 'Pack-off stuck pipe at 2,052 m in Lower Reactive Shale.' }
      ]
    },
    {
      id: 'C-11',
      name: 'C-11 (West Flank Offset)',
      lat: 27.4850,
      lon: 71.5150,
      depth: 2320.0,
      targetDepth: 2320,
      depthType: 'MD',
      formation: 'Lower Reactive Shale',
      casing: 1675,
      status: 'PRODUCING',
      mudWeight: 1.24,
      pressureEMW: 1.20,
      inclination: 16.5,
      spudDate: '2024-09-05',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 05',
      bha: '8-1/2" PDC + RSS',
      demo: true,
      similarityScore: 84,
      similarityFactors: {
        geology: 88,
        formationSeq: 90,
        depthProfile: 86,
        pressureRegime: 85,
        mudProgram: 80,
        trajectory: 82,
        geographic: 81
      },
      keyIncidents: [
        { type: 'Mud loss', depth: 1972, desc: '35 bbl/hr partial mud losses in fractured transition zone.' },
        { type: 'Stuck pipe', depth: 2045, desc: 'Differential sticking after 45 min static survey.' }
      ]
    },
    {
      id: 'D-09',
      name: 'D-09 (Structural Deep)',
      lat: 27.5250,
      lon: 71.4700,
      depth: 2600.0,
      targetDepth: 2600,
      depthType: 'MD',
      formation: 'Basal Sandstone',
      casing: 1710,
      status: 'COMPLETED',
      mudWeight: 1.28,
      pressureEMW: 1.26,
      inclination: 22.0,
      spudDate: '2023-11-15',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 01',
      bha: '8-1/2" PDC + Motor',
      demo: true,
      similarityScore: 79,
      similarityFactors: {
        geology: 82,
        formationSeq: 84,
        depthProfile: 80,
        pressureRegime: 78,
        mudProgram: 75,
        trajectory: 74,
        geographic: 72
      },
      keyIncidents: [
        { type: 'Pressure anomaly', depth: 2105, desc: 'Overpressure gas kick, shut-in casing pressure 32 bar.' },
        { type: 'Torque / drag', depth: 2080, desc: 'Severe wellbore instability, tight hole and high drag.' }
      ]
    },
    {
      id: 'B-09',
      name: 'B-09 (North Stepout)',
      lat: 27.5200,
      lon: 71.5260,
      depth: 1906.0,
      targetDepth: 2280,
      depthType: 'MD',
      formation: 'Jodhpur Sandstone',
      casing: 1590,
      status: 'SUSPENDED',
      mudWeight: 1.22,
      pressureEMW: 1.22,
      inclination: 19.0,
      spudDate: '2025-01-20',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 03',
      bha: '8-1/2" PDC',
      demo: true,
      similarityScore: 76,
      similarityFactors: {
        geology: 80,
        formationSeq: 78,
        depthProfile: 75,
        pressureRegime: 74,
        mudProgram: 72,
        trajectory: 76,
        geographic: 75
      },
      keyIncidents: [
        { type: 'Mud loss', depth: 1860, desc: 'Seepage mud losses 20 bbl/hr.' },
        { type: 'Pressure anomaly', depth: 1920, desc: 'Trip gas influx 4.5%.' }
      ]
    },
    {
      id: 'D-11',
      name: 'D-11 (South Flank)',
      lat: 27.4650,
      lon: 71.4610,
      depth: 2150.0,
      targetDepth: 2150,
      depthType: 'MD',
      formation: 'Jodhpur Sandstone',
      casing: 1550,
      status: 'PLUGGED',
      mudWeight: 1.16,
      pressureEMW: 1.12,
      inclination: 6.0,
      spudDate: '2023-05-18',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 04',
      bha: '8-1/2" Roller Cone',
      demo: true,
      similarityScore: 73,
      similarityFactors: {
        geology: 76,
        formationSeq: 74,
        depthProfile: 72,
        pressureRegime: 70,
        mudProgram: 68,
        trajectory: 79,
        geographic: 70
      },
      keyIncidents: [
        { type: 'Cementing', depth: 1684, desc: 'Loss of slurry returns during 9-5/8" casing cement job.' },
        { type: 'Stuck pipe', depth: 1784, desc: 'Mechanical sticking while pulling out of hole.' }
      ]
    },
    {
      id: 'F-15',
      name: 'F-15 (North-East Stepout)',
      lat: 27.5400,
      lon: 71.4900,
      depth: 2400.0,
      targetDepth: 2400,
      depthType: 'MD',
      formation: 'Lower Reactive Shale',
      casing: 1640,
      status: 'DRILLING',
      mudWeight: 1.22,
      pressureEMW: 1.18,
      inclination: 14.0,
      spudDate: '2026-07-01',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 02',
      bha: '8-1/2" PDC + RSS',
      demo: true,
      similarityScore: 71,
      similarityFactors: {
        geology: 75,
        formationSeq: 73,
        depthProfile: 70,
        pressureRegime: 68,
        mudProgram: 70,
        trajectory: 72,
        geographic: 68
      },
      keyIncidents: [
        { type: 'Pressure anomaly', depth: 1940, desc: 'Gas influx 4.2% on connection.' },
        { type: 'Torque / drag', depth: 2025, desc: 'Torque spikes during tight hole reaming.' }
      ]
    },
    {
      id: 'C-02',
      name: 'C-02 (South Deep Exploratory)',
      lat: 27.4700,
      lon: 71.5340,
      depth: 2520.0,
      targetDepth: 2520,
      depthType: 'MD',
      formation: 'Lower Jodhpur',
      casing: 1750,
      status: 'COMPLETED',
      mudWeight: 1.38,
      pressureEMW: 1.35,
      inclination: 32.0,
      spudDate: '2022-08-14',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 06',
      bha: '8-1/2" Steerable Motor',
      demo: true,
      similarityScore: 68,
      similarityFactors: {
        geology: 70,
        formationSeq: 68,
        depthProfile: 65,
        pressureRegime: 62,
        mudProgram: 65,
        trajectory: 58,
        geographic: 66
      },
      keyIncidents: [
        { type: 'Cementing', depth: 2140, desc: 'Cement channeling requiring remedial squeeze.' },
        { type: 'Torque / drag', depth: 2164, desc: 'High drag of 24 t on trips in 32° tangent.' }
      ]
    },
    {
      id: 'E-02',
      name: 'E-02 (Regional Deep Stratigraphic)',
      lat: 27.4500,
      lon: 71.5500,
      depth: 2750.0,
      targetDepth: 2750,
      depthType: 'MD',
      formation: 'Basement Gneiss',
      casing: 1820,
      status: 'PRODUCING',
      mudWeight: 1.30,
      pressureEMW: 1.25,
      inclination: 28.0,
      spudDate: '2021-12-02',
      operator: 'National Petroleum Co.',
      field: 'Jaisalmer North Basin',
      rig: 'Rig 01',
      bha: '8-1/2" PDC + Agitator',
      demo: true,
      similarityScore: 64,
      similarityFactors: {
        geology: 66,
        formationSeq: 64,
        depthProfile: 62,
        pressureRegime: 60,
        mudProgram: 62,
        trajectory: 55,
        geographic: 58
      },
      keyIncidents: [
        { type: 'Torque / drag', depth: 2210, desc: 'Stick-slip torsional vibration exceeding 26 kN·m.' }
      ]
    }
  ];

  const reports = [
    {
      id: 'demo-b04-day14',
      name: 'B-04 — Daily Drilling Report Day 14 (Stuck Pipe Pack-off)',
      well: 'B-04',
      date: '2024-03-24',
      demo: true,
      format: 'PDF',
      extraction: 'text layer',
      author: 'K. Sharma (Drilling Supervisor)',
      text: `DAILY DRILLING REPORT — WELL B-04
Date: 2024-03-24 | 24-hr Summary | Section: 8-1/2" Hole | Formation: Lower Reactive Shale
06:00 - 12:00: Drilling 8-1/2" hole from 2010 m to 2018 m with 8-1/2" PDC bit, WOB 14 t, RPM 120, Flow 1520 L/min, SPP 220 bar.
12:00 - 14:00: At 2018 m depth, elevated torque recorded with erratic swings from 16 kN·m up to 28 kN·m. ROP decreased from 22 m/h to 11 m/h.
14:00 - 16:30: Continued drilling to 2052 m while attempting to control torque by reducing WOB. Shakers reported heavy volume of sticky, reactive shale cavings.
16:45: At 2052 m depth, severe stuck pipe occurred with sudden loss of rotation and restricted circulation (SPP spiked to 260 bar at 400 L/min).
17:00 - 22:00: Jarred down with 80 t overpull using hydraulic drilling jar. Spotted 30 bbl pipe-lax lubricant pill around BHA.
22:30: Worked drillstring free after 4.5 hours jarring. Pumped 20 bbl high-viscosity sweep to clear cuttings bed. Conditioned mud weight to 1.24 SG with shale inhibitor before resuming operations.`
    },
    {
      id: 'demo-b04-day11',
      name: 'B-04 — Daily Drilling Report Day 11 (Mud Losses in Sand)',
      well: 'B-04',
      date: '2024-03-21',
      demo: true,
      format: 'TXT',
      extraction: 'plain text',
      author: 'K. Sharma (Drilling Supervisor)',
      text: `DAILY DRILLING REPORT — WELL B-04
Date: 2024-03-21 | Section: 8-1/2" Hole | Formation: Jodhpur Sandstone
04:00 - 10:00: Drilling from 1800 m to 1815 m in permeable sandstone interval.
10:15: At 1815 m depth, partial mud losses were observed at 24 bbl/hr.
11:00: Pumped 25 bbl medium-grade LCM (Lost Circulation Material) pill containing calcium carbonate and nut plug.
12:30: Losses mitigated to seepage level (4 bbl/hr). Resumed drilling at 1840 m with controlled flow rate.
At 1840 m depth, elevated torque was recorded while reaming tight spot.`
    },
    {
      id: 'demo-c11-day18',
      name: 'C-11 — Daily Drilling Report Day 18 (Differential Sticking)',
      well: 'C-11',
      date: '2024-09-23',
      demo: true,
      format: 'PDF',
      extraction: 'text layer',
      author: 'V. Patel (Operations Geologist)',
      text: `DAILY DRILLING REPORT — WELL C-11
Date: 2024-09-23 | Section: 8-1/2" Hole | Formation: Lower Reactive Shale
08:00 - 13:00: Drilling from 1950 m to 1972 m in upper transition zone.
At 1972 m depth, partial mud losses were observed at 35 bbl/hr in micro-fractured sand interbed. Reduced pump rate to 1350 L/min and pumped fibrous LCM pill.
15:00: Resumed drilling to 2045 m. Mud weight maintained at 1.24 SG.
17:30: Stopped rotation at 2045 m depth for 45 minutes to conduct MWD directional survey.
18:15: Attempted to resume rotation and reciprocation; pipe was stuck pipe due to differential sticking across depleted sandstone stringer with 18 bar overbalance.
20:00: Applied 60 t overpull without movement. Pumped 40 bbl diesel/surfactant freeing pill to soak for 2 hours. String came free at 22:30 with 45 t tension.`
    },
    {
      id: 'demo-d09-day22',
      name: 'D-09 — Daily Drilling Report Day 22 (Overpressure Kick & Instability)',
      well: 'D-09',
      date: '2023-12-07',
      demo: true,
      format: 'PDF',
      extraction: 'text layer',
      author: 'R. Choudhury (Company Man)',
      text: `DAILY DRILLING REPORT — WELL D-09
Date: 2023-12-07 | Section: 8-1/2" Hole | Formation: Lower Reactive Shale / Basal Sandstone
02:00 - 08:00: Drilling from 2060 m to 2080 m in high-stress shale zone.
At 2080 m depth, severe wellbore instability and tight hole were recorded with torque fluctuations up to 26 kN·m and heavy cavings on shakers.
08:30: Conducted short trip to 9-5/8" casing shoe to ream tight hole.
14:00 - 18:00: Resumed drilling from 2080 m to 2105 m.
18:20: At 2105 m depth, observed drilling break (ROP jumped from 14 m/h to 36 m/h) followed by 12 bbl pit gain and gas influx peak at 6.8%.
18:35: Well shut in on annular preventer. Shut-in drillpipe pressure (SIDPP): 18 bar. Shut-in casing pressure (SICP): 32 bar.
19:00 - 23:30: Killed well using Wait and Weight method, weighting up mud system from 1.28 SG to 1.34 SG. Gas circulated out safely through poorboy degasser.`
    },
    {
      id: 'demo-b09-day16',
      name: 'B-09 — Daily Drilling Report Day 16 (Losses and Gas Kick)',
      well: 'B-09',
      date: '2025-02-05',
      demo: true,
      format: 'TXT',
      extraction: 'plain text',
      author: 'A. Joshi (Rig Superintendent)',
      text: `DAILY DRILLING REPORT — WELL B-09
Date: 2025-02-05 | Section: 8-1/2" Hole | Formation: Jodhpur Sandstone
04:00 - 10:00: Drilling at 1860 m depth where partial mud losses of 20 bbl/hr were recorded into fractured sand.
Poured mica and fine walnut shells to seal permeable zone.
14:00 - 18:00: Drilling ahead to 1920 m depth.
18:40: At 1920 m depth, a pressure kick was reported following 4 bbl pit volume gain and gas influx reading 4.5%.
Shut in well and circulated out gas bubble using Driller's method. Adjusted mud weight from 1.20 SG to 1.23 SG.`
    },
    {
      id: 'demo-d11-day19',
      name: 'D-11 — Daily Drilling Report Day 19 (Cementing and Sticking)',
      well: 'D-11',
      date: '2023-06-06',
      demo: true,
      format: 'TXT',
      extraction: 'plain text',
      author: 'M. Deshmukh (Drilling Engineer)',
      text: `DAILY DRILLING REPORT — WELL D-11
Date: 2023-06-06 | Section: 12-1/4" and 8-1/2" Hole | Formation: Jodhpur Sandstone
At 1684 m depth, cementing losses were recorded during 9-5/8" intermediate casing job, losing 65 bbl slurry to formation.
Performed top remedial cement job through 1" tremie line to bring top of cement to surface.
Later while drilling 8-1/2" hole at 1784 m depth, stuck pipe was recorded during connection due to key seating and cuttings accumulation.
Freed drillpipe after 2 hours working torque and jars.`
    },
    {
      id: 'demo-f15-day12',
      name: 'F-15 — Daily Drilling Report Day 12 (Gas Influx & Reaming Torque)',
      well: 'F-15',
      date: '2026-07-13',
      demo: true,
      format: 'PDF',
      extraction: 'text layer',
      author: 'S. Banerjee (Drilling Engineer)',
      text: `DAILY DRILLING REPORT — WELL F-15
Date: 2026-07-13 | Section: 8-1/2" Hole | Formation: Lower Reactive Shale
At 1940 m depth, gas influx occurred with trip gas peaking at 4.2% while making a bit connection. Circulated bottoms up through choke manifold.
At 2025 m depth, severe torque spike was recorded during back-reaming tight hole, reaching 25 kN·m before stalling the top drive.
Conditioned mud with lubricant and shale stabilizer to improve hole gauge.`
    },
    {
      id: 'demo-c02-day25',
      name: 'C-02 — End of Section Summary (Cementing Integrity)',
      well: 'C-02',
      date: '2022-09-08',
      demo: true,
      format: 'PDF',
      extraction: 'text layer',
      author: 'H. Singhania (Lead Geologist)',
      text: `END OF SECTION REPORT — WELL C-02
Date: 2022-09-08 | Section: 7" Liner | Formation: Lower Jodhpur
At 2140 m depth, cementing losses and subsequent micro-annular channeling occurred on 7" liner cement job. Cement bond log (CBL) showed poor bonding across lower 80 m.
Required squeeze cementing to achieve zonal isolation.
At 2164 m depth, elevated torque and high drag were observed when reaming hole before logging.`
    },
    {
      id: 'demo-e02-day30',
      name: 'E-02 — Deep Section Drilling Review (Basement Vibration)',
      well: 'E-02',
      date: '2022-01-02',
      demo: true,
      format: 'TXT',
      extraction: 'plain text',
      author: 'P. Nair (Superintendent)',
      text: `OPERATIONAL SUMMARY — WELL E-02
Date: 2022-01-02 | Section: 6" Hole | Formation: Basement Gneiss
At 2210 m depth, excessive torque fluctuations up to 26 kN·m and severe torsional drillstring vibrations were recorded in cherty interbeds.
Reduced RPM to 80 and adjusted WOB to suppress stick-slip.`
    }
  ];

  const incidents = [
    {
      id: 'inc-b04-1',
      well: 'B-04',
      depth: 2052,
      formation: 'Lower Reactive Shale',
      type: 'Stuck pipe',
      severity: 'Critical',
      cause: 'Mechanical cuttings pack-off in reactive shale; torque climbed to 28 kN·m before complete rotation freeze.',
      actionTaken: 'Jarred down with 80 t overpull; spotted 30 bbl pipe-lax lubricant pill; pumped 20 bbl high-vis sweep.',
      outcome: 'Freed string after 4.5 hours jarring. Increased mud weight to 1.24 SG with glycol shale inhibitor.',
      report: 'demo-b04-day14',
      reportName: 'B-04 — Daily Drilling Report Day 14',
      line: 7,
      excerpt: 'At 2052 m depth, severe stuck pipe occurred with sudden loss of rotation and restricted circulation.',
      reviewed: true,
      note: 'Prime analogue for A-17 upcoming interval at 2,040 m. Reactive shale swelling matches lithology.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-b04-2',
      well: 'B-04',
      depth: 2018,
      formation: 'Lower Reactive Shale',
      type: 'Torque / drag',
      severity: 'High',
      cause: 'Erratic torque swings up to 28 kN·m due to borehole swelling and under-gauge hole.',
      actionTaken: 'Reduced WOB from 14 t to 8 t; increased circulation rate to 1,600 L/min.',
      outcome: 'Torque temporarily reduced but led to subsequent pack-off at 2,052 m due to inadequate mud inhibition.',
      report: 'demo-b04-day14',
      reportName: 'B-04 — Daily Drilling Report Day 14',
      line: 4,
      excerpt: 'At 2018 m depth, elevated torque recorded with erratic swings from 16 kN·m up to 28 kN·m.',
      reviewed: true,
      note: 'Precursor warning sign before stuck pipe. Monitor A-17 torque baseline closely.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-b04-3',
      well: 'B-04',
      depth: 1815,
      formation: 'Jodhpur Sandstone',
      type: 'Mud loss',
      severity: 'Medium',
      cause: 'High permeability zone in clean quartz sand interval; pore pressure 1.14 vs mud weight 1.20 SG.',
      actionTaken: 'Pumped 25 bbl medium-grade LCM pill (calcium carbonate + nut plug).',
      outcome: 'Seepage stabilized at 4 bbl/hr. Continued drilling.',
      report: 'demo-b04-day11',
      reportName: 'B-04 — Daily Drilling Report Day 11',
      line: 4,
      excerpt: 'At 1815 m depth, partial mud losses were observed at 24 bbl/hr.',
      reviewed: true,
      note: 'Corresponds to A-17 current reservoir interval; watch pit volume when passing 1,860 m.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-b04-4',
      well: 'B-04',
      depth: 1840,
      formation: 'Jodhpur Sandstone',
      type: 'Torque / drag',
      severity: 'Medium',
      cause: 'Ledge and tight hole in sandstone during reaming.',
      actionTaken: 'Reamed slowly with 60 RPM and low pump rate.',
      outcome: 'Ledge reamed cleanly.',
      report: 'demo-b04-day11',
      reportName: 'B-04 — Daily Drilling Report Day 11',
      line: 7,
      excerpt: 'At 1840 m depth, elevated torque was recorded while reaming tight spot.',
      reviewed: true,
      note: 'Near A-17 current depth (1,842 m). Confirms lithology boundaries.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-c11-1',
      well: 'C-11',
      depth: 2045,
      formation: 'Lower Reactive Shale',
      type: 'Stuck pipe',
      severity: 'Critical',
      cause: 'Differential sticking across permeable depleted stringer with 18 bar overbalance during 45 min static survey.',
      actionTaken: 'Applied 60 t overpull, pumped 40 bbl diesel/surfactant freeing pill.',
      outcome: 'Pipe freed after 2.5 hours soak. Operational guideline instituted: maximum static survey time 15 min.',
      report: 'demo-c11-day18',
      reportName: 'C-11 — Daily Drilling Report Day 18',
      line: 8,
      excerpt: 'Attempted to resume rotation and reciprocation; pipe was stuck pipe due to differential sticking across depleted sandstone stringer with 18 bar overbalance.',
      reviewed: true,
      note: 'Do not allow drillstring to remain stationary in Lower Shale / sand stringers for > 15 mins.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-c11-2',
      well: 'C-11',
      depth: 1972,
      formation: 'Lower Reactive Shale',
      type: 'Mud loss',
      severity: 'High',
      cause: 'Micro-fractures at top of reactive shale boundary under hydrostatic overbalance.',
      actionTaken: 'Reduced pump rate to 1,350 L/min, pumped fibrous LCM pill.',
      outcome: 'Losses reduced from 35 bbl/hr to zero.',
      report: 'demo-c11-day18',
      reportName: 'C-11 — Daily Drilling Report Day 18',
      line: 4,
      excerpt: 'At 1972 m depth, partial mud losses were observed at 35 bbl/hr in micro-fractured sand interbed.',
      reviewed: true,
      note: 'Top of Lower Reactive Shale boundary loss watch (+130 m ahead of A-17).',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-d09-1',
      well: 'D-09',
      depth: 2105,
      formation: 'Lower Reactive Shale / Basal Sandstone',
      type: 'Pressure anomaly',
      severity: 'Critical',
      cause: 'Overpressure gas sand stringer; pore pressure 1.30 EMW exceeding active 1.28 SG mud weight.',
      actionTaken: 'Shut in well on annular preventer (SIDPP 18 bar, SICP 32 bar); executed Wait & Weight kill with 1.34 SG mud.',
      outcome: 'Gas kick killed safely through degasser. Tripping procedures updated.',
      report: 'demo-d09-day22',
      reportName: 'D-09 — Daily Drilling Report Day 22',
      line: 8,
      excerpt: 'At 2105 m depth, observed drilling break (ROP jumped from 14 m/h to 36 m/h) followed by 12 bbl pit gain and gas influx peak at 6.8%.',
      reviewed: true,
      note: 'Critical overpressure analogue. A-17 look-ahead predicts pressure anomaly at +263 m.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-d09-2',
      well: 'D-09',
      depth: 2080,
      formation: 'Lower Reactive Shale',
      type: 'Torque / drag',
      severity: 'High',
      cause: 'Wellbore breakout and borehole instability in high-stress shale.',
      actionTaken: 'Conducted wiper trip to 9-5/8" casing shoe to clear cavings.',
      outcome: 'Hole cleared but required continuous high-viscosity sweeps.',
      report: 'demo-d09-day22',
      reportName: 'D-09 — Daily Drilling Report Day 22',
      line: 4,
      excerpt: 'At 2080 m depth, severe wellbore instability and tight hole were recorded with torque fluctuations up to 26 kN·m and heavy cavings on shakers.',
      reviewed: true,
      note: 'Demonstrates tectonic stress direction in basin. Keep hole clean.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-b09-1',
      well: 'B-09',
      depth: 1860,
      formation: 'Jodhpur Sandstone',
      type: 'Mud loss',
      severity: 'Medium',
      cause: 'Fractured sand interbed; seepage losses 20 bbl/hr.',
      actionTaken: 'Spotted mica and walnut shell pill.',
      outcome: 'Losses stopped.',
      report: 'demo-b09-day16',
      reportName: 'B-09 — Daily Drilling Report Day 16',
      line: 3,
      excerpt: 'Drilling at 1860 m depth where partial mud losses of 20 bbl/hr were recorded into fractured sand.',
      reviewed: false,
      note: 'A-17 will reach this interval (+18 m). Mud loss watch active.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-b09-2',
      well: 'B-09',
      depth: 1920,
      formation: 'Jodhpur Sandstone',
      type: 'Pressure anomaly',
      severity: 'High',
      cause: 'Gas influx 4.5% during connection.',
      actionTaken: 'Circulated out gas bubble using Driller\'s method; weighted mud to 1.23 SG.',
      outcome: 'Circulated clean. Resumed drilling.',
      report: 'demo-b09-day16',
      reportName: 'B-09 — Daily Drilling Report Day 16',
      line: 6,
      excerpt: 'At 1920 m depth, a pressure kick was reported following 4 bbl pit volume gain and gas influx reading 4.5%.',
      reviewed: false,
      note: 'Corresponds to +78 m look-ahead horizon in A-17.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-d11-1',
      well: 'D-11',
      depth: 1684,
      formation: 'Jodhpur Sandstone',
      type: 'Cementing',
      severity: 'High',
      cause: 'Slurry loss to formation during 9-5/8" casing cement job.',
      actionTaken: 'Remedial top job with 1" tremie line.',
      outcome: 'TOC established at surface after 2 top jobs.',
      report: 'demo-d11-day19',
      reportName: 'D-11 — Daily Drilling Report Day 19',
      line: 3,
      excerpt: 'At 1684 m depth, cementing losses were recorded during 9-5/8" intermediate casing job, losing 65 bbl slurry to formation.',
      reviewed: true,
      note: 'Check A-17 shoe integrity before drilling ahead.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-d11-2',
      well: 'D-11',
      depth: 1784,
      formation: 'Jodhpur Sandstone',
      type: 'Stuck pipe',
      severity: 'High',
      cause: 'Mechanical sticking due to key seat and poor cuttings transport.',
      actionTaken: 'Jarred for 2 hours with torque.',
      outcome: 'Freed string; reamed key seat.',
      report: 'demo-d11-day19',
      reportName: 'D-11 — Daily Drilling Report Day 19',
      line: 6,
      excerpt: 'Later while drilling 8-1/2" hole at 1784 m depth, stuck pipe was recorded during connection due to key seating and cuttings accumulation.',
      reviewed: true,
      note: 'Mechanical stuck pipe analogue.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-f15-1',
      well: 'F-15',
      depth: 1940,
      formation: 'Lower Reactive Shale',
      type: 'Pressure anomaly',
      severity: 'Medium',
      cause: 'Trip gas peak of 4.2% on connection.',
      actionTaken: 'Bottoms-up circulation via choke.',
      outcome: 'Background gas returned to 0.8%.',
      report: 'demo-f15-day12',
      reportName: 'F-15 — Daily Drilling Report Day 12',
      line: 3,
      excerpt: 'At 1940 m depth, gas influx occurred with trip gas peaking at 4.2% while making a bit connection.',
      reviewed: false,
      note: 'Gas influx in transition interval.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-f15-2',
      well: 'F-15',
      depth: 2025,
      formation: 'Lower Reactive Shale',
      type: 'Torque / drag',
      severity: 'High',
      cause: 'Back-reaming tight hole reaching 25 kN·m stall.',
      actionTaken: 'Spotted lubricant and conditioned with shale inhibitor.',
      outcome: 'Torque stabilized to 17 kN·m.',
      report: 'demo-f15-day12',
      reportName: 'F-15 — Daily Drilling Report Day 12',
      line: 4,
      excerpt: 'At 2025 m depth, severe torque spike was recorded during back-reaming tight hole, reaching 25 kN·m before stalling the top drive.',
      reviewed: false,
      note: 'Matches B-04 torque rise prior to stuck pipe.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-c02-1',
      well: 'C-02',
      depth: 2140,
      formation: 'Lower Jodhpur',
      type: 'Cementing',
      severity: 'High',
      cause: 'Cement channeling and micro-annulus on 7" liner.',
      actionTaken: 'Perforated and squeezed 45 sacks cement.',
      outcome: 'Pressure tested liner top to 210 bar.',
      report: 'demo-c02-day25',
      reportName: 'C-02 — End of Section Summary',
      line: 3,
      excerpt: 'At 2140 m depth, cementing losses and subsequent micro-annular channeling occurred on 7" liner cement job.',
      reviewed: false,
      note: 'Cementing complication risk in deep liner.',
      excluded: false,
      demo: true
    },
    {
      id: 'inc-e02-1',
      well: 'E-02',
      depth: 2210,
      formation: 'Basement Gneiss',
      type: 'Torque / drag',
      severity: 'Medium',
      cause: 'Torsional stick-slip vibration in chert beds.',
      actionTaken: 'Adjusted RPM and WOB setpoints.',
      outcome: 'Vibrations dampened.',
      report: 'demo-e02-day30',
      reportName: 'E-02 — Deep Section Drilling Review',
      line: 3,
      excerpt: 'At 2210 m depth, excessive torque fluctuations up to 26 kN·m and severe torsional drillstring vibrations were recorded in cherty interbeds.',
      reviewed: false,
      note: 'Deep hard stringer drilling.',
      excluded: false,
      demo: true
    }
  ];

  const operationalEvents = [
    { time: '21:42:15', type: 'baseline', message: 'Torque exceeded rolling baseline (+18%, 15.4 → 21.8 kN·m)', level: 'warning' },
    { time: '21:43:02', type: 'telemetry', message: 'Standpipe pressure trend detected (+11%, 215 → 242 bar)', level: 'warning' },
    { time: '21:43:55', type: 'rate', message: 'ROP decreased from 24.2 to 14.8 m/h (-39%) with constant WOB', level: 'warning' },
    { time: '21:44:30', type: 'correlation', message: 'Look-Ahead pattern correlation detected: Stratigraphic match with 15/9-19 A at 2,052 m', level: 'info' },
    { time: '21:45:10', type: 'risk', message: 'Offset stuck-pipe analogue detected in 300m look-ahead window (Horizon: +198 m)', level: 'warning' },
    { time: '21:46:00', type: 'alert', message: 'STUCK-PIPE OFFSET MATCH [CRITICAL LOOK-AHEAD] — Historical offset practice cited', level: 'critical' },
    { time: '21:47:15', type: 'user', message: 'Engineer opened Explainable Alert Drawer for Stuck-Pipe Offset Evidence', level: 'info' },
    { time: '21:48:05', type: 'action', message: 'Historical offset practice acknowledged: Condition mud with KCl/glycol & adjust circulation', level: 'info' },
    { time: '21:49:12', type: 'simulation', message: 'Mitigation applied to simulation — Drilling dynamics adjusting parameters', level: 'success' },
    { time: '21:50:00', type: 'recovery', message: 'Torque stabilizing (18.2 kN·m); SPP normalizing (226 bar); ROP recovering (20.5 m/h)', level: 'success' },
    { time: '21:51:20', type: 'mitigated', message: 'Offset risk cleared: Interval passed safely through reactive formation [NORMALIZED]', level: 'success' }
  ];

  const comparisonMatrix = {
    wells: ['15/9-F-12 (Active Replay)', '15/9-F-15 (Offset Stuck-Pipe Analog)', '15/9-F-14 (Offset Loss Analog)'],
    parameters: [
      { name: 'Formation at Target', a17: 'Lower Hordaland Reactive Shale (1,975 - 2,220 m)', b04: 'Lower Hordaland Reactive Shale (1,970 - 2,215 m)', c11: 'Lower Hordaland Reactive Shale (1,980 - 2,225 m)', f12: 'Lower Hordaland Reactive Shale (1,975 - 2,220 m)', f15: 'Lower Hordaland Reactive Shale (1,970 - 2,215 m)', f14: 'Lower Hordaland Reactive Shale (1,980 - 2,225 m)' },
      { name: 'Current / Target Depth', a17: '1,842.5 m / 3,520 m TD', b04: '4,105 m TD (Completed)', c11: '3,750 m TD (Completed)', f12: '1,842.5 m / 3,520 m TD', f15: '4,105 m TD (Completed)', f14: '3,750 m TD (Completed)' },
      { name: 'Wellbore Trajectory', a17: 'Directional Production (14.2° Max)', b04: 'Deep Observation / Production (22.5°)', c11: 'Production Well (18.1° Inclination)', f12: 'Directional Production (14.2° Max)', f15: 'Deep Observation / Production (22.5°)', f14: 'Production Well (18.1° Inclination)' },
      { name: 'Mud Program & Chemistry', a17: '1.28 SG WBM (Inhibited Glycol/KCl)', b04: '1.24 SG WBM → Weighted to 1.30 SG post-packoff', c11: '1.26 SG Inhibited Polymer Fluid', f12: '1.28 SG WBM (Inhibited Glycol/KCl)', f15: '1.24 SG WBM → Weighted to 1.30 SG post-packoff', f14: '1.26 SG Inhibited Polymer Fluid' },
      { name: 'Pore Pressure Regime', a17: '1.14 EMW (transitioning to 1.28 EMW)', b04: '1.16 EMW at 2,000 m (1.28 EMW in shale)', c11: '1.18 EMW (1.27 EMW in shale)', f12: '1.14 EMW (transitioning to 1.28 EMW)', f15: '1.16 EMW at 2,000 m (1.28 EMW in shale)', f14: '1.18 EMW (1.27 EMW in shale)' },
      { name: 'Intermediate Casing Shoe', a17: '2,420 m (9-5/8" casing)', b04: '2,445 m (9-5/8" casing)', c11: '2,410 m (9-5/8" casing)', f12: '2,420 m (9-5/8" casing)', f15: '2,445 m (9-5/8" casing)', f14: '2,410 m (9-5/8" casing)' },
      { name: 'Key Historical Incidents', a17: 'None to date (Replay streaming baseline)', b04: 'Severe stuck pipe pack-off at 2,052 m (4.5 hrs jarring with 80 t overpull)', c11: '35 bbl/hr partial mud losses at 1,972 m in upper transition zone', f12: 'None to date (Replay streaming baseline)', f15: 'Severe stuck pipe pack-off at 2,052 m (4.5 hrs jarring with 80 t overpull)', f14: '35 bbl/hr partial mud losses at 1,972 m in upper transition zone' },
      { name: 'ROP Behavior in Shale', a17: 'Projected 10 - 15 m/h', b04: 'Dropped from 22 to 8 m/h with high torque', c11: 'Maintained 14 - 18 m/h with RSS & inhibitor', f12: 'Projected 10 - 15 m/h', f15: 'Dropped from 22 to 8 m/h with high torque', f14: 'Maintained 14 - 18 m/h with RSS & inhibitor' },
      { name: 'Torque Behavior', a17: 'Baseline 12.8 kN·m (Warning at 18.0 kN·m)', b04: 'Climbed 14 → 28 kN·m before pack-off', c11: 'Steady 13 - 16 kN·m with high circulation', f12: 'Baseline 12.8 kN·m (Warning at 18.0 kN·m)', f15: 'Climbed 14 → 28 kN·m before pack-off', f14: 'Steady 13 - 16 kN·m with high circulation' },
      { name: 'Key Operational Lessons', a17: 'Condition mud with 3-5% KCl and glycol before 1,975 m', b04: 'Inadequate inhibition caused reactive shale swelling; required 80 t overpull jarring', c11: 'Keep drillstring rotating; maintain 3,200 L/min annular velocity', f12: 'Condition mud with 3-5% KCl and glycol before 1,975 m', f15: 'Inadequate inhibition caused reactive shale swelling; required 80 t overpull jarring', f14: 'Keep drillstring rotating; maintain 3,200 L/min annular velocity' }
    ]
  };

  function getPreFormationBrief(wellId = '15/9-F-12', targetFormation = 'Lower Hordaland Reactive Shale') {
    const curDepth = (typeof window !== 'undefined' && window.VolveEngine && window.VolveEngine.getCurrentSample()) ? window.VolveEngine.getCurrentSample().measuredDepth : 1842.5;
    return {
      title: `PRE-FORMATION DRILLING BRIEF: ${targetFormation}`,
      activeWell: wellId,
      currentDepth: curDepth,
      targetFormation: targetFormation,
      expectedEntryDepth: 1975.0,
      distanceToEntry: Math.max(0, Math.round((1975.0 - curDepth) * 10) / 10),
      currentPorePressure: '1.14 EMW',
      expectedPorePressure: '1.28 EMW (+0.14 SG Increase)',
      hazardLevel: 'CRITICAL / HIGH RISK INTERVAL',
      keyAnticipatedRisks: [
        { type: 'Stuck pipe (Mechanical Pack-off)', probability: '72%', confidence: '88%', severity: 'Critical', detail: 'Reactive smectite shale swelling and borehole breakout leading to drillstring pack-off and circulation loss.' },
        { type: 'Torque Spikes & Drag Buildup', probability: '65%', confidence: '84%', severity: 'High', detail: 'Erratic torque fluctuations exceeding 25 kN·m as seen in offset 15/9-F-15.' },
        { type: 'Borehole Breakout & Cavings', probability: '58%', confidence: '81%', severity: 'High', detail: 'High tectonic stress regime causing shale spalling and shaker blinding.' },
        { type: 'Overpressured Gas Micro-kicks', probability: '44%', confidence: '79%', severity: 'Medium', detail: 'Isolated thin overpressured sand stringers with gas influx.' }
      ],
      mostSimilarOffsetWells: [
        { id: '15/9-F-15', similarity: '92%', distance: '4.1 m (Cluster)', primaryEvent: 'Stuck pipe pack-off at 2,052 m (4.5 hrs jarring with 80 t overpull)', keyLesson: 'Condition mud with shale inhibitor before drilling past 1,975 m.' },
        { id: '15/9-F-14', similarity: '88%', distance: '8.2 m (Cluster)', primaryEvent: '35 bbl/hr partial mud losses at 1,972 m in upper transition zone', keyLesson: 'Monitor ECD closely and stage circulation rates.' },
        { id: '15/9-F-11', similarity: '85%', distance: '6.7 m (Cluster)', primaryEvent: 'Severe wellbore instability, tight hole and high drag at 2,080 m', keyLesson: 'Perform regular short wiper trips.' }
      ],
      historicalEventsInInterval: [
        '15/9-F-15: Severe stuck pipe at 2,052 m (packed off with reactive shale cavings; jarred free with 80 t overpull).',
        '15/9-F-15: Torque climbed to 28 kN·m at 2,018 m prior to mechanical sticking.',
        '15/9-F-14: 35 bbl/hr partial mud losses at 1,972 m in upper transition zone.',
        '15/9-F-11: Excessive shale breakout cavings on shakers at 2,080 m.'
      ],
      recommendedRealTimeMonitoring: [
        { parameter: 'Torque Rolling Baseline', threshold: '+15% above 12.8 kN·m (Warning at 15.5 kN·m)', action: 'Reduce WOB by 15%, pump 20 bbl high-vis sweep.' },
        { parameter: 'Standpipe Pressure (SPP)', threshold: '+10% above 1315 psi with stable flow', action: 'Check for cuttings pack-off; verify shaker return rate.' },
        { parameter: 'Rate of Penetration (ROP)', threshold: 'Drilling break > 25 m/h OR decrease < 8 m/h', action: 'Perform 10-minute flow check for influx or bit balling.' },
        { parameter: 'Hook Load Overpull', threshold: '> 25 klbs over normal string weight on connections', action: 'Wipe interval immediately; do not drill ahead with high drag.' },
        { parameter: 'Shaker Cavings Inspection', threshold: 'Appearance of tabular or splintery shale cavings', action: 'Increase mud weight by 0.03 SG to stabilize wellbore.' }
      ],
      preventiveMitigations: [
        '1. Treat active drilling fluid with 3-5% KCl and 2% polyglycol shale inhibitor prior to 1,975 m.',
        '2. Maintain high annular velocity: target flow rate 3,500 L/min to prevent cuttings bed accumulation.',
        '3. Limit static connection and survey time to maximum 12 minutes to eliminate differential sticking risk.',
        '4. Have 40 bbl weighted high-viscosity pill mixed and ready in reserve pit.',
        '5. Test hydraulic jars prior to entering interval; verify trip-out hook load limits with Rig Superintendent.'
      ],
      disclaimer: 'Decision-support intelligence only. Final operational parameters and field decisions remain strictly under the authority of the qualified Drilling Superintendent and Company Representative.'
    };
  }

  function seedRich(){
    const v = (typeof window !== 'undefined' && window.VOLVE_DATA) ? window.VOLVE_DATA : null;
    const formList = (v && v.formations && v.formations.length) ? v.formations : formations;
    const wellList = (v && v.wells && v.wells.length) ? v.wells.map(w => ({
      ...w,
      formation: w.formation || (w.id === '15/9-F-12' ? 'Upper Hordaland Shale' : 'Lower Hordaland Reactive Shale'),
      depthType: 'MD',
      demo: false,
      provenance: w.provenance || 'REAL',
      dataset: w.dataset || 'VOLVE_PUBLIC',
      active: w.id === '15/9-F-12' || w.isActive || false
    })) : wells.map(w => ({ ...w, provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO', demo: true }));
    const repList = (v && v.reports && v.reports.length) ? v.reports : reports.map(r => ({ ...r, provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO', demo: true }));
    const incList = (v && v.incidents && v.incidents.length) ? v.incidents : incidents.map(i => ({ ...i, provenance: 'SYNTHETIC', dataset: 'SYNTHETIC_DEMO', demo: true, reviewed: false, excluded: false }));

    // Ensure fallback aliases A-17, B-04, C-11 exist for backwards compatibility with synthetic demo
    const activeObj = wellList.find(w => w.active || w.id === '15/9-F-12') || wellList[0];
    const enrichedWells = [...wellList];
    if (!enrichedWells.some(w => w.id === 'A-17')) {
      enrichedWells.push({ ...activeObj, id: 'A-17', name: '15/9-F-12 (Active Replay Well)', demo: false, provenance: 'REAL', dataset: 'VOLVE_PUBLIC' });
    }
    if (!enrichedWells.some(w => w.id === 'B-04')) {
      const f15 = wellList.find(w => w.id === '15/9-F-15') || wellList[1];
      if (f15) enrichedWells.push({ ...f15, id: 'B-04', name: '15/9-F-15 (Offset Well - 92% Match)', demo: false, provenance: 'REAL', dataset: 'VOLVE_PUBLIC' });
    }
    if (!enrichedWells.some(w => w.id === 'C-11')) {
      const f14 = wellList.find(w => w.id === '15/9-F-14') || wellList[2];
      if (f14) enrichedWells.push({ ...f14, id: 'C-11', name: '15/9-F-14 (Offset Well - 88% Match)', demo: false, provenance: 'REAL', dataset: 'VOLVE_PUBLIC' });
    }

    const currentDepth = (v && v.telemetry && v.telemetry[0] && v.telemetry[0].measuredDepth) || 1842.49;
    const activeWellState = {
      wellId: activeObj.id || '15/9-F-12',
      wellName: activeObj.name || '15/9-F-12 (Volve Active)',
      wellboreId: activeObj.wellbore || ((activeObj.id || '15/9-F-12') + ' Main'),
      currentDepth: currentDepth,
      depthBasis: 'MD',
      formation: activeObj.formation || 'Upper Hordaland Shale',
      dataset: activeObj.dataset || ((v && v.metadata) ? 'VOLVE_PUBLIC' : 'SYNTHETIC_DEMO'),
      provenance: activeObj.provenance || ((v && v.metadata) ? 'REAL' : 'SYNTHETIC')
    };

    return {
      version: 2,
      active: activeObj.id || '15/9-F-12',
      activeWellState: activeWellState,
      depth: currentDepth,
      targetDepth: activeObj.totalDepth || 3520.0,
      depthType: 'MD',
      radius: 10,
      window: 250,
      same: false,
      formations: formList,
      wells: enrichedWells,
      reports: repList,
      incidents: incList,
      events: operationalEvents,
      comparisonMatrix: comparisonMatrix,
      dataset: (v && v.metadata) ? 'VOLVE_PUBLIC' : 'SYNTHETIC_DEMO',
      provenance: (v && v.metadata) ? 'REAL' : 'SYNTHETIC',
      metadata: (v && v.metadata) || { datasetName: 'NWIS Synthetic Operational Fixture', well: activeObj.id || 'A-17' }
    };
  }

  const api = {
    PROVENANCE,
    getProvenanceLabel,
    renderProvenanceBadge,
    formations,
    wells,
    reports,
    incidents,
    operationalEvents,
    comparisonMatrix,
    getPreFormationBrief,
    seedRich
  };

  root.NWISProvenance = { PROVENANCE, getProvenanceLabel, renderProvenanceBadge };
  root.NWISData = api;
  root.NWIS_DATA = api;

  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);


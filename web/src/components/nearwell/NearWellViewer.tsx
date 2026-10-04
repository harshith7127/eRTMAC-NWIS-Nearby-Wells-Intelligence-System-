/**
 * NearWellViewer — ResInsight-inspired Near-Well 3D Detailed Borehole Inspection
 * 
 * Provides high-density well-centric 3D visualization:
 * - High-resolution wellbore cylinder trajectory
 * - Casing strings with casing shoes (30", 20", 13-3/8", 9-5/8")
 * - Formation tops & lithology slice rings along borehole wall
 * - Jurassic Hugin reservoir body intersection
 * - Mud log shows & gas detection flags
 * - Active synchronized depth indicator ring
 * - Offset well trajectories with closest approach distance indicators
 * - Orbit, pan, zoom, and focus controls
 * - Deterministic Three.js WebGL resource cleanup on unmount
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useSelectionStore } from '../../store/useSelectionStore';
import { api } from '../../api/client';
import { Compass, RotateCcw, Crosshair, HelpCircle } from 'lucide-react';

interface NearWellViewerProps {
  wellId?: string;
}

// Well Survey & Casing Geometry Data
const WELL_GEOMETRY_DATA: Record<string, {
  stations: Array<{ md: number; tvd: number; dx: number; dy: number }>;
  casings: Array<{ name: string; size: string; depth_md: number; depth_tvd: number }>;
  perforations: Array<{ top_md: number; base_md: number }>;
  mud_shows: Array<{ md: number; type: string; gas_ppm: number; description: string }>;
}> = {
  '15/9-F-12': {
    stations: [
      { md: 0, tvd: 0, dx: 0, dy: 0 },
      { md: 500, tvd: 499, dx: 15, dy: -30 },
      { md: 1050, tvd: 1045, dx: 45, dy: -90 },
      { md: 1500, tvd: 1480, dx: 110, dy: -210 },
      { md: 1975, tvd: 1920, dx: 220, dy: -380 },
      { md: 2480, tvd: 2360, dx: 360, dy: -590 },
      { md: 2960, tvd: 2750, dx: 520, dy: -810 },
      { md: 3200, tvd: 2920, dx: 640, dy: -960 },
      { md: 3520, tvd: 3120, dx: 780, dy: -1120 }
    ],
    casings: [
      { name: 'Conductor', size: '30"', depth_md: 146, depth_tvd: 146 },
      { name: 'Surface Casing', size: '20"', depth_md: 1056, depth_tvd: 1050 },
      { name: 'Intermediate Casing', size: '13-3/8"', depth_md: 2040, depth_tvd: 1975 },
      { name: 'Production Liner', size: '9-5/8"', depth_md: 3180, depth_tvd: 2960 }
    ],
    perforations: [
      { top_md: 3110, base_md: 3145 },
      { top_md: 3160, base_md: 3185 }
    ],
    mud_shows: [
      { md: 1150, type: 'Shallow Gas', gas_ppm: 14500, description: 'Utsira Sand gas peak' },
      { md: 3090, type: 'Oil Show', gas_ppm: 86000, description: 'Hugin Sandstone bright yellow fluorescence' },
      { md: 3210, type: 'Gas Show', gas_ppm: 54000, description: 'Vestland Group gas show' }
    ]
  },
  '15/9-F-15': {
    stations: [
      { md: 0, tvd: 0, dx: 5, dy: -2 },
      { md: 800, tvd: 795, dx: -20, dy: 60 },
      { md: 1800, tvd: 1760, dx: -80, dy: 240 },
      { md: 2700, tvd: 2580, dx: -180, dy: 520 },
      { md: 3600, tvd: 3340, dx: -310, dy: 880 },
      { md: 4105, tvd: 3720, dx: -420, dy: 1150 }
    ],
    casings: [
      { name: 'Surface', size: '20"', depth_md: 1050, depth_tvd: 1040 },
      { name: 'Production', size: '9-5/8"', depth_md: 3250, depth_tvd: 3100 }
    ],
    perforations: [{ top_md: 3350, base_md: 3410 }],
    mud_shows: [{ md: 3355, type: 'Oil Show', gas_ppm: 92000, description: 'Hugin Fm direct show' }]
  },
  '15/9-F-14': {
    stations: [
      { md: 0, tvd: 0, dx: 2, dy: -1 },
      { md: 1000, tvd: 990, dx: 40, dy: 50 },
      { md: 2000, tvd: 1940, dx: 140, dy: 180 },
      { md: 3000, tvd: 2850, dx: 280, dy: 360 },
      { md: 3750, tvd: 3480, dx: 420, dy: 550 }
    ],
    casings: [
      { name: 'Surface', size: '20"', depth_md: 1070, depth_tvd: 1060 },
      { name: 'Production', size: '9-5/8"', depth_md: 3120, depth_tvd: 3050 }
    ],
    perforations: [{ top_md: 3140, base_md: 3180 }],
    mud_shows: [{ md: 3150, type: 'Oil Show', gas_ppm: 78000, description: 'Hugin Pay' }]
  }
};

export const NearWellViewer: React.FC<NearWellViewerProps> = ({ wellId }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const depthCursorMeshRef = useRef<THREE.Mesh | null>(null);

  const {
    activeWellId,
    currentDepth,
    workspaceId,
    setCurrentDepth,
    setSelectedObject
  } = useSelectionStore();

  const targetWellId = wellId || activeWellId || '15/9-F-12';
  const wellData = WELL_GEOMETRY_DATA[targetWellId] || WELL_GEOMETRY_DATA['15/9-F-12'];

  // Camera Orbit Interaction
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const orbitRef = useRef({
    radius: 450,
    theta: Math.PI / 3,
    phi: Math.PI / 4,
    target: new THREE.Vector3(250, -450, -2000)
  });

  const [showCasings, setShowCasings] = useState(true);
  const [showFormations, setShowFormations] = useState(true);
  const [showMudShows, setShowMudShows] = useState(true);
  const [showOffsets, setShowOffsets] = useState(true);
  const [showReservoir, setShowReservoir] = useState(true);
  const [showFaults, setShowFaults] = useState(true);
  const [boreholeExaggeration, setBoreholeExaggeration] = useState(3.0);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const updateCamera = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    const { radius, theta, phi, target } = orbitRef.current;
    cam.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    cam.position.y = target.y + radius * Math.sin(phi) * Math.cos(theta);
    cam.position.z = target.z + radius * Math.cos(phi);
    cam.lookAt(target);
  }, []);

  // Update Depth Cursor Position Ring
  useEffect(() => {
    if (!depthCursorMeshRef.current || !wellData) return;
    const stations = wellData.stations;
    const totalTvd = stations[stations.length - 1].tvd;
    const normD = Math.max(0, Math.min(1.0, currentDepth / totalTvd));

    const curvePoints = stations.map(s => new THREE.Vector3(s.dx, s.dy, -s.tvd));
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const pos = curve.getPointAt(normD);
    depthCursorMeshRef.current.position.copy(pos);
  }, [currentDepth, wellData]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 ResInsight tone
    sceneRef.current = scene;

    // 2. Camera Setup
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 1, 15000);
    cameraRef.current = camera;
    updateCamera();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(500, 1000, 1500);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.5);
    rim.position.set(-500, -1000, -1000);
    scene.add(rim);

    // 5. Construct Primary Wellbore Tube
    const curvePoints = wellData.stations.map(s => new THREE.Vector3(s.dx, s.dy, -s.tvd));
    const curve = new THREE.CatmullRomCurve3(curvePoints);

    const tubeRadius = 2.5 * boreholeExaggeration;
    const tubeGeom = new THREE.TubeGeometry(curve, 128, tubeRadius, 24, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.35,
      wireframe: false
    });
    const wellMesh = new THREE.Mesh(tubeGeom, tubeMat);
    wellMesh.name = `primary_well_${targetWellId}`;
    wellMesh.userData = { type: 'well', name: targetWellId };
    scene.add(wellMesh);

    // 6. Casing Shoes & Sections
    const casingGroup = new THREE.Group();
    casingGroup.name = 'casing_group';
    scene.add(casingGroup);

    wellData.casings.forEach((cs) => {
      const normDepth = Math.min(1.0, cs.depth_tvd / wellData.stations[wellData.stations.length - 1].tvd);
      const shoePos = curve.getPointAt(normDepth);
      const tangent = curve.getTangentAt(normDepth);

      // Casing shoe ring
      const shoeGeom = new THREE.CylinderGeometry(tubeRadius * 1.5, tubeRadius * 1.5, 6, 20);
      const shoeMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.2
      });
      const shoeMesh = new THREE.Mesh(shoeGeom, shoeMat);
      shoeMesh.position.copy(shoePos);
      shoeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      shoeMesh.name = `casing_${cs.name}`;
      shoeMesh.userData = { type: 'casing', name: `${cs.name} (${cs.size})`, depth: cs.depth_tvd };
      casingGroup.add(shoeMesh);
    });

    // 7. Formation Tops Intersection Disks
    const formationGroup = new THREE.Group();
    formationGroup.name = 'formation_group';
    scene.add(formationGroup);

    api.getFormationTops(targetWellId).then(tops => {
      tops.forEach((top) => {
        const totalTvd = wellData.stations[wellData.stations.length - 1].tvd;
        if (top.top_md > totalTvd + 200) return;
        const norm = Math.max(0, Math.min(1.0, top.top_md / totalTvd));
        const pt = curve.getPointAt(norm);

        const diskGeom = new THREE.CylinderGeometry(60, 60, 3, 32);
        const diskMat = new THREE.MeshStandardMaterial({
          color: 0x059669,
          transparent: true,
          opacity: 0.6,
          roughness: 0.5
        });
        const diskMesh = new THREE.Mesh(diskGeom, diskMat);
        diskMesh.position.copy(pt);
        diskMesh.name = `formation_${top.formation_name}`;
        diskMesh.userData = { type: 'formation', name: top.formation_name, depth: top.top_md, lithology: top.lithology };
        formationGroup.add(diskMesh);
      });
    }).catch(console.warn);

    // 8. Mud Log Gas & Oil Shows
    const mudGroup = new THREE.Group();
    mudGroup.name = 'mud_group';
    scene.add(mudGroup);

    wellData.mud_shows.forEach((ms) => {
      const totalTvd = wellData.stations[wellData.stations.length - 1].tvd;
      const norm = Math.min(1.0, ms.md / totalTvd);
      const pos = curve.getPointAt(norm);

      const flagGeom = new THREE.SphereGeometry(tubeRadius * 1.8, 16, 16);
      const flagMat = new THREE.MeshStandardMaterial({
        color: ms.type.includes('Oil') ? 0xeab308 : 0xef4444,
        emissive: ms.type.includes('Oil') ? 0xca8a04 : 0xb91c1c,
        emissiveIntensity: 0.5
      });
      const flagMesh = new THREE.Mesh(flagGeom, flagMat);
      flagMesh.position.copy(pos);
      flagMesh.name = `mudshow_${ms.md}`;
      flagMesh.userData = { type: 'mud_show', name: `${ms.type} @ ${ms.md}m: ${ms.description}`, gas_ppm: ms.gas_ppm };
      mudGroup.add(flagMesh);
    });

    // 9. Synchronized Depth Indicator Cursor Ring
    const cursorGeom = new THREE.TorusGeometry(tubeRadius * 2.2, 1.2, 16, 32);
    const cursorMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const cursorMesh = new THREE.Mesh(cursorGeom, cursorMat);
    cursorMesh.rotation.x = Math.PI / 2;
    scene.add(cursorMesh);
    depthCursorMeshRef.current = cursorMesh;

    // 10. Offset Well Trajectories
    const offsetGroup = new THREE.Group();
    offsetGroup.name = 'offset_group';
    scene.add(offsetGroup);

    Object.entries(WELL_GEOMETRY_DATA).forEach(([id, data]) => {
      if (id === targetWellId) return;
      const offPts = data.stations.map(s => new THREE.Vector3(s.dx, s.dy, -s.tvd));
      const offCurve = new THREE.CatmullRomCurve3(offPts);
      const offGeom = new THREE.TubeGeometry(offCurve, 64, 2, 12, false);
      const offMat = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.5 });
      const offMesh = new THREE.Mesh(offGeom, offMat);
      offMesh.name = `offset_well_${id}`;
      offMesh.userData = { type: 'offset_well', name: id };
      offsetGroup.add(offMesh);
    });

    // 10b. Reservoir Interval Slab (Hugin)
    const resGroup = new THREE.Group();
    resGroup.name = 'reservoir_group';
    scene.add(resGroup);

    api.getReservoirs(workspaceId).then(reservoirs => {
      reservoirs.forEach((r: any) => {
        const shape = new THREE.Shape();
        const poly = r.polygon || [];
        if (poly.length > 2) {
          shape.moveTo(poly[0][0], poly[0][1]);
          for (let k = 1; k < poly.length; k++) {
            shape.lineTo(poly[k][0], poly[k][1]);
          }
          shape.closePath();

          const thickness = (r.base_tvd_m - r.top_tvd_m) || 195;
          const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
            depth: thickness,
            bevelEnabled: false
          });
          extrudeGeom.rotateX(Math.PI);
          extrudeGeom.translate(0, 0, -r.top_tvd_m);

          const resMat = new THREE.MeshStandardMaterial({
            color: 0xeab308,
            roughness: 0.4,
            metalness: 0.2,
            transparent: true,
            opacity: 0.45
          });

          const resMesh = new THREE.Mesh(extrudeGeom, resMat);
          resMesh.name = `reservoir_${r.id}`;
          resMesh.userData = {
            type: 'reservoir',
            name: `${r.name} (${r.formation})`,
            net_pay: r.net_pay_m,
            porosity: r.avg_porosity_fraction
          };
          resGroup.add(resMesh);
        }
      });
    }).catch(console.warn);

    // 10c. Structural Faults
    const faultGroup = new THREE.Group();
    faultGroup.name = 'fault_group';
    scene.add(faultGroup);

    api.getFaults(workspaceId).then(faults => {
      faults.forEach((f: any) => {
        if (!f.segments || f.segments.length === 0) return;
        const faultGeom = new THREE.BufferGeometry();
        const positions: number[] = [];
        for (let i = 0; i < f.segments.length - 1; i++) {
          const seg1 = f.segments[i];
          const seg2 = f.segments[i + 1];
          positions.push(
            seg1[0][0], seg1[0][1], -seg1[0][2],
            seg1[1][0], seg1[1][1], -seg1[1][2],
            seg2[0][0], seg2[0][1], -seg2[0][2],
            seg1[1][0], seg1[1][1], -seg1[1][2],
            seg2[1][0], seg2[1][1], -seg2[1][2],
            seg2[0][0], seg2[0][1], -seg2[0][2]
          );
        }
        faultGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        faultGeom.computeVertexNormals();

        const faultMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide
        });

        const faultMesh = new THREE.Mesh(faultGeom, faultMat);
        faultMesh.name = `fault_${f.id}`;
        faultMesh.userData = {
          type: 'fault',
          name: f.name,
          strike: f.strike_deg,
          dip: f.dip_deg,
          throw_m: f.throw_m
        };
        faultGroup.add(faultMesh);
      });
    }).catch(console.warn);

    // 11. Mouse & Orbit Handlers
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !e.shiftKey) isDraggingRef.current = true;
      else if (e.button === 2 || (e.button === 0 && e.shiftKey)) isPanningRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      if (isDraggingRef.current) {
        orbitRef.current.theta -= dx * 0.006;
        orbitRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitRef.current.phi - dy * 0.006));
        updateCamera();
      } else if (isPanningRef.current) {
        const panSpeed = orbitRef.current.radius * 0.001;
        const cam = cameraRef.current;
        if (cam) {
          const right = new THREE.Vector3().crossVectors(cam.up, cam.getWorldDirection(new THREE.Vector3())).normalize();
          orbitRef.current.target.addScaledVector(right, dx * panSpeed);
          orbitRef.current.target.y -= dy * panSpeed;
          updateCamera();
        }
      } else {
        // Raycast hover check
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        if (hits.length > 0 && hits[0].object.userData?.name) {
          setHoveredFeature(`${hits[0].object.userData.type.toUpperCase()}: ${hits[0].object.userData.name}`);
        } else {
          setHoveredFeature(null);
        }
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      orbitRef.current.radius = Math.max(50, Math.min(3000, orbitRef.current.radius * factor));
      updateCamera();
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const u = hits[0].object.userData;
        if (u?.depth) {
          setCurrentDepth(u.depth);
        }
        if (u?.name) {
          setSelectedObject(u.name, u.type || 'formation');
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);
    container.addEventListener('contextmenu', e => e.preventDefault());

    // 12. Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 13. Window Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 14. Deterministic WebGL Disposal
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);

      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });

      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [targetWellId, boreholeExaggeration, workspaceId]);

  // Handle Visibility Toggles
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const cg = scene.getObjectByName('casing_group');
    if (cg) cg.visible = showCasings;
    const fg = scene.getObjectByName('formation_group');
    if (fg) fg.visible = showFormations;
    const mg = scene.getObjectByName('mud_group');
    if (mg) mg.visible = showMudShows;
    const og = scene.getObjectByName('offset_group');
    if (og) og.visible = showOffsets;
    const rg = scene.getObjectByName('reservoir_group');
    if (rg) rg.visible = showReservoir;
    const flg = scene.getObjectByName('fault_group');
    if (flg) flg.visible = showFaults;
  }, [showCasings, showFormations, showMudShows, showOffsets, showReservoir, showFaults]);

  // Focus Wellbore
  const handleFocus = () => {
    const st = wellData.stations[Math.floor(wellData.stations.length / 2)];
    orbitRef.current.target.set(st.dx, st.dy, -st.tvd);
    orbitRef.current.radius = 400;
    updateCamera();
  };

  // Reset Camera
  const handleReset = () => {
    orbitRef.current.radius = 450;
    orbitRef.current.theta = Math.PI / 3;
    orbitRef.current.phi = Math.PI / 4;
    orbitRef.current.target.set(250, -450, -2000);
    updateCamera();
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      {/* Near-Well Scientific HUD Controls */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-3)',
          left: 'var(--space-3)',
          backgroundColor: 'rgba(15, 23, 42, 0.90)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '11px',
          minWidth: '240px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
          <span style={{ fontWeight: '700', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Compass size={13} /> NEAR-WELL 3D INSPECTOR
          </span>
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>{targetWellId}</span>
        </div>

        {/* Borehole Radius Exaggeration Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#cbd5e1' }}>Borehole Scale:</span>
            <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{boreholeExaggeration.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="6.0"
            step="0.5"
            value={boreholeExaggeration}
            onChange={e => setBoreholeExaggeration(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer' }}
          />
        </div>

        {/* Feature Visibility Toggles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={() => setShowCasings(!showCasings)}
            style={{
              background: showCasings ? '#059669' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Casings: {showCasings ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowFormations(!showFormations)}
            style={{
              background: showFormations ? '#059669' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Formations: {showFormations ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowMudShows(!showMudShows)}
            style={{
              background: showMudShows ? '#059669' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Mud Shows: {showMudShows ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowOffsets(!showOffsets)}
            style={{
              background: showOffsets ? '#059669' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Offsets: {showOffsets ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowReservoir(!showReservoir)}
            style={{
              background: showReservoir ? '#d97706' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Reservoir: {showReservoir ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowFaults(!showFaults)}
            style={{
              background: showFaults ? '#dc2626' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Faults: {showFaults ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px' }}>
          <button
            onClick={handleFocus}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Crosshair size={11} /> Focus Well
          </button>
          <button
            onClick={handleReset}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={11} /> Reset View
          </button>
        </div>

        <div style={{ fontSize: '9px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <HelpCircle size={10} /> Red ring tracks active depth cursor ({currentDepth.toFixed(0)}m)
        </div>
      </div>

      {/* Hover Entity Banner */}
      {hoveredFeature && (
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-4)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #22c55e',
            color: '#f8fafc',
            padding: '4px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 20
          }}
        >
          {hoveredFeature}
        </div>
      )}
    </div>
  );
};

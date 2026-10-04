"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Direct top-level navigation to the NWIS single page application
    window.location.replace("/index.html");
  }, []);

  return (
    <main style={{ width: "100vw", height: "100vh", display: "grid", placeItems: "center", background: "#070d17", color: "#38bdf8", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px 0" }}>NWIS — Nearby Wells Intelligence System</h2>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading Drilling Intelligence Command Center...</p>
      </div>
    </main>
  );
}


"""
NWIS Telemetry & Replay Router (Phase 5)
Exposes REST endpoints, Server-Sent Events (SSE), and WebSocket streaming for
canonical drilling telemetry, Volve replay, local WITSML inspection, and eRTMAC stub status.
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from ..db import get_db
from ..schemas import (
    CanonicalTelemetrySample,
    ChannelInfo,
    TelemetryStatusResponse,
    ReplayControlRequest,
    WitsmlValidationResponse
)
from ..services.telemetry_service import (
    telemetry_manager,
    VolveReplayAdapter,
    WITSMLFileAdapter,
    ERTMACStubAdapter
)

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Replay"])


# ---------------------------------------------------------------------------
# 1. Telemetry Status & Channel Inventory
# ---------------------------------------------------------------------------
@router.get("/status", response_model=TelemetryStatusResponse)
def get_telemetry_status(source: Optional[str] = Query(None, description="Optional telemetry source: VOLVE_REPLAY, WITSML_FILE, ERTMAC")):
    """Returns operational status, current index, MD, speed, and active channel list."""
    if source:
        adapter = telemetry_manager.get_adapter(source)
        return adapter.get_status()
    return telemetry_manager.get_status()


@router.get("/channels", response_model=List[ChannelInfo])
def get_channel_inventory(source: Optional[str] = Query(None, description="Optional source")):
    """Returns available telemetry channels with physical units and descriptions. Null if unrecorded."""
    if source:
        adapter = telemetry_manager.get_adapter(source)
        return adapter.get_channel_inventory()
    return telemetry_manager.get_channel_inventory()


@router.get("/latest", response_model=Optional[CanonicalTelemetrySample])
@router.get("/sample", response_model=Optional[CanonicalTelemetrySample])
def get_latest_sample(source: Optional[str] = Query(None, description="Optional source")):
    """Returns the latest canonical telemetry sample from active stream/replay."""
    if source:
        adapter = telemetry_manager.get_adapter(source)
        sample = adapter.get_latest_sample()
    else:
        sample = telemetry_manager.get_latest_sample()
    
    if not sample:
        raise HTTPException(status_code=404, detail="No telemetry sample available.")
    return sample


# ---------------------------------------------------------------------------
# 2. Server-Side Volve Replay Controls
# ---------------------------------------------------------------------------
@router.post("/replay/start", response_model=TelemetryStatusResponse)
def start_replay(req: Optional[ReplayControlRequest] = Body(None), db=Depends(get_db)):
    """Starts server-side deterministic Volve telemetry replay."""
    speed = req.speed if req else None
    start_idx = req.start_index if req else None
    res = telemetry_manager.start_replay(speed=speed, start_index=start_idx)
    sample = telemetry_manager.get_latest_sample()
    if sample:
        telemetry_manager.update_runtime_active_well(sample, db_conn=db)
    return res


@router.post("/replay/pause", response_model=TelemetryStatusResponse)
def pause_replay():
    """Pauses server-side telemetry replay."""
    return telemetry_manager.pause_replay()


@router.post("/replay/resume", response_model=TelemetryStatusResponse)
def resume_replay():
    """Resumes server-side telemetry replay."""
    return telemetry_manager.resume_replay()


@router.post("/replay/reset", response_model=TelemetryStatusResponse)
def reset_replay(db=Depends(get_db)):
    """Resets replay index to 0."""
    res = telemetry_manager.reset_replay()
    sample = telemetry_manager.get_latest_sample()
    if sample:
        telemetry_manager.update_runtime_active_well(sample, db_conn=db)
    return res


@router.post("/replay/seek", response_model=TelemetryStatusResponse)
def seek_replay(req: ReplayControlRequest, db=Depends(get_db)):
    """Seeks replay to specific index or measured depth (MD)."""
    res = telemetry_manager.seek_replay(index=req.index, md=req.md)
    sample = telemetry_manager.get_latest_sample()
    if sample:
        telemetry_manager.update_runtime_active_well(sample, db_conn=db)
    return res


@router.post("/replay/speed", response_model=TelemetryStatusResponse)
def set_replay_speed(req: ReplayControlRequest):
    """Sets replay speed multiplier (0.25, 0.5, 1.0, 2.0, 5.0, 10.0)."""
    if req.speed is None:
        raise HTTPException(status_code=400, detail="Speed parameter required.")
    return telemetry_manager.set_speed(req.speed)


@router.post("/replay/step", response_model=Optional[CanonicalTelemetrySample])
def step_replay(db=Depends(get_db)):
    """Advances replay by 1 historical record and updates active-well state."""
    sample = telemetry_manager.step_replay(db_conn=db)
    if not sample:
        raise HTTPException(status_code=404, detail="Replay completed or no samples available.")
    return sample


# ---------------------------------------------------------------------------
# 3. Local WITSML File Adapter & Validator
# ---------------------------------------------------------------------------
@router.post("/witsml/inspect", response_model=WitsmlValidationResponse)
def inspect_witsml(
    file_path: Optional[str] = Body(None, embed=True, description="Relative or absolute path to local WITSML file")
):
    """
    Parses and validates local WITSML file.
    Reports sample count, channels, depth range, unsupported vendor mnemonics, and warnings.
    """
    target_path = file_path or "data/volve/witsml/log_00001.xml"
    if not os.path.exists(target_path):
        # Fallback to relative paths
        alt = os.path.abspath(target_path)
        if not os.path.exists(alt):
            raise HTTPException(status_code=404, detail=f"WITSML file not found: {target_path}")
        target_path = alt

    adapter = WITSMLFileAdapter(target_path)
    return adapter._build_validation_summary()


# ---------------------------------------------------------------------------
# 4. Explicit eRTMAC Stub Endpoint
# ---------------------------------------------------------------------------
@router.get("/ertmac/status", response_model=TelemetryStatusResponse)
def get_ertmac_status():
    """
    Explicit status for Oil India eRTMAC integration stub.
    Always returns NOT_CONNECTED and explains configuration prerequisites.
    """
    return telemetry_manager.ertmac_stub.get_status()


# ---------------------------------------------------------------------------
# 5. Server-Sent Events (SSE) Streaming Endpoint
# ---------------------------------------------------------------------------
@router.get("/stream")
async def stream_telemetry_sse(speed: Optional[float] = Query(None)):
    """
    Server-Sent Events (SSE) stream emitting incremental canonical telemetry samples.
    """
    if speed is not None:
        telemetry_manager.set_speed(speed)

    async def event_generator():
        # Stream telemetry records
        adapter = telemetry_manager.volve_adapter
        while True:
            if adapter.status == "RUNNING":
                sample = adapter.step()
                if sample:
                    telemetry_manager.update_runtime_active_well(sample)
                    payload = json.dumps({
                        "type": "telemetry",
                        "status": adapter.status,
                        "sample": sample
                    })
                    yield f"data: {payload}\n\n"
                    
                    if adapter.status == "COMPLETED":
                        yield f"data: {json.dumps({'type': 'status', 'status': 'COMPLETED'})}\n\n"
                        break
                else:
                    break
            
            # Replay delay governed by speed multiplier (base: 1.0s / speed)
            delay = max(0.05, 1.0 / max(0.1, adapter.speed))
            await asyncio.sleep(delay)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# 6. WebSocket Real-Time Telemetry Stream
# ---------------------------------------------------------------------------
@router.websocket("/ws")
@router.websocket("/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    """
    WebSocket streaming endpoint.
    Emits canonical telemetry samples and accepts bidirectional replay commands (start, pause, resume, seek, speed, reset).
    """
    await websocket.accept()
    adapter = telemetry_manager.volve_adapter

    async def sender():
        while True:
            if adapter.status == "RUNNING":
                sample = adapter.step()
                if sample:
                    telemetry_manager.update_runtime_active_well(sample)
                    await websocket.send_json({
                        "type": "telemetry",
                        "status": adapter.status,
                        "sample": sample
                    })
                    if adapter.status == "COMPLETED":
                        await websocket.send_json({
                            "type": "status",
                            "status": "COMPLETED",
                            "message": "Volve historical telemetry replay completed."
                        })
            delay = max(0.05, 1.0 / max(0.1, adapter.speed))
            await asyncio.sleep(delay)

    sender_task = asyncio.create_task(sender())

    try:
        while True:
            data = await websocket.receive_json()
            cmd = data.get("command") or data.get("action")
            if cmd == "start":
                telemetry_manager.start_replay(speed=data.get("speed"), start_index=data.get("index"))
            elif cmd == "pause":
                telemetry_manager.pause_replay()
            elif cmd == "resume":
                telemetry_manager.resume_replay()
            elif cmd == "reset":
                telemetry_manager.reset_replay()
            elif cmd == "seek":
                telemetry_manager.seek_replay(index=data.get("index"), md=data.get("md"))
            elif cmd == "speed":
                telemetry_manager.set_speed(data.get("speed", 1.0))
            
            # Send updated status
            await websocket.send_json({
                "type": "status",
                "status": adapter.status,
                "current_index": adapter.current_index,
                "speed": adapter.speed
            })
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        sender_task.cancel()

from fastapi import APIRouter, Depends

from app.dependencies import verify_api_key
from app.schemas import RunScanRequest, RunScanResponse
from app.services.scan_queue import ScanJob, ScanQueue, get_queue

router = APIRouter()


@router.post("/run-scan", response_model=RunScanResponse)
async def run_scan_endpoint(
    body: RunScanRequest,
    _: str = Depends(verify_api_key),
    queue: ScanQueue = Depends(get_queue),
) -> RunScanResponse:
    await queue.enqueue(
        ScanJob(scan_id=body.scan_id, url=body.url, device=body.device_mode)
    )
    return RunScanResponse(status="accepted", scan_id=body.scan_id)

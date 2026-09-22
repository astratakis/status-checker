"""Status Checker server: reports CPU, memory and disk usage of the host it runs on."""

import asyncio
import os
import secrets
import socket
import time
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone

import psutil
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

API_KEY = os.environ.get("API_KEY", "").strip()
if not API_KEY:
    # Fail closed: never serve host metrics without authentication.
    raise RuntimeError("API_KEY is not set. Refusing to start without one.")

# Any path on the filesystem to report. Inside Docker the container's own root
# is backed by the disk that holds Docker's data, which on most hosts is the
# root disk, so the default needs no access to the host's files.
DISK_PATH = os.environ.get("DISK_PATH") or "/"

# Inside Docker the container's hostname is a random id, so the real one is
# passed in (the Makefile does this).
HOST_NAME = os.environ.get("HOST_NAME", "").strip() or socket.gethostname()

CPU_SAMPLE_SECONDS = 1.0


class CpuSampler:
    """Measures CPU utilisation in the background so requests never wait on it."""

    def __init__(self) -> None:
        self.percent = 0.0

    async def run(self) -> None:
        psutil.cpu_percent(interval=None)  # first call only primes the counters
        while True:
            await asyncio.sleep(CPU_SAMPLE_SECONDS)
            self.percent = psutil.cpu_percent(interval=None)


cpu_sampler = CpuSampler()


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(cpu_sampler.run())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(
    title="Status Checker",
    description="Reports CPU, memory and disk usage of the host.",
    version="1.0.0",
    lifespan=lifespan,
)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: str | None = Security(api_key_header)) -> None:
    if key is None or not secrets.compare_digest(key.encode(), API_KEY.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or missing API key")


class Cpu(BaseModel):
    percent: float = Field(description="Utilisation across all cores, 0-100")
    cores: int = Field(description="Logical core count")
    load_average: tuple[float, float, float] = Field(description="1, 5 and 15 minute load")


class Memory(BaseModel):
    total: int = Field(description="Bytes")
    used: int = Field(description="Bytes not available to new processes")
    available: int = Field(description="Bytes")
    percent: float = Field(description="0-100")


class Disk(BaseModel):
    total: int = Field(description="Bytes")
    used: int = Field(description="Bytes")
    free: int = Field(description="Bytes")
    percent: float = Field(description="0-100")


class Status(BaseModel):
    hostname: str
    timestamp: datetime
    uptime_seconds: int
    cpu: Cpu
    memory: Memory
    disk: Disk


@app.get("/api/v1/status", dependencies=[Depends(require_api_key)])
async def get_status() -> Status:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(DISK_PATH)
    return Status(
        hostname=HOST_NAME,
        timestamp=datetime.now(timezone.utc),
        uptime_seconds=int(time.time() - psutil.boot_time()),
        cpu=Cpu(
            percent=cpu_sampler.percent,
            cores=psutil.cpu_count() or 1,
            load_average=os.getloadavg(),
        ),
        memory=Memory(
            total=memory.total,
            used=memory.total - memory.available,
            available=memory.available,
            percent=memory.percent,
        ),
        disk=Disk(total=disk.total, used=disk.used, free=disk.free, percent=disk.percent),
    )

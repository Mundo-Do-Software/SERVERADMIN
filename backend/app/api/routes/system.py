from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
import psutil
import platform
import subprocess
import json
from datetime import datetime
import re
import os
import shutil
import glob
from app.api.routes.auth import verify_token
import time
import tempfile
import hashlib
import multiprocessing as mp
import threading
import uuid
import threading
import uuid

router = APIRouter()
def _which_nvidia_smi() -> Optional[str]:
    """Locate the nvidia-smi binary even if not in PATH (systemd envs)."""
    # Try PATH first
    exe = shutil.which("nvidia-smi")
    if exe:
        return exe
    # Common absolute locations
    candidates = [
        "/usr/bin/nvidia-smi",
        "/usr/local/bin/nvidia-smi",
        "/bin/nvidia-smi",
        "/usr/local/nvidia/bin/nvidia-smi",
    ]
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    # Some distros place it under versioned nvidia dirs
    for path in glob.glob("/usr/lib/nvidia-*/bin/nvidia-smi"):
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return None


def _run_nvidia_smi(args: List[str], timeout: int = 10) -> Optional[subprocess.CompletedProcess]:
    """Run nvidia-smi with robust PATH/env handling; return CompletedProcess or None."""
    exe = _which_nvidia_smi()
    if not exe:
        return None
    env = os.environ.copy()
    extra_paths = [os.path.dirname(exe), "/usr/bin", "/usr/local/bin", "/bin", "/usr/local/nvidia/bin"]
    env["PATH"] = os.pathsep.join([p for p in extra_paths + [env.get("PATH", "")] if p])
    try:
        return subprocess.run([exe] + args, capture_output=True, text=True, timeout=timeout, env=env)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None



def _nvidia_driver_cuda() -> Dict[str, Optional[str]]:
    """Extrai Driver e CUDA da saída padrão do 'nvidia-smi' (sem args)."""
    info = {"driver_version": None, "cuda_version": None}
    result = _run_nvidia_smi([], timeout=5)
    if result and result.returncode == 0:
        out = result.stdout
        m1 = re.search(r"Driver Version:\s*([\d.]+)", out)
        m2 = re.search(r"CUDA Version:\s*([\d.]+)", out)
        if m1:
            info["driver_version"] = m1.group(1)
        if m2:
            info["cuda_version"] = m2.group(1)
    return info


def get_gpu_info() -> List[Dict[str, Any]]:
    """Obter informações da GPU se disponível (NVIDIA e genérico)."""
    gpus: List[Dict[str, Any]] = []

    # NVIDIA via nvidia-smi
    result = _run_nvidia_smi([
        "--query-gpu=name,pci.bus_id,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu",
        "--format=csv,noheader,nounits",
    ], timeout=10)
    if result and result.returncode == 0 and result.stdout.strip():
        drv = _nvidia_driver_cuda()
        for line in result.stdout.strip().splitlines():
            if not line.strip():
                continue
            parts = [part.strip() for part in line.split(",")]
            if len(parts) >= 7:
                def _to_int(x: str) -> Optional[int]:
                    try:
                        return int(x)
                    except Exception:
                        return None
                gpus.append(
                    {
                        "type": "NVIDIA",
                        "name": parts[0],
                        "bus_id": parts[1],
                        "memory_total": _to_int(parts[2]),
                        "memory_used": _to_int(parts[3]),
                        "memory_free": _to_int(parts[4]),
                        "temperature": _to_int(parts[5]),
                        "utilization": _to_int(parts[6]),
                        "driver_version": drv.get("driver_version"),
                        "cuda_version": drv.get("cuda_version"),
                    }
                )
    else:
        # Try listing GPUs with 'nvidia-smi -L' as a fallback to at least detect presence
        result_l = _run_nvidia_smi(["-L"], timeout=5)
        if result_l and result_l.returncode == 0 and result_l.stdout.strip():
            drv = _nvidia_driver_cuda()
            for line in result_l.stdout.strip().splitlines():
                # Example: "GPU 0: GeForce RTX 3090 (UUID: GPU-...)"
                m = re.search(r"GPU\s+\d+:\s+(.+?)\s*(\(|$)", line)
                name = m.group(1).strip() if m else line.strip()
                gpus.append(
                    {
                        "type": "NVIDIA",
                        "name": name,
                        "memory_total": None,
                        "memory_used": None,
                        "memory_free": None,
                        "temperature": None,
                        "utilization": None,
                        "driver_version": drv.get("driver_version"),
                        "cuda_version": drv.get("cuda_version"),
                    }
                )

    # Se não encontrou GPUs NVIDIA, tentar detectar outras GPUs via lspci
    if not gpus:
        try:
            result = subprocess.run(["lspci", "-nn"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    if any(word in line.lower() for word in ["vga", "display", "3d"]):
                        gpu_match = re.search(r":\s*(.+?)\s*\[", line)
                        if gpu_match:
                            gpu_name = gpu_match.group(1).strip()
                            lower = gpu_name.lower()
                            gpu_type = "Integrated"
                            if any(v in lower for v in ["nvidia", "geforce", "quadro"]):
                                gpu_type = "NVIDIA"
                            elif any(v in lower for v in ["amd", "radeon", "ati"]):
                                gpu_type = "AMD"
                            elif any(v in lower for v in ["intel", "uhd", "iris"]):
                                gpu_type = "Intel"
                            gpus.append(
                                {
                                    "type": gpu_type,
                                    "name": gpu_name,
                                    "memory_total": None,
                                    "memory_used": None,
                                    "memory_free": None,
                                    "temperature": None,
                                    "utilization": None,
                                }
                            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

    return gpus


def _lscpu_json() -> Optional[Dict[str, Any]]:
    """Tenta obter 'lscpu -J' (JSON)."""
    try:
        result = subprocess.run(["lscpu", "-J"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            # Newer lscpu returns {"lscpu": [{"field":"...","data":"..."}, ...]}
            return data
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        return None
    return None


def _cpuinfo_proc() -> Dict[str, Any]:
    """Fallback via /proc/cpuinfo para sockets e modelos."""
    sockets: Dict[str, str] = {}
    try:
        with open("/proc/cpuinfo", "r", encoding="utf-8", errors="ignore") as f:
            phys_id = None
            model_name = None
            for line in f:
                if line.startswith("physical id"):
                    phys_id = line.split(":", 1)[1].strip()
                elif line.startswith("model name") or line.startswith("Model name"):
                    model_name = line.split(":", 1)[1].strip()
                if phys_id is not None and model_name is not None:
                    sockets[phys_id] = model_name
                    phys_id = None
                    model_name = None
    except Exception:
        pass
    return {"sockets": sockets}


def get_cpu_details() -> Dict[str, Any]:
    """Detalhes de CPU: sockets, modelos, threads, etc."""
    details: Dict[str, Any] = {
        "cores_physical": psutil.cpu_count(logical=False),
        "cores_logical": psutil.cpu_count(logical=True),
    }
    data = _lscpu_json()
    def _get(field: str) -> Optional[str]:
        if not data or "lscpu" not in data:
            return None
        for item in data["lscpu"]:
            if item.get("field", "").strip().rstrip(":") == field:
                return item.get("data")
        return None
    model_name = _get("Model name") or _get("Model Name")
    sockets_str = _get("Socket(s)")
    cores_per_socket = _get("Core(s) per socket")
    threads_per_core = _get("Thread(s) per core")
    if model_name:
        details["model_name"] = model_name
    if sockets_str:
        try:
            details["sockets"] = int(sockets_str)
        except Exception:
            details["sockets"] = None
    if cores_per_socket:
        try:
            details["cores_per_socket"] = int(cores_per_socket)
        except Exception:
            pass
    if threads_per_core:
        try:
            details["threads_per_core"] = int(threads_per_core)
        except Exception:
            pass
    # Per-socket models via /proc/cpuinfo if available
    sockets = _cpuinfo_proc().get("sockets", {})
    if sockets:
        details["models_per_socket"] = sockets
    return details


def get_temperatures() -> Dict[str, Any]:
    """Coleta temperaturas de CPU/GPU/NVMe quando possível."""
    temps: Dict[str, Any] = {"cpu": None, "cpu_package": None, "cpu_core_max": None, "nvme": [], "gpus": []}
    try:
        st = psutil.sensors_temperatures(fahrenheit=False)
        if st:
            # CPU via 'coretemp'
            if "coretemp" in st:
                cpu_entries = st["coretemp"]
                pkg = [t.current for t in cpu_entries if hasattr(t, 'label') and t.label and "Package" in t.label]
                all_core = [t.current for t in cpu_entries if hasattr(t, 'current')]
                temps["cpu_package"] = max(pkg) if pkg else (max(all_core) if all_core else None)
                temps["cpu_core_max"] = max(all_core) if all_core else None
                temps["cpu"] = temps["cpu_package"] or temps["cpu_core_max"]
            # NVMe drives
            for key in st.keys():
                if key.lower().startswith("nvme"):
                    nv = [{"label": getattr(t, 'label', None), "temp": t.current} for t in st[key] if hasattr(t, 'current')]
                    temps["nvme"].extend(nv)
    except Exception:
        pass
    # GPU temps from get_gpu_info()
    try:
        gpus = get_gpu_info()
        temps["gpus"] = [{"name": g.get("name"), "temperature": g.get("temperature")} for g in gpus]
    except Exception:
        pass
    return temps


@router.get("/info", response_model=Dict[str, Any])
async def get_system_info(current_user: str = Depends(verify_token)):
    """Obter informações gerais do sistema."""
    try:
        # Informações do sistema
        uname = platform.uname()
        boot_time = datetime.fromtimestamp(psutil.boot_time())

        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_details = get_cpu_details()

        # Memória
        memory = psutil.virtual_memory()

        # Disco
        disk = psutil.disk_usage("/")

        # Load average (se disponível)
        try:
            load_avg = psutil.getloadavg()
        except Exception:
            load_avg = [0.0, 0.0, 0.0]

        # Uptime
        uptime_seconds = datetime.now().timestamp() - psutil.boot_time()
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        uptime_formatted = f"{days}d {hours}h {minutes}m"

        # GPU e temperaturas
        gpu_info = get_gpu_info()
        temperatures = get_temperatures()

        return {
            "hostname": uname.node,
            "os_version": f"{uname.system} {uname.release}",
            "kernel_version": uname.version,
            "architecture": uname.machine,
            "uptime": uptime_formatted,
            "boot_time": boot_time.isoformat(),
            "cpu_usage": round(cpu_percent, 1),
            "memory_usage": round(memory.percent, 1),
            "disk_usage": round((disk.used / disk.total) * 100, 1),
            "load_average": load_avg,
            # Informações detalhadas para compatibilidade
            "system": uname.system,
            "node": uname.node,
            "release": uname.release,
            "version": uname.version,
            "machine": uname.machine,
            "processor": uname.processor,
            "cpu": {
                "cores_physical": psutil.cpu_count(logical=False),
                "cores_logical": psutil.cpu_count(logical=True),
                "frequency": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
                "usage_percent": cpu_percent,
                **cpu_details,
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "free": memory.free,
                "percent": memory.percent,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100,
            },
            "gpu": gpu_info,
            "temperatures": temperatures,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter informações do sistema: {str(e)}")


@router.get("/processes")
async def get_processes(current_user: str = Depends(verify_token)):
    """Obter lista de processos em execução."""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status']):
            try:
                process_info = proc.info
                process_info['cpu_percent'] = proc.cpu_percent()
                process_info['memory_percent'] = proc.memory_percent()
                processes.append(process_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Ordenar por uso de CPU
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        return {"processes": processes[:50]}  # Top 50 processos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter processos: {str(e)}")


@router.get("/load")
async def get_system_load(current_user: str = Depends(verify_token)):
    """Obter cargas do sistema (CPU, memória, disco)."""
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
        cpu_average = sum(cpu_percent) / len(cpu_percent)
        
        # Memória
        memory = psutil.virtual_memory()
        
        # Disco I/O
        disk_io = psutil.disk_io_counters()
        
        # Network I/O
        net_io = psutil.net_io_counters()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent_per_core": cpu_percent,
                "percent_average": cpu_average,
                "load_avg": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            },
            "memory": {
                "percent": memory.percent,
                "used_gb": memory.used / (1024**3),
                "total_gb": memory.total / (1024**3)
            },
            "disk_io": {
                "read_bytes": disk_io.read_bytes,
                "write_bytes": disk_io.write_bytes,
                "read_count": disk_io.read_count,
                "write_count": disk_io.write_count
            } if disk_io else None,
            "network_io": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            } if net_io else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter cargas do sistema: {str(e)}")


@router.get("/uptime")
async def get_uptime(current_user: str = Depends(verify_token)):
    """Obter tempo de atividade do sistema."""
    try:
        boot_time = psutil.boot_time()
        current_time = datetime.now().timestamp()
        uptime_seconds = current_time - boot_time
        
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        return {
            "boot_time": datetime.fromtimestamp(boot_time).isoformat(),
            "uptime_seconds": uptime_seconds,
            "uptime_formatted": f"{days}d {hours}h {minutes}m"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter uptime: {str(e)}")


@router.get("/logs/{service}")
async def get_system_logs(service: str = "syslog", lines: int = 100, current_user: str = Depends(verify_token)):
    """Obter logs do sistema."""
    try:
        if service == "syslog":
            cmd = f"tail -n {lines} /var/log/syslog"
        elif service == "auth":
            cmd = f"tail -n {lines} /var/log/auth.log"
        elif service == "kern":
            cmd = f"tail -n {lines} /var/log/kern.log"
        else:
            cmd = f"journalctl -u {service} -n {lines} --no-pager"
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            return {
                "service": service,
                "lines": lines,
                "logs": result.stdout.strip().split('\n')
            }
        else:
            raise HTTPException(status_code=404, detail=f"Serviço {service} não encontrado ou sem permissão")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter logs: {str(e)}")


@router.get("/disks")
async def get_disk_info(current_user: str = Depends(verify_token)):
    """Obter informações de discos do sistema."""
    try:
        disks = []
        partitions = psutil.disk_partitions()
        
        for partition in partitions:
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": round((usage.used / usage.total) * 100, 1)
                })
            except PermissionError:
                # Alguns pontos de montagem podem não ter permissão
                continue
        
        return {"disks": disks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter informações de discos: {str(e)}")


# =======================
# Benchmarks simples
# =======================

def _cpu_benchmark(duration: int = 10, workers: Optional[int] = None) -> Dict[str, Any]:
    """CPU benchmark: múltiplos processos fazem SHA-256 em loop por 'duration' segundos."""
    if workers is None or workers <= 0:
        workers = max(1, psutil.cpu_count(logical=True) or 1)

    def worker(end_time: float, counter: Any):
        data = b"x" * 4096
        local_count = 0
        h = hashlib.sha256
        while time.time() < end_time:
            _ = h(data).digest()
            local_count += 1
        with counter.get_lock():
            counter.value += local_count

    end_time = time.time() + max(1, duration)
    counter = mp.Value('i', 0)
    procs: List[mp.Process] = []
    for _ in range(workers):
        p = mp.Process(target=worker, args=(end_time, counter))
        p.start()
        procs.append(p)
    for p in procs:
        p.join()
    total_ops = int(counter.value)
    ops_per_sec = total_ops / max(1.0, duration)
    return {"type": "cpu", "workers": workers, "duration": duration, "sha256_ops": total_ops, "ops_per_sec": round(ops_per_sec, 2)}


def _disk_benchmark(size_mb: int = 256, tmp_dir: Optional[str] = None) -> Dict[str, Any]:
    """Disk benchmark: escreve e lê um arquivo temporário de 'size_mb' MB medindo throughput."""
    size_mb = max(16, min(size_mb, 4096))  # 16MB..4GB
    tmp_dir = tmp_dir or "/tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    path = os.path.join(tmp_dir, "serveradmin_benchmark.bin")
    buf = b"\0" * (1024 * 1024)  # 1MB buffer (não usa urandom para não ser bound em CPU)

    # Write
    start = time.time()
    with open(path, "wb") as f:
        for _ in range(size_mb):
            f.write(buf)
        f.flush()
        os.fsync(f.fileno())
    write_sec = time.time() - start
    write_mb_s = size_mb / write_sec if write_sec > 0 else 0.0

    # Read
    start = time.time()
    read_bytes = 0
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            read_bytes += len(chunk)
    read_sec = time.time() - start
    read_mb = read_bytes / (1024 * 1024)
    read_mb_s = read_mb / read_sec if read_sec > 0 else 0.0

    try:
        os.remove(path)
    except Exception:
        pass

    return {
        "type": "disk",
        "size_mb": size_mb,
        "write_sec": round(write_sec, 3),
        "write_mb_s": round(write_mb_s, 2),
        "read_sec": round(read_sec, 3),
        "read_mb_s": round(read_mb_s, 2),
    }


def _memory_benchmark(size_mb: int = 512, duration: int = 5) -> Dict[str, Any]:
    """Memory benchmark: faz cópias em bloco pela duração definida e estima throughput."""
    size_mb = max(64, min(size_mb, 8192))
    block = bytearray(1024 * 1024)  # 1MB bloco
    blocks = size_mb
    data = bytearray(size_mb * 1024 * 1024)
    start = time.time()
    bytes_copied = 0
    end_time = start + max(1, duration)
    while time.time() < end_time:
        # Copia em blocos de 1MB
        for i in range(blocks):
            start_idx = i * len(block)
            data[start_idx:start_idx + len(block)] = block
            bytes_copied += len(block)
    sec = time.time() - start
    mbps = (bytes_copied / (1024 * 1024)) / sec if sec > 0 else 0.0
    return {"type": "memory", "size_mb": size_mb, "duration": duration, "mem_copy_mb_s": round(mbps, 2)}


def _gpu_benchmark(duration: int = 10) -> Dict[str, Any]:
    """GPU benchmark: tenta usar gpu-burn/hashcat se presentes; senão informa dependências."""
    # Detect available tools
    tool = None
    for name in ["gpu-burn", "gpu_burn"]:
        if shutil.which(name):
            tool = name
            break
    if not tool and shutil.which("stress-ng"):
        tool = "stress-ng"
    if not tool and shutil.which("hashcat"):
        tool = "hashcat"

    if tool is None:
        # At least report presence via nvidia-smi
        present = _which_nvidia_smi() is not None
        return {
            "type": "gpu",
            "available": present,
            "tool": None,
            "message": "Ferramenta de benchmark de GPU não encontrada. Instale 'gpu-burn' ou 'hashcat' para realizar um teste.",
        }

    if tool in ("gpu-burn", "gpu_burn"):
        try:
            # gpu-burn utiliza segundos como argumento; captura saída
            proc = subprocess.run([tool, str(max(1, duration))], capture_output=True, text=True, timeout=max(15, duration + 5))
            ok = proc.returncode == 0
            out = (proc.stdout or "") + "\n" + (proc.stderr or "")
            return {"type": "gpu", "tool": tool, "duration": duration, "success": ok, "output": out[-4000:]}
        except Exception as e:
            return {"type": "gpu", "tool": tool, "duration": duration, "success": False, "error": str(e)}

    if tool == "stress-ng":
        try:
            # stress-ng com stressor de GPU se disponível
            cmd = ["stress-ng", "--gpu", "1", "--timeout", f"{max(1, duration)}s", "--metrics-brief"]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=max(15, duration + 5))
            ok = proc.returncode == 0
            out = (proc.stdout or "") + (proc.stderr or "")
            return {"type": "gpu", "tool": tool, "duration": duration, "success": ok, "output": out[-4000:]}
        except Exception as e:
            return {"type": "gpu", "tool": tool, "duration": duration, "success": False, "error": str(e)}

    if tool == "hashcat":
        try:
            # Executa um benchmark rápido; --benchmark-all pode ser pesado; limitar tempo não é suportado diretamente.
            # Rodar um modo leve (ex.: -m 0 MD5) com --benchmark para reduzir carga/tempo.
            cmd = ["hashcat", "-b", "-m", "0", "--quiet"]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            ok = proc.returncode == 0
            return {"type": "gpu", "tool": tool, "success": ok, "output": ((proc.stdout or "") + (proc.stderr or ""))[-4000:]}
        except Exception as e:
            return {"type": "gpu", "tool": tool, "success": False, "error": str(e)}

    return {"type": "gpu", "success": False, "message": "Nenhum método de benchmark executado"}


@router.post("/benchmark")
async def run_benchmark(
    payload: Dict[str, Any],
    current_user: str = Depends(verify_token)
):
    """Executa benchmarks simples.

    payload:
      - type: "cpu" | "disk" | "memory" | "gpu" (default: cpu)
      - duration: segundos (para cpu/gpu/memory)
      - size_mb: tamanho do teste (para disk/memory)
      - threads: número de workers para CPU
    """
    try:
        btype = str(payload.get("type", "cpu")).lower()
        duration = int(payload.get("duration", 10))
        size_mb = int(payload.get("size_mb", 256))
        threads = payload.get("threads")
        threads = int(threads) if threads is not None else None

        if btype == "cpu":
            return _cpu_benchmark(duration=duration, workers=threads)
        elif btype == "disk":
            return _disk_benchmark(size_mb=size_mb)
        elif btype == "memory":
            return _memory_benchmark(size_mb=size_mb, duration=duration)
        elif btype == "gpu":
            return _gpu_benchmark(duration=duration)
        else:
            raise HTTPException(status_code=400, detail="Tipo de benchmark inválido")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao executar benchmark: {str(e)}")


# =======================
# Benchmarks assíncronos
# =======================

_JOB_LOCK = threading.Lock()
_JOBS: Dict[str, Dict[str, Any]] = {}


def _set_job(job_id: str, **kwargs):
    with _JOB_LOCK:
        job = _JOBS.get(job_id, {})
        job.update(kwargs)
        _JOBS[job_id] = job


def _get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _JOB_LOCK:
        return _JOBS.get(job_id)


def _run_job(job_id: str, payload: Dict[str, Any]):
    btype = str(payload.get("type", "cpu")).lower()
    duration = int(payload.get("duration", 10))
    size_mb = int(payload.get("size_mb", 256))
    threads = payload.get("threads")
    threads = int(threads) if threads is not None else None

    start_ts = time.time()
    _set_job(job_id, status="running", progress=0, start_time=start_ts)

    try:
        if btype == "cpu":
            # Launch worker processes as before, but update progress by elapsed time
            if threads is None or threads <= 0:
                threads = max(1, psutil.cpu_count(logical=True) or 1)
            end_time = time.time() + max(1, duration)
            counter = mp.Value('i', 0)

            def worker(end_time_: float, counter_: Any):
                data = b"x" * 4096
                local_count = 0
                h = hashlib.sha256
                while time.time() < end_time_:
                    _ = h(data).digest()
                    local_count += 1
                with counter_.get_lock():
                    counter_.value += local_count

            procs: List[mp.Process] = []
            for _ in range(threads):
                p = mp.Process(target=worker, args=(end_time, counter))
                p.start()
                procs.append(p)
            # progress loop
            while time.time() < end_time:
                elapsed = time.time() - start_ts
                _set_job(job_id, progress=min(99, int(elapsed / max(1, duration) * 100)))
                time.sleep(0.5)
            for p in procs:
                p.join()
            total_ops = int(counter.value)
            ops_per_sec = total_ops / max(1.0, duration)
            result = {"type": "cpu", "workers": threads, "duration": duration, "sha256_ops": total_ops, "ops_per_sec": round(ops_per_sec, 2)}
            _set_job(job_id, status="completed", progress=100, result=result, end_time=time.time())

        elif btype == "disk":
            size_mb = max(16, min(size_mb, 4096))
            tmp_dir = "/tmp"
            os.makedirs(tmp_dir, exist_ok=True)
            path = os.path.join(tmp_dir, f"serveradmin_benchmark_{job_id}.bin")
            buf = b"\0" * (1024 * 1024)
            # write phase
            start = time.time()
            with open(path, "wb") as f:
                for i in range(size_mb):
                    f.write(buf)
                    if i % 4 == 0:
                        # halfway progress up to 50%
                        _set_job(job_id, progress=int((i + 1) / size_mb * 50))
                f.flush(); os.fsync(f.fileno())
            write_sec = time.time() - start
            write_mb_s = size_mb / write_sec if write_sec > 0 else 0.0
            # read phase
            start = time.time()
            read_bytes = 0
            with open(path, "rb") as f:
                while True:
                    chunk = f.read(1024 * 1024)
                    if not chunk:
                        break
                    read_bytes += len(chunk)
                    if read_bytes % (4 * 1024 * 1024) == 0:
                        # progress 50%..95%
                        frac = min(0.95, 0.5 + (read_bytes / (size_mb * 1024 * 1024)) * 0.5)
                        _set_job(job_id, progress=int(frac * 100))
            read_sec = time.time() - start
            try:
                os.remove(path)
            except Exception:
                pass
            read_mb = read_bytes / (1024 * 1024)
            read_mb_s = read_mb / read_sec if read_sec > 0 else 0.0
            result = {"type": "disk", "size_mb": size_mb, "write_sec": round(write_sec, 3), "write_mb_s": round(write_mb_s, 2), "read_sec": round(read_sec, 3), "read_mb_s": round(read_mb_s, 2)}
            _set_job(job_id, status="completed", progress=100, result=result, end_time=time.time())

        elif btype == "memory":
            size_mb = max(64, min(size_mb, 8192))
            block = bytearray(1024 * 1024)
            blocks = size_mb
            data = bytearray(size_mb * 1024 * 1024)
            end_time = time.time() + max(1, duration)
            bytes_copied = 0
            while time.time() < end_time:
                for i in range(blocks):
                    start_idx = i * len(block)
                    data[start_idx:start_idx + len(block)] = block
                    bytes_copied += len(block)
                elapsed = time.time() - start_ts
                _set_job(job_id, progress=min(95, int(elapsed / max(1, duration) * 100)))
            sec = time.time() - start_ts
            mbps = (bytes_copied / (1024 * 1024)) / sec if sec > 0 else 0.0
            result = {"type": "memory", "size_mb": size_mb, "duration": duration, "mem_copy_mb_s": round(mbps, 2)}
            _set_job(job_id, status="completed", progress=100, result=result, end_time=time.time())

        elif btype == "gpu":
            # Try stress tools with timeout; update progress by elapsed
            end_time = time.time() + max(1, duration)
            tool = None
            for name in ["gpu-burn", "gpu_burn", "stress-ng", "hashcat"]:
                if shutil.which(name):
                    tool = name
                    break
            if tool is None:
                present = _which_nvidia_smi() is not None
                result = {"type": "gpu", "available": present, "tool": None, "message": "Instale 'gpu-burn' ou 'stress-ng' ou 'hashcat' para testes reais."}
                _set_job(job_id, status="completed", progress=100, result=result, end_time=time.time())
            else:
                try:
                    if tool in ("gpu-burn", "gpu_burn"):
                        cmd = [tool, str(max(1, duration))]
                    elif tool == "stress-ng":
                        cmd = ["stress-ng", "--gpu", "1", "--timeout", f"{max(1, duration)}s", "--metrics-brief"]
                    else:  # hashcat benchmark
                        cmd = ["hashcat", "-b", "-m", "0", "--quiet"]
                    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                    while True:
                        if proc.poll() is not None:
                            break
                        elapsed = time.time() - start_ts
                        _set_job(job_id, progress=min(99, int(elapsed / max(1, duration) * 100)))
                        time.sleep(0.5)
                    out, _ = proc.communicate(timeout=5)
                    ok = (proc.returncode or 0) == 0
                    result = {"type": "gpu", "tool": tool, "duration": duration, "success": ok, "output": (out or "")[-4000:]}
                    _set_job(job_id, status="completed", progress=100, result=result, end_time=time.time())
                except Exception as e:
                    _set_job(job_id, status="failed", progress=100, error=str(e), end_time=time.time())

        else:
            _set_job(job_id, status="failed", progress=100, error="Tipo de benchmark inválido", end_time=time.time())

    except Exception as e:
        _set_job(job_id, status="failed", progress=100, error=str(e), end_time=time.time())


@router.post("/benchmark/start")
async def start_benchmark(
    payload: Dict[str, Any],
    current_user: str = Depends(verify_token)
):
    job_id = uuid.uuid4().hex
    _set_job(job_id, id=job_id, status="queued", progress=0, params=payload)
    t = threading.Thread(target=_run_job, args=(job_id, payload), daemon=True)
    t.start()
    return {"job_id": job_id}


@router.get("/benchmark/status/{job_id}")
async def benchmark_status(job_id: str, current_user: str = Depends(verify_token)):
    job = _get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return job


# =======================
# Benchmarks em background (jobs)
# =======================

JOBS: Dict[str, Dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()


def _set_job(job_id: str, updates: Dict[str, Any]):
    with JOBS_LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(updates)


def _create_job(payload: Dict[str, Any]) -> str:
    job_id = str(uuid.uuid4())
    with JOBS_LOCK:
        JOBS[job_id] = {
            "id": job_id,
            "type": payload.get("type", "cpu"),
            "status": "queued",
            "progress": 0.0,
            "started_at": datetime.now().isoformat(),
            "duration": payload.get("duration", 10),
            "result": None,
            "error": None,
            "cancel": False,
            "logs": [],
            "params": payload,
        }
    return job_id


def _job_worker(job_id: str):
    job = JOBS.get(job_id, {})
    btype = str(job.get("type", "cpu")).lower()
    params = job.get("params", {})
    duration = int(params.get("duration", 10))
    size_mb = int(params.get("size_mb", 256))
    threads = params.get("threads")
    threads = int(threads) if threads is not None else None
    start_time = time.time()
    _set_job(job_id, {"status": "running", "progress": 0.0})

    try:
        if btype == "cpu":
            # Reaproveita lógica: cria processos de CPU e acompanha pelo tempo
            workers = threads if threads and threads > 0 else (psutil.cpu_count(logical=True) or 1)
            end_time = start_time + max(1, duration)
            counter = mp.Value('i', 0)

            def cpu_worker(end_t: float, ctr: Any):
                data = b"x" * 4096
                local_count = 0
                h = hashlib.sha256
                while time.time() < end_t and not JOBS[job_id].get("cancel"):
                    _ = h(data).digest()
                    local_count += 1
                with ctr.get_lock():
                    ctr.value += local_count

            procs: List[mp.Process] = []
            for _ in range(workers):
                p = mp.Process(target=cpu_worker, args=(end_time, counter))
                p.start()
                procs.append(p)
            # Loop de progresso
            while time.time() < end_time:
                if JOBS[job_id].get("cancel"):
                    break
                elapsed = time.time() - start_time
                prog = min(100.0, (elapsed / max(0.1, duration)) * 100.0)
                _set_job(job_id, {"progress": round(prog, 1), "metrics": {"elapsed": round(elapsed, 2), "ops": int(counter.value)}})
                time.sleep(0.5)
            # Finalizar
            for p in procs:
                if p.is_alive():
                    p.join(timeout=1)
            total_ops = int(counter.value)
            result = {
                "type": "cpu",
                "workers": workers,
                "duration": duration,
                "sha256_ops": total_ops,
                "ops_per_sec": round(total_ops / max(1.0, duration), 2),
            }
            _set_job(job_id, {"result": result})

        elif btype == "disk":
            # Escreve e lê em blocos atualizando progresso por MB
            size_mb = max(16, min(size_mb, 4096))
            path = os.path.join(tempfile.gettempdir(), f"serveradmin_bench_{job_id}.bin")
            buf = b"\0" * (1024 * 1024)
            # Write with progress
            written = 0
            t0 = time.time()
            with open(path, "wb") as f:
                for _ in range(size_mb):
                    if JOBS[job_id].get("cancel"):
                        break
                    f.write(buf)
                    written += 1
                    if written % 8 == 0:
                        elapsed = time.time() - t0
                        _set_job(job_id, {"progress": round((written / size_mb) * 100.0, 1), "metrics": {"written_mb": written, "elapsed": round(elapsed, 2)}})
                f.flush(); os.fsync(f.fileno())
            write_sec = time.time() - t0
            # Read
            read_bytes = 0
            t1 = time.time()
            with open(path, "rb") as f:
                while True:
                    if JOBS[job_id].get("cancel"):
                        break
                    chunk = f.read(1024 * 1024)
                    if not chunk:
                        break
                    read_bytes += len(chunk)
                    if (read_bytes // (1024 * 1024)) % 16 == 0:
                        elapsed = time.time() - t1
                        _set_job(job_id, {"metrics": {"read_mb": int(read_bytes / (1024 * 1024)), "elapsed": round(elapsed, 2)}})
            read_sec = time.time() - t1
            try:
                os.remove(path)
            except Exception:
                pass
            result = {
                "type": "disk",
                "size_mb": size_mb,
                "write_sec": round(write_sec, 3),
                "write_mb_s": round(size_mb / write_sec, 2) if write_sec > 0 else 0.0,
                "read_sec": round(read_sec, 3),
                "read_mb_s": round((read_bytes / (1024 * 1024)) / read_sec, 2) if read_sec > 0 else 0.0,
            }
            _set_job(job_id, {"result": result, "progress": 100.0})

        elif btype == "memory":
            size_mb = max(64, min(size_mb, 8192))
            block = bytearray(1024 * 1024)
            blocks = size_mb
            data = bytearray(size_mb * 1024 * 1024)
            end_time = start_time + max(1, duration)
            bytes_copied = 0
            while time.time() < end_time and not JOBS[job_id].get("cancel"):
                for i in range(blocks):
                    start_idx = i * len(block)
                    data[start_idx:start_idx + len(block)] = block
                    bytes_copied += len(block)
                elapsed = time.time() - start_time
                prog = min(100.0, (elapsed / max(0.1, duration)) * 100.0)
                _set_job(job_id, {"progress": round(prog, 1), "metrics": {"elapsed": round(elapsed, 2), "copied_mb": int(bytes_copied / (1024 * 1024))}})
            sec = time.time() - start_time
            mbps = (bytes_copied / (1024 * 1024)) / sec if sec > 0 else 0.0
            result = {"type": "memory", "size_mb": size_mb, "duration": duration, "mem_copy_mb_s": round(mbps, 2)}
            _set_job(job_id, {"result": result})

        elif btype == "gpu":
            # Executa ferramenta externa se disponível
            tool = None
            for name in ["gpu-burn", "gpu_burn"]:
                if shutil.which(name):
                    tool = name
                    break
            if not tool and shutil.which("hashcat"):
                tool = "hashcat"
            end_time = start_time + max(1, duration)
            if tool in ("gpu-burn", "gpu_burn"):
                try:
                    proc = subprocess.Popen([tool, str(duration)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                    out_lines: List[str] = []
                    while proc.poll() is None:
                        if JOBS[job_id].get("cancel"):
                            proc.terminate(); break
                        line = proc.stdout.readline() if proc.stdout else ''
                        if line:
                            out_lines.append(line.strip())
                            if len(out_lines) > 200:
                                out_lines = out_lines[-200:]
                            _set_job(job_id, {"logs": out_lines[-10:]})
                        elapsed = time.time() - start_time
                        prog = min(100.0, (elapsed / max(0.1, duration)) * 100.0)
                        _set_job(job_id, {"progress": round(prog, 1)})
                        time.sleep(0.2)
                    rc = proc.wait(timeout=5) if proc else 1
                    result = {"type": "gpu", "tool": tool, "duration": duration, "success": rc == 0, "output": "\n".join(out_lines[-50:])}
                    _set_job(job_id, {"result": result})
                except Exception as e:
                    _set_job(job_id, {"error": str(e)})
            elif tool == "hashcat":
                try:
                    proc = subprocess.Popen(["hashcat", "-b", "-m", "0", "--quiet"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                    out_lines: List[str] = []
                    while proc.poll() is None:
                        if JOBS[job_id].get("cancel"):
                            proc.terminate(); break
                        line = proc.stdout.readline() if proc.stdout else ''
                        if line:
                            out_lines.append(line.strip())
                            _set_job(job_id, {"logs": out_lines[-10:]})
                        # Sem duração definida, apenas marca como em execução
                        _set_job(job_id, {"progress": None})
                        time.sleep(0.3)
                    rc = proc.wait(timeout=5) if proc else 1
                    result = {"type": "gpu", "tool": tool, "success": rc == 0, "output": "\n".join(out_lines[-50:])}
                    _set_job(job_id, {"result": result})
                except Exception as e:
                    _set_job(job_id, {"error": str(e)})
            else:
                _set_job(job_id, {"result": {"type": "gpu", "available": _which_nvidia_smi() is not None, "message": "Instale gpu-burn ou hashcat para teste."}})
        else:
            _set_job(job_id, {"error": "Tipo de benchmark inválido"})

        if JOBS[job_id].get("cancel"):
            _set_job(job_id, {"status": "canceled"})
        else:
            _set_job(job_id, {"status": "completed", "progress": 100.0 if JOBS[job_id].get("progress") is not None else None})

    except Exception as e:
        _set_job(job_id, {"status": "error", "error": str(e)})


@router.post("/benchmark/start")
async def start_benchmark(payload: Dict[str, Any], current_user: str = Depends(verify_token)):
    """Inicia um benchmark em background e retorna job_id."""
    job_id = _create_job(payload)
    t = threading.Thread(target=_job_worker, args=(job_id,), daemon=True)
    t.start()
    return {"job_id": job_id}


@router.get("/benchmark/status/{job_id}")
async def get_benchmark_status(job_id: str, current_user: str = Depends(verify_token)):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job não encontrado")
        # Evitar expor flags internas
        safe = {k: v for k, v in job.items() if k not in ("cancel",)}
        return safe


@router.post("/benchmark/cancel/{job_id}")
async def cancel_benchmark(job_id: str, current_user: str = Depends(verify_token)):
    with JOBS_LOCK:
        if job_id not in JOBS:
            raise HTTPException(status_code=404, detail="Job não encontrado")
        JOBS[job_id]["cancel"] = True
        return {"message": "Cancelamento solicitado"}

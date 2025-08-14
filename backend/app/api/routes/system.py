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

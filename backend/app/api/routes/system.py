from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
import psutil
import platform
import subprocess
import json
from datetime import datetime
import re
from app.api.routes.auth import verify_token

router = APIRouter()


def get_gpu_info() -> List[Dict[str, Any]]:
    """Obter informações da GPU se disponível."""
    gpus = []
    
    try:
        # Tentar usar nvidia-smi para GPUs NVIDIA
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu", 
             "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line.strip():
                    parts = [part.strip() for part in line.split(',')]
                    if len(parts) >= 6:
                        gpus.append({
                            "type": "NVIDIA",
                            "name": parts[0],
                            "memory_total": int(parts[1]) if parts[1].isdigit() else 0,
                            "memory_used": int(parts[2]) if parts[2].isdigit() else 0,
                            "memory_free": int(parts[3]) if parts[3].isdigit() else 0,
                            "temperature": int(parts[4]) if parts[4].isdigit() else 0,
                            "utilization": int(parts[5]) if parts[5].isdigit() else 0
                        })
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    # Se não encontrou GPUs NVIDIA, tentar detectar outras GPUs via lspci
    if not gpus:
        try:
            result = subprocess.run(
                ["lspci", "-nn"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if any(gpu_keyword in line.lower() for gpu_keyword in ['vga', 'display', '3d']):
                        # Extrair informações básicas da GPU
                        gpu_match = re.search(r':\s*(.+?)\s*\[', line)
                        if gpu_match:
                            gpu_name = gpu_match.group(1).strip()
                            gpu_type = "Integrated"
                            if any(vendor in gpu_name.lower() for vendor in ['nvidia', 'geforce', 'quadro']):
                                gpu_type = "NVIDIA"
                            elif any(vendor in gpu_name.lower() for vendor in ['amd', 'radeon', 'ati']):
                                gpu_type = "AMD"
                            elif any(vendor in gpu_name.lower() for vendor in ['intel', 'uhd', 'iris']):
                                gpu_type = "Intel"
                            
                            gpus.append({
                                "type": gpu_type,
                                "name": gpu_name,
                                "memory_total": None,
                                "memory_used": None,
                                "memory_free": None,
                                "temperature": None,
                                "utilization": None
                            })
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
    
    return gpus


@router.get("/info", response_model=Dict[str, Any])
async def get_system_info(current_user: str = Depends(verify_token)):
    """Obter informações gerais do sistema."""
    try:
        # Informações do sistema
        uname = platform.uname()
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memória
        memory = psutil.virtual_memory()
        
        # Disco
        disk = psutil.disk_usage('/')
        
        # Load average (se disponível)
        try:
            load_avg = psutil.getloadavg()
        except:
            load_avg = [0.0, 0.0, 0.0]
        
        # Uptime
        uptime_seconds = datetime.now().timestamp() - psutil.boot_time()
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        uptime_formatted = f"{days}d {hours}h {minutes}m"
        
        # GPU
        gpu_info = get_gpu_info()
        
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
            "boot_time": boot_time.isoformat(),
            "cpu": {
                "cores_physical": psutil.cpu_count(logical=False),
                "cores_logical": psutil.cpu_count(logical=True),
                "frequency": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
                "usage_percent": cpu_percent
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "free": memory.free,
                "percent": memory.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            },
            "gpu": gpu_info
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

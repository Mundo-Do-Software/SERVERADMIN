from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any, Optional
import subprocess
import psutil
import re
import json
from datetime import datetime
from app.api.routes.auth import verify_token

router = APIRouter()

class NetworkAdmin:
    """Classe para administração de rede do sistema"""
    
    @staticmethod
    def execute_network_command(command: List[str]) -> str:
        """Executa comando de rede e retorna resultado"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao executar comando de rede: {e.stderr}"
            )
    
    @staticmethod
    def get_network_interfaces():
        """Obtém informações das interfaces de rede"""
        interfaces = []
        
        try:
            # Usar psutil para obter informações básicas
            net_if_addrs = psutil.net_if_addrs()
            net_if_stats = psutil.net_if_stats()
            net_io_counters = psutil.net_io_counters(pernic=True)
            
            for interface_name, addresses in net_if_addrs.items():
                interface_info = {
                    "name": interface_name,
                    "type": NetworkAdmin._get_interface_type(interface_name),
                    "status": "unknown",
                    "ip_address": None,
                    "netmask": None,
                    "mac_address": None,
                    "speed": None,
                    "rx_bytes": 0,
                    "tx_bytes": 0,
                    "is_up": False,
                    "mtu": 0
                }
                
                # Obter endereços IP e MAC
                for addr in addresses:
                    if addr.family == 2:  # AF_INET (IPv4)
                        interface_info["ip_address"] = addr.address
                        interface_info["netmask"] = addr.netmask
                    elif addr.family == 17:  # AF_LINK (MAC)
                        interface_info["mac_address"] = addr.address
                
                # Obter estatísticas da interface
                if interface_name in net_if_stats:
                    stats = net_if_stats[interface_name]
                    interface_info["is_up"] = stats.isup
                    interface_info["speed"] = stats.speed if stats.speed > 0 else None
                    interface_info["mtu"] = stats.mtu
                    interface_info["status"] = "online" if stats.isup else "offline"
                
                # Obter contadores de I/O
                if interface_name in net_io_counters:
                    io_stats = net_io_counters[interface_name]
                    interface_info["rx_bytes"] = io_stats.bytes_recv
                    interface_info["tx_bytes"] = io_stats.bytes_sent
                
                interfaces.append(interface_info)
                
        except Exception as e:
            # Fallback básico
            interfaces = [{
                "name": "eth0",
                "type": "Ethernet",
                "status": "unknown",
                "ip_address": "N/A",
                "netmask": None,
                "mac_address": None,
                "speed": None,
                "rx_bytes": 0,
                "tx_bytes": 0,
                "is_up": False,
                "mtu": 1500
            }]
        
        return interfaces
    
    @staticmethod
    def _get_interface_type(interface_name: str) -> str:
        """Determina o tipo da interface de rede"""
        if interface_name.startswith('lo'):
            return "Loopback"
        elif interface_name.startswith(('eth', 'en')):
            return "Ethernet"
        elif interface_name.startswith(('wlan', 'wl')):
            return "Wi-Fi"
        elif interface_name.startswith('docker'):
            return "Docker"
        elif interface_name.startswith('br'):
            return "Bridge"
        elif interface_name.startswith('tun'):
            return "Tunnel"
        else:
            return "Other"
    
    @staticmethod
    def get_network_stats():
        """Obtém estatísticas gerais de rede"""
        try:
            stats = psutil.net_io_counters()
            
            return {
                "total_bytes_sent": stats.bytes_sent,
                "total_bytes_recv": stats.bytes_recv,
                "total_packets_sent": stats.packets_sent,
                "total_packets_recv": stats.packets_recv,
                "total_errors_in": stats.errin,
                "total_errors_out": stats.errout,
                "total_drops_in": stats.dropin,
                "total_drops_out": stats.dropout
            }
        except Exception:
            return {
                "total_bytes_sent": 0,
                "total_bytes_recv": 0,
                "total_packets_sent": 0,
                "total_packets_recv": 0,
                "total_errors_in": 0,
                "total_errors_out": 0,
                "total_drops_in": 0,
                "total_drops_out": 0
            }
    
    @staticmethod
    def get_dns_servers():
        """Obtém servidores DNS configurados"""
        dns_servers = []
        
        try:
            # Tentar ler /etc/resolv.conf (Linux/Unix)
            try:
                with open('/etc/resolv.conf', 'r') as f:
                    content = f.read()
                    
                for line in content.split('\n'):
                    line = line.strip()
                    if line.startswith('nameserver'):
                        dns_ip = line.split()[1]
                        dns_servers.append({
                            "ip": dns_ip,
                            "type": NetworkAdmin._get_dns_type(dns_ip)
                        })
            except FileNotFoundError:
                # Windows ou sistema sem /etc/resolv.conf
                import socket
                # Tentar obter DNS via socket
                try:
                    dns_servers = [
                        {"ip": "8.8.8.8", "type": "Google DNS Primário"},
                        {"ip": "8.8.4.4", "type": "Google DNS Secundário"}
                    ]
                except:
                    pass
        
        except Exception:
            # DNS padrão como fallback
            dns_servers = [
                {"ip": "8.8.8.8", "type": "Google DNS Primário"},
                {"ip": "8.8.4.4", "type": "Google DNS Secundário"}
            ]
        
        return dns_servers
    
    @staticmethod
    def _get_dns_type(ip: str) -> str:
        """Determina o tipo do servidor DNS"""
        dns_types = {
            "8.8.8.8": "Google DNS Primário",
            "8.8.4.4": "Google DNS Secundário",
            "1.1.1.1": "Cloudflare DNS Primário",
            "1.0.0.1": "Cloudflare DNS Secundário",
            "208.67.222.222": "OpenDNS Primário",
            "208.67.220.220": "OpenDNS Secundário"
        }
        
        if ip in dns_types:
            return dns_types[ip]
        elif ip.startswith('192.168.') or ip.startswith('10.') or ip.startswith('172.'):
            return "DNS Local"
        else:
            return "DNS Personalizado"
    
    @staticmethod
    def get_active_connections():
        """Obtém conexões ativas"""
        connections = []
        
        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == psutil.CONN_ESTABLISHED:
                    try:
                        process = psutil.Process(conn.pid) if conn.pid else None
                        process_name = process.name() if process else "Unknown"
                        
                        local_addr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "Unknown"
                        remote_addr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "Unknown"
                        
                        connections.append({
                            "local_address": local_addr,
                            "remote_address": remote_addr,
                            "process_name": process_name,
                            "pid": conn.pid or 0,
                            "status": conn.status,
                            "protocol": "TCP" if conn.type == 1 else "UDP"
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        
        except Exception:
            pass
        
        return connections[:20]  # Limitar a 20 conexões

@router.get("/interfaces")
async def get_network_interfaces(current_user: str = Depends(verify_token)):
    """Lista todas as interfaces de rede"""
    try:
        network_admin = NetworkAdmin()
        interfaces = network_admin.get_network_interfaces()
        
        return {
            "interfaces": interfaces,
            "total_interfaces": len(interfaces),
            "online_interfaces": len([i for i in interfaces if i["status"] == "online"])
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter interfaces de rede: {str(e)}"
        )

@router.get("/stats")
async def get_network_statistics(current_user: str = Depends(verify_token)):
    """Obtém estatísticas de rede"""
    try:
        network_admin = NetworkAdmin()
        stats = network_admin.get_network_stats()
        
        # Converter bytes para formato legível
        def format_bytes(bytes_value):
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if bytes_value < 1024.0:
                    return f"{bytes_value:.1f} {unit}"
                bytes_value /= 1024.0
            return f"{bytes_value:.1f} PB"
        
        return {
            "download": format_bytes(stats["total_bytes_recv"]),
            "upload": format_bytes(stats["total_bytes_sent"]),
            "download_bytes": stats["total_bytes_recv"],
            "upload_bytes": stats["total_bytes_sent"],
            "packets_sent": stats["total_packets_sent"],
            "packets_recv": stats["total_packets_recv"],
            "errors": stats["total_errors_in"] + stats["total_errors_out"],
            "drops": stats["total_drops_in"] + stats["total_drops_out"]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter estatísticas de rede: {str(e)}"
        )

@router.get("/dns")
async def get_dns_configuration(current_user: str = Depends(verify_token)):
    """Obtém configuração de DNS"""
    try:
        network_admin = NetworkAdmin()
        dns_servers = network_admin.get_dns_servers()
        
        return {
            "dns_servers": dns_servers,
            "total_servers": len(dns_servers)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter configuração DNS: {str(e)}"
        )

@router.get("/connections")
async def get_active_connections(current_user: str = Depends(verify_token)):
    """Obtém conexões ativas"""
    try:
        network_admin = NetworkAdmin()
        connections = network_admin.get_active_connections()
        
        return {
            "connections": connections,
            "total_connections": len(connections)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter conexões ativas: {str(e)}"
        )

@router.post("/interface/{interface_name}/toggle")
async def toggle_interface(interface_name: str, current_user: str = Depends(verify_token)):
    """Habilita ou desabilita uma interface de rede"""
    try:
        network_admin = NetworkAdmin()
        
        # Verificar status atual
        interfaces = network_admin.get_network_interfaces()
        current_interface = next((i for i in interfaces if i["name"] == interface_name), None)
        
        if not current_interface:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interface {interface_name} não encontrada"
            )
        
        # Executar comando para toggle
        if current_interface["status"] == "online":
            try:
                # No Windows, usar netsh
                result = subprocess.run(
                    ["netsh", "interface", "set", "interface", interface_name, "disabled"],
                    capture_output=True,
                    text=True
                )
                action = "desabilitada"
            except:
                # Linux/Unix
                try:
                    result = subprocess.run(
                        ["sudo", "ip", "link", "set", interface_name, "down"],
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    action = "desabilitada"
                except:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Não foi possível desabilitar a interface"
                    )
        else:
            try:
                # No Windows, usar netsh
                result = subprocess.run(
                    ["netsh", "interface", "set", "interface", interface_name, "enabled"],
                    capture_output=True,
                    text=True
                )
                action = "habilitada"
            except:
                # Linux/Unix
                try:
                    result = subprocess.run(
                        ["sudo", "ip", "link", "set", interface_name, "up"],
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    action = "habilitada"
                except:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Não foi possível habilitar a interface"
                    )
        
        return {
            "message": f"Interface {interface_name} {action} com sucesso!",
            "interface": interface_name,
            "action": action
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao alterar interface: {str(e)}"
        )

@router.post("/restart")
async def restart_network(current_user: str = Depends(verify_token)):
    """Reinicia o serviço de rede"""
    try:
        # Tentar diferentes comandos dependendo do sistema
        try:
            # Linux systemd
            subprocess.run(["sudo", "systemctl", "restart", "networking"], check=True)
        except:
            try:
                # Linux service
                subprocess.run(["sudo", "service", "networking", "restart"], check=True)
            except:
                try:
                    # Windows
                    subprocess.run(["netsh", "winsock", "reset"], check=True)
                except:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Não foi possível reiniciar os serviços de rede"
                    )
        
        return {"message": "Serviços de rede reiniciados com sucesso!"}
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao reiniciar rede: {e}"
        )

@router.get("/ping/{host}")
async def ping_host(host: str, current_user: str = Depends(verify_token)):
    """Executa ping para um host"""
    try:
        network_admin = NetworkAdmin()
        
        # Usar comando ping apropriado para o sistema
        import platform
        if platform.system().lower() == "windows":
            ping_cmd = ["ping", "-n", "4", host]
        else:
            ping_cmd = ["ping", "-c", "4", host]
        
        # Executar ping
        try:
            result = subprocess.run(
                ping_cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            output = result.stdout
        except subprocess.TimeoutExpired:
            return {
                "host": host,
                "reachable": False,
                "packet_loss": "100%",
                "avg_time": "N/A",
                "error": "Timeout"
            }
        
        # Parse dos resultados
        lines = output.split('\n')
        packet_loss = "0%"
        avg_time = "N/A"
        reachable = result.returncode == 0
        
        # Tentar extrair estatísticas
        for line in lines:
            if 'packet loss' in line.lower() or 'perdidos' in line.lower():
                loss_match = re.search(r'(\d+)%', line)
                if loss_match:
                    packet_loss = f"{loss_match.group(1)}%"
            
            if 'average' in line.lower() or 'média' in line.lower():
                time_match = re.search(r'(\d+(?:\.\d+)?)ms', line)
                if time_match:
                    avg_time = f"{time_match.group(1)} ms"
        
        return {
            "host": host,
            "reachable": reachable,
            "packet_loss": packet_loss,
            "avg_time": avg_time,
            "output": output
        }
    
    except Exception as e:
        return {
            "host": host,
            "reachable": False,
            "packet_loss": "100%",
            "avg_time": "N/A",
            "error": str(e)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter interfaces de rede: {str(e)}")


@router.get("/connections")
async def get_network_connections(current_user: str = Depends(verify_token)):
    """Obter conexões de rede ativas."""
    try:
        connections = []
        
        for conn in psutil.net_connections():
            connection_info = {
                "fd": conn.fd,
                "family": str(conn.family),
                "type": str(conn.type),
                "local_address": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                "status": conn.status,
                "pid": conn.pid
            }
            
            # Tentar obter nome do processo
            if conn.pid:
                try:
                    process = psutil.Process(conn.pid)
                    connection_info["process_name"] = process.name()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    connection_info["process_name"] = "Unknown"
            
            connections.append(connection_info)
        
        return {"connections": connections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter conexões de rede: {str(e)}")


@router.get("/routing")
async def get_routing_table(current_user: str = Depends(verify_token)):
    """Obter tabela de roteamento."""
    try:
        result = subprocess.run(
            "ip route show",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Erro ao obter tabela de roteamento")
        
        routes = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                routes.append(line.strip())
        
        return {"routes": routes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter roteamento: {str(e)}")


@router.get("/firewall/status")
async def get_firewall_status(current_user: str = Depends(verify_token)):
    """Obter status do firewall (UFW)."""
    try:
        # Verificar status do UFW
        result = subprocess.run(
            "ufw status verbose",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return {"ufw_available": False, "status": "UFW não disponível"}
        
        status_output = result.stdout
        
        # Parse do status
        status_info = {
            "ufw_available": True,
            "status": "inactive",
            "logging": "off",
            "default_policies": {},
            "rules": []
        }
        
        lines = status_output.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith("Status:"):
                status_info["status"] = line.split(":")[1].strip()
            elif line.startswith("Logging:"):
                status_info["logging"] = line.split(":")[1].strip()
            elif "Default:" in line:
                # Parse default policies
                parts = line.split()
                if len(parts) >= 3:
                    direction = parts[0].lower()
                    policy = parts[2].rstrip(',')
                    status_info["default_policies"][direction] = policy
        
        return status_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter status do firewall: {str(e)}")


@router.get("/firewall/rules")
async def get_firewall_rules(current_user: str = Depends(verify_token)):
    """Obter regras do firewall."""
    try:
        result = subprocess.run(
            "ufw status numbered",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return {"rules": []}
        
        rules = []
        lines = result.stdout.split('\n')
        
        for line in lines:
            line = line.strip()
            # Parse das regras numeradas
            if re.match(r'^\[\s*\d+\]', line):
                rule_match = re.match(r'^\[\s*(\d+)\]\s+(.+)', line)
                if rule_match:
                    rule_number = rule_match.group(1)
                    rule_text = rule_match.group(2)
                    
                    rules.append({
                        "number": int(rule_number),
                        "rule": rule_text
                    })
        
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter regras do firewall: {str(e)}")


@router.post("/firewall/enable")
async def enable_firewall(current_user: str = Depends(verify_token)):
    """Habilitar o firewall."""
    try:
        result = subprocess.run(
            "ufw --force enable",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao habilitar firewall: {result.stderr}")
        
        return {"message": "Firewall habilitado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao habilitar firewall: {str(e)}")


@router.post("/firewall/disable")
async def disable_firewall(current_user: str = Depends(verify_token)):
    """Desabilitar o firewall."""
    try:
        result = subprocess.run(
            "ufw --force disable",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao desabilitar firewall: {result.stderr}")
        
        return {"message": "Firewall desabilitado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao desabilitar firewall: {str(e)}")


@router.post("/firewall/rules")
async def add_firewall_rule(rule_data: Dict[str, Any], current_user: str = Depends(verify_token)):
    """Adicionar regra ao firewall."""
    try:
        action = rule_data.get("action", "allow")  # allow, deny, reject
        port = rule_data.get("port")
        protocol = rule_data.get("protocol", "tcp")  # tcp, udp
        from_ip = rule_data.get("from_ip")
        to_ip = rule_data.get("to_ip")
        
        # Construir comando UFW
        cmd_parts = ["ufw", action]
        
        if from_ip:
            cmd_parts.extend(["from", from_ip])
        
        if to_ip:
            cmd_parts.extend(["to", to_ip])
        
        if port:
            cmd_parts.extend(["port", str(port)])
        
        if protocol and protocol != "any":
            cmd_parts.extend(["proto", protocol])
        
        cmd = " ".join(cmd_parts)
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao adicionar regra: {result.stderr}")
        
        return {"message": "Regra adicionada com sucesso", "output": result.stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar regra: {str(e)}")


@router.delete("/firewall/rules/{rule_number}")
async def delete_firewall_rule(rule_number: int, current_user: str = Depends(verify_token)):
    """Remover regra do firewall."""
    try:
        result = subprocess.run(
            f"ufw --force delete {rule_number}",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao remover regra: {result.stderr}")
        
        return {"message": f"Regra {rule_number} removida com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover regra: {str(e)}")


@router.get("/ports")
async def get_open_ports(current_user: str = Depends(verify_token)):
    """Obter portas abertas no sistema."""
    try:
        # Usar netstat para obter portas abertas
        result = subprocess.run(
            "netstat -tuln",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Erro ao executar netstat")
        
        open_ports = []
        lines = result.stdout.split('\n')
        
        for line in lines:
            if 'LISTEN' in line or 'udp' in line.lower():
                parts = line.split()
                if len(parts) >= 4:
                    protocol = parts[0]
                    local_address = parts[3]
                    
                    # Extrair porta
                    if ':' in local_address:
                        port = local_address.split(':')[-1]
                        ip = local_address.rsplit(':', 1)[0]
                        
                        open_ports.append({
                            "protocol": protocol,
                            "ip": ip,
                            "port": port,
                            "state": "LISTEN" if "LISTEN" in line else "UDP"
                        })
        
        return {"open_ports": open_ports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter portas abertas: {str(e)}")


@router.get("/dns")
async def get_dns_configuration(current_user: str = Depends(verify_token)):
    """Obter configuração DNS."""
    try:
        dns_info = {
            "resolv_conf": [],
            "systemd_resolved": None
        }
        
        # Ler /etc/resolv.conf
        try:
            with open('/etc/resolv.conf', 'r') as f:
                dns_info["resolv_conf"] = f.read().strip().split('\n')
        except FileNotFoundError:
            dns_info["resolv_conf"] = ["Arquivo /etc/resolv.conf não encontrado"]
        
        # Verificar systemd-resolved
        result = subprocess.run(
            "systemd-resolve --status",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            dns_info["systemd_resolved"] = result.stdout
        
        return dns_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter configuração DNS: {str(e)}")

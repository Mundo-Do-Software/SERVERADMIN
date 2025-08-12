from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
import subprocess
import re
import json
from datetime import datetime
import os

router = APIRouter()

class FirewallAdmin:
    """Classe para administração do UFW (Uncomplicated Firewall)"""
    
    @staticmethod
    def execute_ufw_command(command: List[str]) -> str:
        """Executa comando UFW e retorna resultado"""
        try:
            result = subprocess.run(
                ["sudo"] + command,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao executar comando UFW: {e.stderr}"
            )
    
    @staticmethod
    def get_ufw_status() -> bool:
        """Verifica se o UFW está ativo"""
        try:
            result = subprocess.run(
                ["sudo", "ufw", "status"],
                capture_output=True,
                text=True
            )
            return "Status: active" in result.stdout
        except:
            return False

class Fail2BanAdmin:
    """Classe para administração do Fail2Ban"""
    
    @staticmethod
    def execute_fail2ban_command(command: List[str]) -> str:
        """Executa comando Fail2Ban e retorna resultado"""
        try:
            result = subprocess.run(
                ["sudo"] + command,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao executar comando Fail2Ban: {e.stderr}"
            )
    
    @staticmethod
    def get_service_status() -> bool:
        """Verifica se o Fail2Ban está ativo"""
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "fail2ban"],
                capture_output=True,
                text=True
            )
            return result.stdout.strip() == "active"
        except:
            return False

@router.get("/firewall/status")
async def get_firewall_status():
    """Obtém status do firewall UFW"""
    try:
        firewall_admin = FirewallAdmin()
        is_active = firewall_admin.get_ufw_status()
        
        # Obter estatísticas do UFW
        status_output = firewall_admin.execute_ufw_command(["ufw", "status", "verbose"])
        
        rules_count = 0
        if is_active:
            # Contar regras ativas
            rules_lines = [line for line in status_output.split('\n') 
                          if '->' in line or 'ALLOW' in line or 'DENY' in line]
            rules_count = len(rules_lines)
        
        return {
            "active": is_active,
            "rules_count": rules_count,
            "status_output": status_output
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do firewall: {str(e)}"
        )

@router.get("/firewall/rules")
async def get_firewall_rules():
    """Lista todas as regras do firewall"""
    try:
        firewall_admin = FirewallAdmin()
        
        # Obter regras numeradas
        output = firewall_admin.execute_ufw_command(["ufw", "status", "numbered"])
        
        rules = []
        lines = output.split('\n')
        
        for line in lines:
            # Buscar por linhas com numeração [ 1] Port    ALLOW IN    Source
            if re.match(r'\[\s*\d+\]', line):
                parts = line.strip().split()
                if len(parts) >= 4:
                    rule_number = parts[0].strip('[]')
                    
                    # Parse da regra (formato pode variar)
                    if 'ALLOW' in line:
                        action = 'ALLOW'
                    elif 'DENY' in line:
                        action = 'DENY'
                    elif 'REJECT' in line:
                        action = 'REJECT'
                    else:
                        action = 'UNKNOWN'
                    
                    # Extrair informações da regra
                    if 'IN' in line:
                        direction = 'IN'
                    elif 'OUT' in line:
                        direction = 'OUT'
                    else:
                        direction = 'BOTH'
                    
                    rules.append({
                        "number": int(rule_number),
                        "action": action,
                        "direction": direction,
                        "rule": line.strip(),
                        "raw": line
                    })
        
        return rules
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar regras do firewall: {str(e)}"
        )

@router.post("/firewall/rules")
async def add_firewall_rule(rule_info: Dict[str, Any]):
    """Adiciona uma nova regra ao firewall"""
    try:
        firewall_admin = FirewallAdmin()
        
        action = rule_info.get("action", "allow").lower()
        port = rule_info.get("port")
        protocol = rule_info.get("protocol", "tcp").lower()
        direction = rule_info.get("direction", "in").lower()
        source = rule_info.get("source", "")
        
        if not port:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Porta é obrigatória"
            )
        
        # Construir comando UFW
        command = ["ufw"]
        
        if direction == "out":
            command.append("allow")
            command.append("out")
        else:
            command.append(action)
        
        if source:
            command.extend(["from", source])
            command.append("to")
            command.append("any")
        
        command.extend(["port", str(port)])
        
        if protocol in ["tcp", "udp"]:
            command.extend(["proto", protocol])
        
        # Executar comando
        result = firewall_admin.execute_ufw_command(command)
        
        return {"message": f"Regra {action} para porta {port} adicionada com sucesso!", "output": result}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao adicionar regra: {str(e)}"
        )

@router.delete("/firewall/rules/{rule_number}")
async def delete_firewall_rule(rule_number: int):
    """Remove uma regra do firewall"""
    try:
        firewall_admin = FirewallAdmin()
        
        # Deletar regra por número
        result = firewall_admin.execute_ufw_command(["ufw", "--force", "delete", str(rule_number)])
        
        return {"message": f"Regra {rule_number} removida com sucesso!", "output": result}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover regra: {str(e)}"
        )

@router.post("/firewall/enable")
async def enable_firewall():
    """Habilita o firewall UFW"""
    try:
        firewall_admin = FirewallAdmin()
        result = firewall_admin.execute_ufw_command(["ufw", "--force", "enable"])
        
        return {"message": "Firewall habilitado com sucesso!", "output": result}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao habilitar firewall: {str(e)}"
        )

@router.post("/firewall/disable")
async def disable_firewall():
    """Desabilita o firewall UFW"""
    try:
        firewall_admin = FirewallAdmin()
        result = firewall_admin.execute_ufw_command(["ufw", "disable"])
        
        return {"message": "Firewall desabilitado com sucesso!", "output": result}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desabilitar firewall: {str(e)}"
        )

@router.post("/firewall/reset")
async def reset_firewall():
    """Reseta todas as regras do firewall"""
    try:
        firewall_admin = FirewallAdmin()
        result = firewall_admin.execute_ufw_command(["ufw", "--force", "reset"])
        
        return {"message": "Firewall resetado com sucesso!", "output": result}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao resetar firewall: {str(e)}"
        )

# FAIL2BAN ENDPOINTS

@router.get("/fail2ban/status")
async def get_fail2ban_status():
    """Obtém status do Fail2Ban"""
    try:
        fail2ban_admin = Fail2BanAdmin()
        is_active = fail2ban_admin.get_service_status()
        
        if not is_active:
            return {
                "active": False,
                "jails": [],
                "banned_ips": 0
            }
        
        # Obter lista de jails
        jails_output = fail2ban_admin.execute_fail2ban_command(["fail2ban-client", "status"])
        
        # Extrair nomes dos jails
        jail_names = []
        for line in jails_output.split('\n'):
            if 'Jail list:' in line:
                jails_part = line.split('Jail list:')[1].strip()
                jail_names = [jail.strip() for jail in jails_part.split(',') if jail.strip()]
        
        # Obter informações detalhadas de cada jail
        jails_info = []
        total_banned = 0
        
        for jail_name in jail_names:
            try:
                jail_status = fail2ban_admin.execute_fail2ban_command(
                    ["fail2ban-client", "status", jail_name]
                )
                
                # Parse das informações do jail
                currently_failed = 0
                total_failed = 0
                currently_banned = 0
                total_banned_jail = 0
                
                for line in jail_status.split('\n'):
                    if 'Currently failed:' in line:
                        currently_failed = int(line.split(':')[1].strip())
                    elif 'Total failed:' in line:
                        total_failed = int(line.split(':')[1].strip())
                    elif 'Currently banned:' in line:
                        currently_banned = int(line.split(':')[1].strip())
                    elif 'Total banned:' in line:
                        total_banned_jail = int(line.split(':')[1].strip())
                
                total_banned += currently_banned
                
                jails_info.append({
                    "name": jail_name,
                    "currently_failed": currently_failed,
                    "total_failed": total_failed,
                    "currently_banned": currently_banned,
                    "total_banned": total_banned_jail,
                    "enabled": True
                })
            except:
                jails_info.append({
                    "name": jail_name,
                    "currently_failed": 0,
                    "total_failed": 0,
                    "currently_banned": 0,
                    "total_banned": 0,
                    "enabled": False
                })
        
        return {
            "active": True,
            "jails": jails_info,
            "banned_ips": total_banned
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do Fail2Ban: {str(e)}"
        )

@router.get("/fail2ban/banned-ips")
async def get_banned_ips():
    """Lista todos os IPs banidos"""
    try:
        fail2ban_admin = Fail2BanAdmin()
        
        # Obter lista de jails
        jails_output = fail2ban_admin.execute_fail2ban_command(["fail2ban-client", "status"])
        
        jail_names = []
        for line in jails_output.split('\n'):
            if 'Jail list:' in line:
                jails_part = line.split('Jail list:')[1].strip()
                jail_names = [jail.strip() for jail in jails_part.split(',') if jail.strip()]
        
        all_banned_ips = []
        
        for jail_name in jail_names:
            try:
                banned_output = fail2ban_admin.execute_fail2ban_command(
                    ["fail2ban-client", "get", jail_name, "banip"]
                )
                
                # Parse dos IPs banidos (formato pode variar)
                # Tentar obter lista de IPs banidos de forma alternativa
                status_output = fail2ban_admin.execute_fail2ban_command(
                    ["fail2ban-client", "status", jail_name]
                )
                
                for line in status_output.split('\n'):
                    if 'Banned IP list:' in line:
                        ips_part = line.split('Banned IP list:')[1].strip()
                        if ips_part:
                            ips = [ip.strip() for ip in ips_part.split() if ip.strip()]
                            for ip in ips:
                                all_banned_ips.append({
                                    "ip": ip,
                                    "jail": jail_name,
                                    "banned_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                })
            except:
                continue
        
        return all_banned_ips
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar IPs banidos: {str(e)}"
        )

@router.post("/fail2ban/unban")
async def unban_ip(ip_info: Dict[str, Any]):
    """Remove o banimento de um IP"""
    try:
        fail2ban_admin = Fail2BanAdmin()
        
        ip_address = ip_info.get("ip")
        jail_name = ip_info.get("jail", "")
        
        if not ip_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Endereço IP é obrigatório"
            )
        
        if jail_name:
            # Desbanir de um jail específico
            result = fail2ban_admin.execute_fail2ban_command(
                ["fail2ban-client", "set", jail_name, "unbanip", ip_address]
            )
        else:
            # Desbanir de todos os jails
            jails_output = fail2ban_admin.execute_fail2ban_command(["fail2ban-client", "status"])
            
            jail_names = []
            for line in jails_output.split('\n'):
                if 'Jail list:' in line:
                    jails_part = line.split('Jail list:')[1].strip()
                    jail_names = [jail.strip() for jail in jails_part.split(',') if jail.strip()]
            
            results = []
            for jail in jail_names:
                try:
                    result = fail2ban_admin.execute_fail2ban_command(
                        ["fail2ban-client", "set", jail, "unbanip", ip_address]
                    )
                    results.append(f"{jail}: {result}")
                except:
                    continue
            
            result = "; ".join(results)
        
        return {"message": f"IP {ip_address} desbanido com sucesso!", "output": result}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desbanir IP: {str(e)}"
        )

@router.post("/fail2ban/service/{action}")
async def fail2ban_service_action(action: str):
    """Controla o serviço Fail2Ban (start/stop/restart)"""
    try:
        valid_actions = ["start", "stop", "restart", "reload"]
        if action not in valid_actions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ação inválida. Use: {', '.join(valid_actions)}"
            )
        
        result = subprocess.run(
            ["sudo", "systemctl", action, "fail2ban"],
            capture_output=True,
            text=True,
            check=True
        )
        
        return {"message": f"Serviço Fail2Ban {action} executado com sucesso!"}
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao {action} o serviço Fail2Ban: {e.stderr}"
        )

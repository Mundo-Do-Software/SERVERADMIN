from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
import subprocess
import os
import re
from datetime import datetime

router = APIRouter()

class NginxAdmin:
    """Classe para administração do NGINX via comandos do sistema"""
    
    NGINX_SITES_AVAILABLE = "/etc/nginx/sites-available"
    NGINX_SITES_ENABLED = "/etc/nginx/sites-enabled"
    
    @staticmethod
    def get_service_status() -> bool:
        """Verifica se o serviço NGINX está ativo"""
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "nginx"],
                capture_output=True,
                text=True
            )
            return result.stdout.strip() == "active"
        except:
            return False
    
    @staticmethod
    def execute_nginx_command(command: List[str]) -> str:
        """Executa comando relacionado ao NGINX"""
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
                detail=f"Erro ao executar comando NGINX: {e.stderr}"
            )

@router.get("/nginx/status")
async def get_nginx_status():
    """Obtém status do servidor NGINX"""
    try:
        nginx_admin = NginxAdmin()
        is_online = nginx_admin.get_service_status()
        
        if not is_online:
            return {
                "online": False,
                "version": None,
                "sites_enabled": 0,
                "sites_available": 0,
                "uptime": None
            }
        
        # Obter versão do NGINX
        version_result = nginx_admin.execute_nginx_command(["nginx", "-v"])
        version = "Unknown"
        if "nginx/" in version_result:
            version = version_result.split("nginx/")[1].split()[0]
        
        # Contar sites
        sites_available = 0
        sites_enabled = 0
        
        try:
            if os.path.exists(nginx_admin.NGINX_SITES_AVAILABLE):
                sites_available = len([f for f in os.listdir(nginx_admin.NGINX_SITES_AVAILABLE) 
                                     if os.path.isfile(os.path.join(nginx_admin.NGINX_SITES_AVAILABLE, f))])
        except:
            pass
            
        try:
            if os.path.exists(nginx_admin.NGINX_SITES_ENABLED):
                sites_enabled = len([f for f in os.listdir(nginx_admin.NGINX_SITES_ENABLED) 
                                   if os.path.isfile(os.path.join(nginx_admin.NGINX_SITES_ENABLED, f))])
        except:
            pass
        
        # Obter uptime do sistema (simplificado)
        uptime_result = subprocess.run(["uptime"], capture_output=True, text=True)
        uptime = uptime_result.stdout.strip() if uptime_result.returncode == 0 else "Unknown"
        
        return {
            "online": True,
            "version": version,
            "sites_enabled": sites_enabled,
            "sites_available": sites_available,
            "uptime": uptime
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do NGINX: {str(e)}"
        )

@router.get("/nginx/sites")
async def get_sites():
    """Lista todos os sites configurados"""
    try:
        nginx_admin = NginxAdmin()
        sites = []
        
        # Listar sites disponíveis
        if os.path.exists(nginx_admin.NGINX_SITES_AVAILABLE):
            for site_file in os.listdir(nginx_admin.NGINX_SITES_AVAILABLE):
                site_path = os.path.join(nginx_admin.NGINX_SITES_AVAILABLE, site_file)
                if os.path.isfile(site_path):
                    
                    # Verificar se está habilitado
                    enabled_path = os.path.join(nginx_admin.NGINX_SITES_ENABLED, site_file)
                    is_enabled = os.path.exists(enabled_path)
                    
                    # Ler configuração do site
                    try:
                        with open(site_path, 'r') as f:
                            content = f.read()
                        
                        # Extrair informações básicas
                        server_name = "localhost"
                        listen_port = "80"
                        ssl_enabled = False
                        
                        # Buscar server_name
                        server_name_match = re.search(r'server_name\s+([^;]+);', content)
                        if server_name_match:
                            server_name = server_name_match.group(1).strip()
                        
                        # Buscar porta
                        listen_match = re.search(r'listen\s+(\d+)', content)
                        if listen_match:
                            listen_port = listen_match.group(1)
                        
                        # Verificar SSL
                        ssl_enabled = 'ssl' in content and 'ssl_certificate' in content
                        
                        # Obter estatísticas do arquivo
                        stat = os.stat(site_path)
                        modified = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
                        
                        sites.append({
                            "name": site_file,
                            "server_name": server_name,
                            "port": listen_port,
                            "ssl_enabled": ssl_enabled,
                            "enabled": is_enabled,
                            "modified": modified,
                            "type": "custom"
                        })
                    
                    except Exception as e:
                        # Site com erro de leitura
                        sites.append({
                            "name": site_file,
                            "server_name": "Erro ao ler",
                            "port": "Unknown",
                            "ssl_enabled": False,
                            "enabled": is_enabled,
                            "modified": "Unknown",
                            "type": "error"
                        })
        
        return sites
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar sites: {str(e)}"
        )

@router.post("/nginx/sites")
async def create_site(site_info: Dict[str, Any]):
    """Cria um novo site"""
    try:
        nginx_admin = NginxAdmin()
        
        site_name = site_info.get("name")
        server_name = site_info.get("server_name", "localhost")
        port = site_info.get("port", "80")
        site_type = site_info.get("type", "static")  # static, php, proxy
        root_path = site_info.get("root_path", "/var/www/html")
        
        if not site_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome do site é obrigatório"
            )
        
        # Validar nome do site
        if not re.match(r'^[a-zA-Z0-9._-]+$', site_name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome do site deve conter apenas letras, números, pontos, traços e underscores"
            )
        
        site_path = os.path.join(nginx_admin.NGINX_SITES_AVAILABLE, site_name)
        
        # Verificar se já existe
        if os.path.exists(site_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Site {site_name} já existe"
            )
        
        # Gerar configuração baseada no tipo
        if site_type == "static":
            config = f"""server {{
    listen {port};
    server_name {server_name};
    
    root {root_path};
    index index.html index.htm;
    
    location / {{
        try_files $uri $uri/ =404;
    }}
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}}"""
        
        elif site_type == "php":
            config = f"""server {{
    listen {port};
    server_name {server_name};
    
    root {root_path};
    index index.php index.html index.htm;
    
    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}
    
    location ~ \\.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }}
    
    location ~ /\\.ht {{
        deny all;
    }}
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}}"""
        
        elif site_type == "proxy":
            proxy_url = site_info.get("proxy_url", "http://localhost:3000")
            config = f"""server {{
    listen {port};
    server_name {server_name};
    
    location / {{
        proxy_pass {proxy_url};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }}
}}"""
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de site inválido. Use: static, php ou proxy"
            )
        
        # Escrever arquivo de configuração
        with open(site_path, 'w') as f:
            f.write(config)
        
        return {"message": f"Site {site_name} criado com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar site: {str(e)}"
        )

@router.post("/nginx/sites/{site_name}/enable")
async def enable_site(site_name: str):
    """Habilita um site"""
    try:
        nginx_admin = NginxAdmin()
        
        site_available = os.path.join(nginx_admin.NGINX_SITES_AVAILABLE, site_name)
        site_enabled = os.path.join(nginx_admin.NGINX_SITES_ENABLED, site_name)
        
        if not os.path.exists(site_available):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site {site_name} não encontrado"
            )
        
        if os.path.exists(site_enabled):
            return {"message": f"Site {site_name} já está habilitado"}
        
        # Criar symlink
        os.symlink(site_available, site_enabled)
        
        # Testar configuração
        nginx_admin.execute_nginx_command(["nginx", "-t"])
        
        # Recarregar nginx
        nginx_admin.execute_nginx_command(["systemctl", "reload", "nginx"])
        
        return {"message": f"Site {site_name} habilitado com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao habilitar site: {str(e)}"
        )

@router.post("/nginx/sites/{site_name}/disable")
async def disable_site(site_name: str):
    """Desabilita um site"""
    try:
        nginx_admin = NginxAdmin()
        
        site_enabled = os.path.join(nginx_admin.NGINX_SITES_ENABLED, site_name)
        
        if not os.path.exists(site_enabled):
            return {"message": f"Site {site_name} já está desabilitado"}
        
        # Remover symlink
        os.unlink(site_enabled)
        
        # Recarregar nginx
        nginx_admin.execute_nginx_command(["systemctl", "reload", "nginx"])
        
        return {"message": f"Site {site_name} desabilitado com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desabilitar site: {str(e)}"
        )

@router.delete("/nginx/sites/{site_name}")
async def delete_site(site_name: str):
    """Remove um site"""
    try:
        nginx_admin = NginxAdmin()
        
        site_available = os.path.join(nginx_admin.NGINX_SITES_AVAILABLE, site_name)
        site_enabled = os.path.join(nginx_admin.NGINX_SITES_ENABLED, site_name)
        
        if not os.path.exists(site_available):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site {site_name} não encontrado"
            )
        
        # Proteger sites padrão
        if site_name in ['default', 'default.conf']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir o site padrão {site_name}"
            )
        
        # Desabilitar primeiro se estiver habilitado
        if os.path.exists(site_enabled):
            os.unlink(site_enabled)
        
        # Remover arquivo de configuração
        os.unlink(site_available)
        
        # Recarregar nginx
        nginx_admin.execute_nginx_command(["systemctl", "reload", "nginx"])
        
        return {"message": f"Site {site_name} excluído com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir site: {str(e)}"
        )

@router.post("/nginx/service/{action}")
async def nginx_service_action(action: str):
    """Controla o serviço NGINX (start/stop/restart/reload)"""
    try:
        valid_actions = ["start", "stop", "restart", "reload"]
        if action not in valid_actions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ação inválida. Use: {', '.join(valid_actions)}"
            )
        
        result = subprocess.run(
            ["sudo", "systemctl", action, "nginx"],
            capture_output=True,
            text=True,
            check=True
        )
        
        return {"message": f"Serviço NGINX {action} executado com sucesso!"}
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao {action} o serviço NGINX: {e.stderr}"
        )

@router.get("/nginx/config/test")
async def test_nginx_config():
    """Testa a configuração do NGINX"""
    try:
        nginx_admin = NginxAdmin()
        result = nginx_admin.execute_nginx_command(["nginx", "-t"])
        
        return {
            "valid": True,
            "message": "Configuração do NGINX está válida!",
            "output": result
        }
    
    except HTTPException as e:
        return {
            "valid": False,
            "message": "Configuração do NGINX contém erros",
            "output": e.detail
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao testar configuração: {str(e)}"
        )

# CERTBOT / SSL CERTIFICATE MANAGEMENT

class CertbotAdmin:
    """Classe para administração de certificados SSL via Certbot"""
    
    @staticmethod
    def execute_certbot_command(command: List[str]) -> str:
        """Executa comando do Certbot"""
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
                detail=f"Erro ao executar comando Certbot: {e.stderr}"
            )
    
    @staticmethod
    def get_certbot_status() -> bool:
        """Verifica se o Certbot está instalado"""
        try:
            result = subprocess.run(
                ["which", "certbot"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except:
            return False

@router.get("/certbot/status")
async def get_certbot_status():
    """Obtém status do Certbot e certificados instalados"""
    try:
        certbot_admin = CertbotAdmin()
        
        # Verificar se o Certbot está instalado
        is_installed = certbot_admin.get_certbot_status()
        
        if not is_installed:
            return {
                "installed": False,
                "certificates": [],
                "auto_renewal": False
            }
        
        # Listar certificados existentes
        try:
            output = certbot_admin.execute_certbot_command(["certbot", "certificates"])
            
            certificates = []
            current_cert = {}
            
            for line in output.split('\n'):
                line = line.strip()
                if 'Certificate Name:' in line:
                    if current_cert:
                        certificates.append(current_cert)
                    current_cert = {
                        "name": line.split('Certificate Name:')[1].strip(),
                        "domains": [],
                        "expiry": "",
                        "status": "valid"
                    }
                elif 'Domains:' in line:
                    domains_str = line.split('Domains:')[1].strip()
                    current_cert["domains"] = [d.strip() for d in domains_str.split()]
                elif 'Expiry Date:' in line:
                    expiry_str = line.split('Expiry Date:')[1].strip()
                    current_cert["expiry"] = expiry_str.split('(')[0].strip()
                elif 'INVALID' in line.upper():
                    current_cert["status"] = "invalid"
            
            if current_cert:
                certificates.append(current_cert)
        
        except:
            certificates = []
        
        # Verificar se a renovação automática está ativa
        try:
            cron_result = subprocess.run(
                ["sudo", "crontab", "-l"],
                capture_output=True,
                text=True
            )
            auto_renewal = "certbot" in cron_result.stdout and "renew" in cron_result.stdout
        except:
            auto_renewal = False
        
        return {
            "installed": True,
            "certificates": certificates,
            "auto_renewal": auto_renewal
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do Certbot: {str(e)}"
        )

@router.post("/certbot/install")
async def install_certbot():
    """Instala o Certbot"""
    try:
        # Atualizar repositórios
        subprocess.run(["sudo", "apt", "update"], check=True)
        
        # Instalar certbot e plugin nginx
        subprocess.run([
            "sudo", "apt", "install", "-y", "certbot", "python3-certbot-nginx"
        ], check=True)
        
        return {"message": "Certbot instalado com sucesso!"}
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao instalar Certbot: {e}"
        )

@router.post("/certbot/certificate")
async def obtain_certificate(cert_info: Dict[str, Any]):
    """Obtém certificado SSL para um domínio"""
    try:
        certbot_admin = CertbotAdmin()
        
        domain = cert_info.get("domain")
        email = cert_info.get("email")
        
        if not domain or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domínio e email são obrigatórios"
            )
        
        # Verificar se o domínio já tem certificado
        try:
            existing_certs = certbot_admin.execute_certbot_command(["certbot", "certificates"])
            if domain in existing_certs:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Certificado para {domain} já existe"
                )
        except:
            pass
        
        # Obter certificado
        command = [
            "certbot", "--nginx",
            "-d", domain,
            "--email", email,
            "--agree-tos",
            "--non-interactive",
            "--redirect"
        ]
        
        output = certbot_admin.execute_certbot_command(command)
        
        return {
            "message": f"Certificado SSL obtido com sucesso para {domain}!",
            "domain": domain,
            "output": output
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter certificado: {str(e)}"
        )

@router.post("/certbot/renew")
async def renew_certificates():
    """Renova todos os certificados"""
    try:
        certbot_admin = CertbotAdmin()
        
        output = certbot_admin.execute_certbot_command(["certbot", "renew", "--dry-run"])
        
        return {
            "message": "Renovação de certificados executada com sucesso!",
            "output": output
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao renovar certificados: {str(e)}"
        )

@router.delete("/certbot/certificate/{domain}")
async def revoke_certificate(domain: str):
    """Revoga certificado de um domínio"""
    try:
        certbot_admin = CertbotAdmin()
        
        # Revogar e deletar certificado
        output = certbot_admin.execute_certbot_command([
            "certbot", "delete", "--cert-name", domain, "--non-interactive"
        ])
        
        return {
            "message": f"Certificado para {domain} revogado com sucesso!",
            "output": output
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao revogar certificado: {str(e)}"
        )

@router.post("/certbot/auto-renewal/{action}")
async def manage_auto_renewal(action: str):
    """Habilita ou desabilita renovação automática"""
    try:
        if action not in ["enable", "disable"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ação deve ser 'enable' ou 'disable'"
            )
        
        if action == "enable":
            # Adicionar cron job para renovação automática
            cron_job = "0 12 * * * /usr/bin/certbot renew --quiet"
            
            # Obter crontab atual
            try:
                current_cron = subprocess.run(
                    ["sudo", "crontab", "-l"],
                    capture_output=True,
                    text=True
                ).stdout
            except:
                current_cron = ""
            
            # Adicionar job se não existir
            if "certbot renew" not in current_cron:
                new_cron = current_cron + "\n" + cron_job + "\n"
                
                # Escrever nova crontab
                process = subprocess.Popen(
                    ["sudo", "crontab", "-"],
                    stdin=subprocess.PIPE,
                    text=True
                )
                process.communicate(input=new_cron)
            
            message = "Renovação automática habilitada!"
        
        else:  # disable
            # Remover job do cron
            try:
                current_cron = subprocess.run(
                    ["sudo", "crontab", "-l"],
                    capture_output=True,
                    text=True
                ).stdout
                
                # Filtrar linhas que não contenham certbot
                new_cron = "\n".join([
                    line for line in current_cron.split('\n')
                    if 'certbot' not in line.lower() or 'renew' not in line.lower()
                ])
                
                # Escrever nova crontab
                process = subprocess.Popen(
                    ["sudo", "crontab", "-"],
                    stdin=subprocess.PIPE,
                    text=True
                )
                process.communicate(input=new_cron)
            except:
                pass
            
            message = "Renovação automática desabilitada!"
        
        return {"message": message}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerenciar renovação automática: {str(e)}"
        )

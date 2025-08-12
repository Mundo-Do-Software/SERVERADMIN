from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
import subprocess
import json
import os
import re
from pathlib import Path
from app.api.routes.auth import verify_token

router = APIRouter()

# Arquivo para simular estado de pacotes instalados
PACKAGES_STATE_FILE = Path("/tmp/packages_state.json")

def get_installed_versions(package_id: str) -> List[str]:
    """Obter versões instaladas de um pacote de desenvolvimento."""
    installed_versions = []
    
    try:
        if package_id == "dotnet":
            # Verificar versões instaladas do .NET
            result = subprocess.run(
                "dotnet --list-runtimes",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # Extrair versões dos runtimes
                for line in result.stdout.split('\n'):
                    if 'Microsoft.NETCore.App' in line:
                        match = re.search(r'(\d+\.\d+)\.\d+', line)
                        if match:
                            version = match.group(1)
                            if version not in installed_versions:
                                installed_versions.append(version)
        
        elif package_id == "nodejs":
            # Verificar versões instaladas do Node.js via NVM
            result = subprocess.run(
                "bash -c 'source ~/.nvm/nvm.sh && nvm list'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    line = line.strip()
                    # Procurar apenas por linhas que começam com 'v' ou '->' seguido de 'v'
                    # Ignorar linhas de 'lts/*' que duplicam as versões
                    if line.startswith('v') or (line.startswith('->') and 'v' in line):
                        match = re.search(r'v(\d+)', line)
                        if match:
                            major_version = match.group(1)
                            if major_version not in installed_versions and major_version.isdigit():
                                installed_versions.append(major_version)
        
        elif package_id == "php":
            # Verificar versões instaladas do PHP
            result = subprocess.run(
                "dpkg -l | grep '^ii.*php[0-9]'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    # Procurar por padrões como "php8.1"
                    match = re.search(r'php(\d+\.\d+)', line)
                    if match:
                        version = match.group(1)
                        if version not in installed_versions:
                            installed_versions.append(version)
    
    except Exception as e:
        print(f"Erro ao obter versões instaladas para {package_id}: {e}")
    
    return sorted(installed_versions)

def get_default_version(package_id: str) -> Optional[str]:
    """Obter a versão padrão de um pacote de desenvolvimento."""
    try:
        if package_id == "dotnet":
            result = subprocess.run(
                "dotnet --version",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                version = result.stdout.strip()
                # Extrair versão principal (ex: "8.0.100" -> "8.0")
                match = re.search(r'(\d+\.\d+)', version)
                if match:
                    return match.group(1)
        
        elif package_id == "nodejs":
            result = subprocess.run(
                "bash -c 'source ~/.nvm/nvm.sh && nvm current'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                version = result.stdout.strip()
                # Remover o "v" do início se presente e extrair versão principal
                if version.startswith('v'):
                    version = version[1:]
                # Extrair apenas a versão principal (ex: "20.19.4" -> "20")
                match = re.search(r'^(\d+)', version)
                if match:
                    return match.group(1)
                return version
        
        elif package_id == "php":
            result = subprocess.run(
                "php --version",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # Extrair versão principal (ex: "PHP 8.1.2" -> "8.1")
                match = re.search(r'PHP (\d+\.\d+)', result.stdout)
                if match:
                    return match.group(1)
    
    except Exception as e:
        print(f"Erro ao obter versão padrão para {package_id}: {e}")
    
    return None

# Arquivo para simular estado de pacotes instalados
PACKAGES_STATE_FILE = Path("/tmp/packages_state.json")

def load_packages_state() -> Dict[str, Dict[str, Any]]:
    """Carregar estado dos pacotes de um arquivo JSON."""
    if PACKAGES_STATE_FILE.exists():
        try:
            with open(PACKAGES_STATE_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    
    # Estado inicial - alguns pacotes já "instalados"
    return {
        "git": {"installed": True, "version": "2.34.1"},
        "curl": {"installed": True, "version": "7.81.0"},
        "htop": {"installed": True, "version": "3.0.5"},
        "default-mysql-server": {"installed": True, "version": "8.0.32"},
        "nginx": {"installed": True, "version": "1.18.0"},
        "php": {"installed": True, "version": "8.1.2"}
    }

def save_packages_state(state: Dict[str, Dict[str, Any]]):
    """Salvar estado dos pacotes em um arquivo JSON."""
    try:
        with open(PACKAGES_STATE_FILE, 'w') as f:
            json.dump(state, f)
    except Exception as e:
        print(f"Erro ao salvar estado dos pacotes: {e}")

def get_package_state(package_id: str) -> Dict[str, Any]:
    """Obter estado de um pacote específico."""
    state = load_packages_state()
    return state.get(package_id, {"installed": False, "version": None})

# Lista de pacotes essenciais com suas informações
ESSENTIAL_PACKAGES = {
    "mysql-server": {
        "id": "mysql-server",
        "name": "MySQL Server",
        "description": "Sistema de gerenciamento de banco de dados relacional",
        "category": "database",
        "hasAdminPanel": True,
        "adminRoute": "/packages/mysql-server",
        "icon": "🗄️",
        "size": "234 MB",
        "dependencies": ["mysql-client", "mysql-common"],
        "realPackage": "default-mysql-server"
    },
    "postgresql": {
        "id": "postgresql",
        "name": "PostgreSQL",
        "description": "Sistema de banco de dados objeto-relacional avançado",
        "category": "database", 
        "hasAdminPanel": True,
        "adminRoute": "/packages/postgresql",
        "icon": "🐘",
        "size": "89 MB",
        "dependencies": ["postgresql-client", "postgresql-common"],
        "realPackage": "postgresql"
    },
    "nginx": {
        "id": "nginx",
        "name": "NGINX",
        "description": "Servidor web e proxy reverso de alto desempenho",
        "category": "web",
        "hasAdminPanel": True,
        "adminRoute": "/packages/nginx",
        "icon": "🌐",
        "size": "45 MB",
        "dependencies": ["nginx-common", "nginx-core"],
        "realPackage": "nginx"
    },
    "php": {
        "id": "php",
        "name": "PHP",
        "description": "Linguagem de programação popular para desenvolvimento web",
        "category": "development",
        "hasAdminPanel": True,
        "adminRoute": "/packages/php",
        "icon": "🐘",
        "size": "67 MB",
        "dependencies": ["php-common", "php-cli"],
        "realPackage": "php",
        "multiVersion": True,
        "availableVersions": ["8.1", "8.2", "8.3", "8.4"],
        "versionManager": "manual"
    },
    "nodejs": {
        "id": "nodejs",
        "name": "Node.js",
        "description": "Runtime JavaScript construído no motor V8 do Chrome",
        "category": "development",
        "hasAdminPanel": True,
        "adminRoute": "/packages/nodejs",
        "icon": "💚",
        "size": "32 MB",
        "dependencies": ["npm"],
        "realPackage": "nodejs",
        "multiVersion": True,
        "availableVersions": ["16", "18", "20", "22"],
        "versionManager": "nvm"
    },
    "dotnet": {
        "id": "dotnet",
        "name": ".NET Runtime",
        "description": "Plataforma de desenvolvimento da Microsoft",
        "category": "development",
        "hasAdminPanel": True,
        "adminRoute": "/packages/dotnet",
        "icon": "🔷",
        "size": "178 MB",
        "dependencies": ["dotnet-runtime"],
        "realPackage": "dotnet-runtime-6.0",
        "multiVersion": True,
        "availableVersions": ["6.0", "7.0", "8.0", "9.0"],
        "versionManager": "dotnet"
    },
    "redis": {
        "id": "redis",
        "name": "Redis",
        "description": "Estrutura de dados na memória para cache e banco de dados",
        "category": "database",
        "hasAdminPanel": True,
        "adminRoute": "/packages/redis",
        "icon": "📦",
        "size": "12 MB",
        "dependencies": ["redis-tools"],
        "realPackage": "redis-server"
    },
    "certbot": {
        "id": "certbot",
        "name": "Certbot",
        "description": "Cliente automático para certificados SSL Let's Encrypt",
        "category": "security",
        "hasAdminPanel": False,
        "adminRoute": None,
        "icon": "🔒",
        "size": "8 MB",
        "dependencies": ["python3-certbot"],
        "realPackage": "certbot"
    },
    "ufw": {
        "id": "ufw",
        "name": "UFW Firewall",
        "description": "Interface simplificada para configurar firewall iptables",
        "category": "security",
        "hasAdminPanel": True,
        "adminRoute": "/firewall",
        "icon": "🛡️",
        "size": "2 MB",
        "dependencies": ["iptables"],
        "realPackage": "ufw"
    },
    "fail2ban": {
        "id": "fail2ban",
        "name": "Fail2Ban",
        "description": "Proteção contra ataques de força bruta",
        "category": "security",
        "hasAdminPanel": False,
        "adminRoute": None,
        "icon": "🛡️",
        "size": "5 MB",
        "dependencies": ["python3"],
        "realPackage": "fail2ban"
    },
    "docker": {
        "id": "docker",
        "name": "Docker",
        "description": "Plataforma de containerização",
        "category": "system",
        "hasAdminPanel": False,
        "adminRoute": None,
        "icon": "🐳",
        "size": "95 MB",
        "dependencies": ["containerd", "docker-compose"],
        "realPackage": "docker.io"
    },
    "git": {
        "id": "git",
        "name": "Git",
        "description": "Sistema de controle de versão distribuído",
        "category": "development",
        "hasAdminPanel": False,
        "adminRoute": None,
        "icon": "🌿",
        "size": "8 MB",
        "dependencies": [],
        "realPackage": "git"
    },
    "rclone": {
        "id": "rclone",
        "name": "Rclone",
        "description": "Sincronização com serviços de nuvem (OneDrive, Google Drive, etc)",
        "category": "backup",
        "hasAdminPanel": True,
        "adminRoute": "/packages/backup",
        "icon": "☁️",
        "size": "15 MB",
        "dependencies": [],
        "realPackage": "rclone"
    },
    "htop": {
        "id": "htop",
        "name": "htop",
        "description": "Monitor de processos interativo e colorido",
        "category": "system",
        "hasAdminPanel": False,
        "adminRoute": None,
        "icon": "📊",
        "size": "1 MB",
        "dependencies": [],
        "realPackage": "htop"
    },
    "curl": {
        "id": "curl",
        "name": "cURL",
        "description": "Ferramenta de linha de comando para transferir dados",
        "category": "system",
        "hasAdminPanel": False,
        "adminRoute": None,
        "icon": "🌐",
        "size": "2 MB",
        "dependencies": ["libcurl4"],
        "realPackage": "curl"
    }
}

CATEGORIES = {
    "database": {"name": "Banco de Dados", "count": 0},
    "web": {"name": "Servidores Web", "count": 0},
    "development": {"name": "Desenvolvimento", "count": 0},
    "security": {"name": "Segurança", "count": 0},
    "system": {"name": "Sistema", "count": 0},
    "backup": {"name": "Backup", "count": 0}
}

def check_package_installed(package_name: str) -> tuple[bool, str]:
    """Verificar se um pacote está instalado."""
    try:
        # Usar o nome real do pacote
        real_package = ESSENTIAL_PACKAGES.get(package_name, {}).get("realPackage", package_name)
        
        result = subprocess.run(
            f"dpkg -l | grep -E '^ii.*{real_package}'",
            shell=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0 and result.stdout.strip():
            # Extrair versão da saída do dpkg
            lines = result.stdout.strip().split('\n')
            if lines:
                parts = lines[0].split()
                if len(parts) >= 3:
                    version = parts[2]
                    return True, version
            return True, "installed"
        
        return False, ""
    except Exception:
        return False, ""

def get_available_version(package_name: str) -> str:
    """Obter versão disponível de um pacote."""
    try:
        # Usar o nome real do pacote
        real_package = ESSENTIAL_PACKAGES.get(package_name, {}).get("realPackage", package_name)
        
        result = subprocess.run(
            f"apt-cache policy {real_package} | grep Candidate",
            shell=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0 and result.stdout:
            parts = result.stdout.split()
            if len(parts) >= 2:
                return parts[1]
    except Exception:
        pass
    return "latest"

def has_updates_available(package_name: str) -> bool:
    """Verificar se há atualizações disponíveis para um pacote."""
    try:
        # Para pacotes com múltiplas versões, não mostrar atualizações
        # pois as versões são gerenciadas separadamente
        pkg_info = ESSENTIAL_PACKAGES.get(package_name, {})
        if pkg_info.get("multiVersion", False):
            return False
        
        # Usar o nome real do pacote
        real_package = pkg_info.get("realPackage", package_name)
        
        # Primeiro, verificar se o pacote está na lista de upgradable
        result = subprocess.run(
            "apt list --upgradable 2>/dev/null",
            shell=True,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            # Verificar se o pacote real está na lista de upgradable
            upgradable_lines = result.stdout.split('\n')
            for line in upgradable_lines:
                if line.startswith(f"{real_package}/"):
                    return True
        
        # Verificação adicional: comparar versão instalada com candidate usando apt-cache policy
        policy_result = subprocess.run(
            f"apt-cache policy {real_package}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if policy_result.returncode == 0 and policy_result.stdout:
            lines = policy_result.stdout.split('\n')
            installed_version = None
            candidate_version = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('Installed:'):
                    installed_version = line.split(':', 1)[1].strip()
                elif line.startswith('Candidate:'):
                    candidate_version = line.split(':', 1)[1].strip()
            
            # Debug: log das versões encontradas
            print(f"DEBUG - {package_name}: Installed={installed_version}, Candidate={candidate_version}")
            
            # Se as versões são diferentes e candidate não é '(none)', há atualizações
            if (installed_version and candidate_version and 
                installed_version != candidate_version and 
                candidate_version != '(none)' and
                installed_version != '(none)'):
                return True
        
        return False
    except Exception as e:
        print(f"Erro ao verificar atualizações para {package_name}: {e}")
        return False

@router.get("/")
async def get_packages(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: str = Depends(verify_token)
):
    """Obter lista de pacotes com paginação."""
    from fastapi import Response
    
    try:
        # Atualizar contagem de categorias
        for cat_id in CATEGORIES:
            CATEGORIES[cat_id]["count"] = sum(1 for pkg in ESSENTIAL_PACKAGES.values() if pkg["category"] == cat_id)
        
        packages = []
        
        for pkg_id, pkg_info in ESSENTIAL_PACKAGES.items():
            # Aplicar filtros
            if category and pkg_info["category"] != category:
                continue
                
            if search and search.lower() not in pkg_info["name"].lower() and search.lower() not in pkg_info["description"].lower():
                continue
            
            # Verificar estado real do pacote no container
            real_package = pkg_info.get("realPackage", pkg_id)
            try:
                result = subprocess.run(
                    f"dpkg -l | grep -E '^ii.*{real_package}'",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0 and result.stdout.strip():
                    # Extrair versão real
                    lines = result.stdout.strip().split('\n')
                    if lines:
                        parts = lines[0].split()
                        version = parts[2] if len(parts) >= 3 else "installed"
                    else:
                        version = "installed"
                    installed = True
                else:
                    installed = False
                    version = None
                    
            except Exception:
                # Em caso de erro, assumir não instalado
                installed = False
                version = None
            
            # Verificar versão disponível e atualizações
            try:
                available_result = subprocess.run(
                    f"apt-cache policy {real_package} | grep Candidate | awk '{{print $2}}'",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                available_version = available_result.stdout.strip() if available_result.returncode == 0 else "latest"
                
                # Verificar se há atualizações disponíveis
                has_updates = has_updates_available(pkg_id) if installed else False
                
            except:
                available_version = "latest"
                has_updates = False
            
            package = {
                **pkg_info,
                "installed": installed,
                "version": version,
                "availableVersion": available_version,
                "status": "installed" if installed else "available",
                "lastUpdated": "2024-12-01" if installed else None,
                "hasUpdates": has_updates
            }
            
            # Log temporário para debug do PHP
            if pkg_id == "php":
                print(f"DEBUG PHP FINAL: {json.dumps({'id': pkg_id, 'installed': installed, 'hasUpdates': has_updates, 'multiVersion': pkg_info.get('multiVersion', False)})}")
            
            packages.append(package)
        
        # Paginação
        total = len(packages)
        start = (page - 1) * pageSize
        end = start + pageSize
        paginated_packages = packages[start:end]
        
        return {
            "packages": paginated_packages,
            "total": total,
            "page": page,
            "pageSize": pageSize,
            "totalPages": (total + pageSize - 1) // pageSize
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter pacotes: {str(e)}")

@router.get("/categories")
async def get_categories(current_user: str = Depends(verify_token)):
    """Obter categorias de pacotes."""
    try:
        # Atualizar contagem
        for cat_id in CATEGORIES:
            CATEGORIES[cat_id]["count"] = sum(1 for pkg in ESSENTIAL_PACKAGES.values() if pkg["category"] == cat_id)
        
        return [
            {"id": cat_id, "name": cat_info["name"], "count": cat_info["count"]}
            for cat_id, cat_info in CATEGORIES.items()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter categorias: {str(e)}")

@router.get("/{package_id}")
async def get_package_details(package_id: str, current_user: str = Depends(verify_token)):
    """Obter detalhes de um pacote específico."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        installed, version = check_package_installed(package_id)
        available_version = get_available_version(package_id)
        has_updates = has_updates_available(package_id) if installed else False
        
        # Log temporário para debug do endpoint específico
        if package_id == "php":
            print(f"DEBUG PHP DETAILS: {json.dumps({'endpoint': 'get_package_details', 'id': package_id, 'installed': installed, 'hasUpdates': has_updates})}")
        
        return {
            **pkg_info,
            "installed": installed,
            "version": version if installed else None,
            "availableVersion": available_version,
            "status": "installed" if installed else "available",
            "hasUpdates": has_updates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter detalhes do pacote: {str(e)}")

@router.post("/install")
async def install_package(request: dict, current_user: str = Depends(verify_token)):
    """Instalar um pacote no container (instalação real)."""
    try:
        package_id = request.get("packageId")
        if not package_id or package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=400, detail="Pacote inválido")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        real_package = pkg_info.get("realPackage", package_id)
        
        # Verificar se já está instalado
        try:
            result = subprocess.run(
                f"dpkg -l | grep -E '^ii.*{real_package}'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                return {"success": True, "message": f"Pacote {package_id} já está instalado"}
        except:
            pass
        
        print(f"Instalando pacote: {package_id} (pacote real: {real_package})")
        
        # Instalação real no container
        try:
            # Atualizar repositórios primeiro
            update_result = subprocess.run(
                "apt-get update",
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if update_result.returncode != 0:
                print(f"Aviso: apt-get update falhou: {update_result.stderr}")
            
            # Para .NET, adicionar repositório Microsoft primeiro
            if package_id == "dotnet":
                # Instalar dependências necessárias
                subprocess.run(
                    "apt-get install -y wget apt-transport-https",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                # Adicionar chave e repositório Microsoft
                subprocess.run(
                    "wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                subprocess.run(
                    "dpkg -i packages-microsoft-prod.deb",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                subprocess.run(
                    "apt-get update",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
            
            # Instalar o pacote
            install_result = subprocess.run(
                f"DEBIAN_FRONTEND=noninteractive apt-get install -y {real_package}",
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutos
            )
            
            if install_result.returncode == 0:
                print(f"Pacote {package_id} instalado com sucesso!")
                return {"success": True, "message": f"Pacote {package_id} instalado com sucesso!"}
            else:
                error_msg = install_result.stderr or "Erro desconhecido na instalação"
                print(f"Erro na instalação de {package_id}: {error_msg}")
                return {"success": False, "message": f"Erro ao instalar {package_id}: {error_msg}"}
                
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Timeout na instalação do pacote")
        except Exception as e:
            print(f"Exceção durante instalação: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao instalar pacote: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao instalar pacote: {str(e)}")

@router.delete("/{package_id}")
async def uninstall_package(package_id: str, current_user: str = Depends(verify_token)):
    """Remover um pacote do container (remoção real)."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        real_package = pkg_info.get("realPackage", package_id)
        
        print(f"Removendo pacote: {package_id} (pacote real: {real_package})")
        
        # Remoção real no container
        try:
            remove_result = subprocess.run(
                f"DEBIAN_FRONTEND=noninteractive apt-get remove -y {real_package}",
                shell=True,
                capture_output=True,
                text=True,
                timeout=120  # 2 minutos
            )
            
            if remove_result.returncode == 0:
                print(f"Pacote {package_id} removido com sucesso!")
                return {"success": True, "message": f"Pacote {package_id} removido com sucesso!"}
            else:
                error_msg = remove_result.stderr or "Erro desconhecido na remoção"
                print(f"Erro na remoção de {package_id}: {error_msg}")
                return {"success": False, "message": f"Erro ao remover {package_id}: {error_msg}"}
                
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Timeout na remoção do pacote")
        except Exception as e:
            print(f"Exceção durante remoção: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao remover pacote: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover pacote: {str(e)}")

@router.post("/{package_id}/update")
async def update_package(package_id: str, current_user: str = Depends(verify_token)):
    """Atualizar um pacote no container (atualização real)."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        real_package = pkg_info.get("realPackage", package_id)
        
        # Verificar se está instalado
        try:
            result = subprocess.run(
                f"dpkg -l | grep -E '^ii.*{real_package}'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0 or not result.stdout.strip():
                raise HTTPException(status_code=400, detail="Pacote não está instalado")
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=400, detail="Erro ao verificar status do pacote")
        
        # Verificar se há atualizações disponíveis antes de tentar atualizar
        if not has_updates_available(package_id):
            return {"success": True, "message": f"Pacote {package_id} já está na versão mais recente"}
        
        print(f"Atualizando pacote: {package_id} (pacote real: {real_package})")
        
        # Atualização real no container
        try:
            # Atualizar repositórios primeiro
            update_result = subprocess.run(
                "apt-get update",
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            # Verificar novamente se há atualizações após update do repositório
            if not has_updates_available(package_id):
                return {"success": True, "message": f"Pacote {package_id} já está na versão mais recente"}
            
            # Atualizar o pacote específico
            upgrade_result = subprocess.run(
                f"DEBIAN_FRONTEND=noninteractive apt-get install --only-upgrade -y {real_package}",
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutos
            )
            
            if upgrade_result.returncode == 0:
                print(f"Pacote {package_id} atualizado com sucesso!")
                return {"success": True, "message": f"Pacote {package_id} atualizado com sucesso!"}
            else:
                error_msg = upgrade_result.stderr or "Erro desconhecido na atualização"
                print(f"Erro na atualização de {package_id}: {error_msg}")
                return {"success": False, "message": f"Erro ao atualizar {package_id}: {error_msg}"}
                
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Timeout na atualização do pacote")
        except Exception as e:
            print(f"Exceção durante atualização: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao atualizar pacote: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pacote: {str(e)}")

@router.get("/{package_id}/versions")
async def get_package_versions(package_id: str, current_user: str = Depends(verify_token)):
    """Obter informações sobre versões de um pacote de desenvolvimento."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        
        if not pkg_info.get("multiVersion", False):
            raise HTTPException(status_code=400, detail="Este pacote não suporta gerenciamento de múltiplas versões")
        
        installed_versions = get_installed_versions(package_id)
        default_version = get_default_version(package_id)
        available_versions = pkg_info.get("availableVersions", [])
        version_manager = pkg_info.get("versionManager", "manual")
        
        return {
            "packageId": package_id,
            "packageName": pkg_info["name"],
            "versionManager": version_manager,
            "availableVersions": available_versions,
            "installedVersions": installed_versions,
            "defaultVersion": default_version,
            "supportsMultipleVersions": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter versões do pacote: {str(e)}")

@router.post("/{package_id}/versions/{version}/install")
async def install_package_version(package_id: str, version: str, current_user: str = Depends(verify_token)):
    """Instalar uma versão específica de um pacote de desenvolvimento."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        
        if not pkg_info.get("multiVersion", False):
            raise HTTPException(status_code=400, detail="Este pacote não suporta gerenciamento de múltiplas versões")
        
        available_versions = pkg_info.get("availableVersions", [])
        if version not in available_versions:
            raise HTTPException(status_code=400, detail=f"Versão {version} não está disponível")
        
        print(f"Instalando {package_id} versão {version}")
        
        try:
            # Atualizar repositórios primeiro
            subprocess.run("apt-get update", shell=True, capture_output=True, text=True, timeout=60)
            
            if package_id == "dotnet":
                # Instalar versão específica do .NET
                install_result = subprocess.run(
                    f"DEBIAN_FRONTEND=noninteractive apt-get install -y dotnet-runtime-{version} dotnet-sdk-{version}",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
            
            elif package_id == "nodejs":
                # Instalar NVM se não estiver instalado
                nvm_check = subprocess.run(
                    "which nvm",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if nvm_check.returncode != 0:
                    # Instalar NVM
                    subprocess.run(
                        "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash",
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=120
                    )
                
                # Instalar versão do Node.js via NVM
                install_result = subprocess.run(
                    f"bash -c 'source ~/.nvm/nvm.sh && nvm install {version} && nvm use {version}'",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
            
            elif package_id == "php":
                # Verificar se o repositório Sury está configurado
                sury_check = subprocess.run(
                    "ls /etc/apt/sources.list.d/ | grep -i sury",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if sury_check.returncode != 0:
                    print("Configurando repositório Sury para PHP...")
                    # Instalar dependências
                    subprocess.run(
                        "DEBIAN_FRONTEND=noninteractive apt-get install -y lsb-release apt-transport-https ca-certificates wget",
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=120
                    )
                    
                    # Adicionar chave GPG do repositório
                    subprocess.run(
                        "wget -qO /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg",
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    
                    # Adicionar repositório
                    subprocess.run(
                        'echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/sury-php.list',
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    
                    # Atualizar índices de pacotes
                    subprocess.run(
                        "apt-get update",
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                
                # Instalar versão específica do PHP
                install_result = subprocess.run(
                    f"DEBIAN_FRONTEND=noninteractive apt-get install -y php{version} php{version}-cli php{version}-common php{version}-fpm",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
            
            if install_result.returncode == 0:
                return {"success": True, "message": f"{pkg_info['name']} versão {version} instalada com sucesso!"}
            else:
                error_msg = install_result.stderr or "Erro desconhecido na instalação"
                return {"success": False, "message": f"Erro ao instalar versão {version}: {error_msg}"}
                
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Timeout na instalação da versão")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao instalar versão: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao instalar versão: {str(e)}")

@router.post("/{package_id}/versions/{version}/set-default")
async def set_default_version(package_id: str, version: str, current_user: str = Depends(verify_token)):
    """Definir a versão padrão de um pacote de desenvolvimento."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        
        if not pkg_info.get("multiVersion", False):
            raise HTTPException(status_code=400, detail="Este pacote não suporta gerenciamento de múltiplas versões")
        
        installed_versions = get_installed_versions(package_id)
        if version not in installed_versions:
            raise HTTPException(status_code=400, detail=f"Versão {version} não está instalada")
        
        print(f"Definindo {package_id} versão {version} como padrão")
        
        try:
            if package_id == "nodejs":
                # Usar NVM para definir versão padrão
                # Buscar a versão completa correspondente à versão principal
                list_result = subprocess.run(
                    "bash -c 'source ~/.nvm/nvm.sh && nvm list'",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                full_version = None
                if list_result.returncode == 0:
                    for line in list_result.stdout.split('\n'):
                        if f'v{version}.' in line:
                            match = re.search(r'v(\d+\.\d+\.\d+)', line)
                            if match:
                                full_version = match.group(1)
                                break
                
                if full_version:
                    result = subprocess.run(
                        f"bash -c 'source ~/.nvm/nvm.sh && nvm alias default {full_version} && nvm use default'",
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                else:
                    raise Exception(f"Versão completa para {version} não encontrada")
            
            elif package_id == "php":
                # Primeiro, configurar alternatives se não estiver configurado
                check_alt = subprocess.run(
                    "update-alternatives --list php",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if check_alt.returncode != 0:
                    # Configurar alternatives para PHP
                    priority = 100
                    for ver in ["8.1", "8.2", "8.3"]:
                        php_path = f"/usr/bin/php{ver}"
                        check_path = subprocess.run(
                            f"test -f {php_path}",
                            shell=True,
                            capture_output=True,
                            timeout=5
                        )
                        if check_path.returncode == 0:
                            subprocess.run(
                                f"update-alternatives --install /usr/bin/php php {php_path} {priority}",
                                shell=True,
                                capture_output=True,
                                text=True,
                                timeout=10
                            )
                            priority += 10
                
                # Definir versão padrão
                result = subprocess.run(
                    f"update-alternatives --set php /usr/bin/php{version}",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            
            elif package_id == "dotnet":
                # Para .NET, a versão mais recente é usada automaticamente
                return {"success": True, "message": f".NET {version} definido como padrão"}
            
            if result.returncode == 0:
                return {"success": True, "message": f"{pkg_info['name']} versão {version} definida como padrão"}
            else:
                error_msg = result.stderr or "Erro desconhecido"
                return {"success": False, "message": f"Erro ao definir versão padrão: {error_msg}"}
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao definir versão padrão: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao definir versão padrão: {str(e)}")

@router.delete("/{package_id}/versions/{version}")
async def uninstall_package_version(package_id: str, version: str, current_user: str = Depends(verify_token)):
    """Remover uma versão específica de um pacote de desenvolvimento."""
    try:
        if package_id not in ESSENTIAL_PACKAGES:
            raise HTTPException(status_code=404, detail="Pacote não encontrado")
        
        pkg_info = ESSENTIAL_PACKAGES[package_id]
        
        if not pkg_info.get("multiVersion", False):
            raise HTTPException(status_code=400, detail="Este pacote não suporta gerenciamento de múltiplas versões")
        
        installed_versions = get_installed_versions(package_id)
        if version not in installed_versions:
            raise HTTPException(status_code=400, detail=f"Versão {version} não está instalada")
        
        # Verificar se não é a única versão instalada
        if len(installed_versions) == 1:
            raise HTTPException(status_code=400, detail="Não é possível remover a única versão instalada")
        
        print(f"Removendo {package_id} versão {version}")
        
        try:
            if package_id == "dotnet":
                # Remover versão específica do .NET
                result = subprocess.run(
                    f"DEBIAN_FRONTEND=noninteractive apt-get remove -y dotnet-runtime-{version} dotnet-sdk-{version}",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
            
            elif package_id == "nodejs":
                # Remover versão via NVM
                result = subprocess.run(
                    f"bash -c 'source ~/.nvm/nvm.sh && nvm uninstall {version}'",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
            
            elif package_id == "php":
                # Remover versão específica do PHP
                result = subprocess.run(
                    f"DEBIAN_FRONTEND=noninteractive apt-get remove -y php{version} php{version}-cli php{version}-common",
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
            
            if result.returncode == 0:
                return {"success": True, "message": f"{pkg_info['name']} versão {version} removida com sucesso!"}
            else:
                error_msg = result.stderr or "Erro desconhecido na remoção"
                return {"success": False, "message": f"Erro ao remover versão {version}: {error_msg}"}
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao remover versão: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover versão: {str(e)}")

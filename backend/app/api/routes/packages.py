from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
import subprocess
import json
from app.api.routes.auth import verify_token

router = APIRouter()

# Lista de pacotes essenciais com suas informações
ESSENTIAL_PACKAGES = {
    "mysql-server": {
        "id": "mysql-server",
        "name": "MySQL Server",
        "description": "Sistema de gerenciamento de banco de dados relacional de código aberto",
        "category": "database",
        "hasAdminPanel": True,
        "adminRoute": "/packages/mysql",
        "icon": "🗄️",
        "size": "142 MB",
        "dependencies": ["mysql-client", "mysql-common"]
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
        "dependencies": ["postgresql-client", "postgresql-common"]
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
        "dependencies": ["nginx-common", "nginx-core"]
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
        "dependencies": ["php-common", "php-cli"]
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
        "dependencies": ["npm"]
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
        "dependencies": ["dotnet-runtime", "aspnetcore-runtime"]
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
        "dependencies": ["redis-tools"]
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
        "dependencies": ["python3-certbot"]
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
        "dependencies": ["iptables"]
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
        "dependencies": ["python3"]
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
        "dependencies": ["containerd", "docker-compose"]
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
        "dependencies": []
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
        "dependencies": []
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
        "dependencies": []
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
        "dependencies": ["libcurl4"]
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
        result = subprocess.run(
            f"dpkg -l | grep -E '^ii.*{package_name}'",
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
        result = subprocess.run(
            f"apt-cache policy {package_name} | grep Candidate",
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


@router.get("/installed")
async def get_installed_packages(current_user: str = Depends(verify_token)):
    """Obter lista de pacotes instalados."""
    try:
        result = subprocess.run(
            "dpkg -l",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Erro ao obter pacotes instalados")
        
        packages = []
        lines = result.stdout.split('\n')
        
        for line in lines:
            # Parse da saída do dpkg -l
            if line.startswith('ii '):  # Pacotes instalados
                parts = line.split()
                if len(parts) >= 4:
                    package_name = parts[1]
                    version = parts[2]
                    architecture = parts[3]
                    description = " ".join(parts[4:]) if len(parts) > 4 else ""
                    
                    packages.append({
                        "name": package_name,
                        "version": version,
                        "architecture": architecture,
                        "description": description,
                        "status": "installed"
                    })
        
        return {"packages": packages, "total_count": len(packages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter pacotes instalados: {str(e)}")


@router.get("/updates")
async def get_available_updates(current_user: str = Depends(verify_token)):
    """Obter lista de atualizações disponíveis."""
    try:
        # Atualizar lista de pacotes
        update_result = subprocess.run(
            "apt update",
            shell=True,
            capture_output=True,
            text=True
        )
        
        # Listar atualizações disponíveis
        result = subprocess.run(
            "apt list --upgradable",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Erro ao obter atualizações")
        
        updates = []
        lines = result.stdout.split('\n')[1:]  # Pular cabeçalho
        
        for line in lines:
            if '/' in line and '[upgradable' in line:
                # Parse da linha de atualização
                match = re.match(r'^([^/]+)/[^\s]+\s+([^\s]+)\s+[^\[]+\[upgradable from:\s*([^\]]+)\]', line)
                if match:
                    package_name = match.group(1)
                    new_version = match.group(2)
                    current_version = match.group(3)
                    
                    updates.append({
                        "name": package_name,
                        "current_version": current_version,
                        "new_version": new_version
                    })
        
        return {"updates": updates, "total_count": len(updates)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter atualizações: {str(e)}")


@router.get("/search/{query}")
async def search_packages(query: str, current_user: str = Depends(verify_token)):
    """Pesquisar pacotes disponíveis."""
    try:
        result = subprocess.run(
            f"apt search {query}",
            shell=True,
            capture_output=True,
            text=True
        )
        
        packages = []
        lines = result.stdout.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if '/' in line and not line.startswith('WARNING'):
                # Parse da linha do pacote
                parts = line.split(' - ', 1)
                if len(parts) == 2:
                    package_info = parts[0]
                    description = parts[1]
                    
                    # Extrair nome e versão
                    pkg_parts = package_info.split('/')
                    if len(pkg_parts) >= 2:
                        package_name = pkg_parts[0]
                        version_arch = pkg_parts[1].split(' ')[0]
                        
                        # Verificar se há descrição adicional na próxima linha
                        full_description = description
                        if i + 1 < len(lines) and lines[i + 1].startswith('  '):
                            full_description += " " + lines[i + 1].strip()
                            i += 1
                        
                        packages.append({
                            "name": package_name,
                            "version": version_arch,
                            "description": full_description
                        })
            i += 1
        
        return {"packages": packages[:50], "query": query}  # Limitar a 50 resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao pesquisar pacotes: {str(e)}")


@router.get("/{package_name}")
async def get_package_info(package_name: str, current_user: str = Depends(verify_token)):
    """Obter informações detalhadas de um pacote."""
    try:
        # Informações do pacote
        show_result = subprocess.run(
            f"apt show {package_name}",
            shell=True,
            capture_output=True,
            text=True
        )
        
        package_info = {
            "name": package_name,
            "installed": False,
            "details": {}
        }
        
        if show_result.returncode == 0:
            # Parse das informações
            for line in show_result.stdout.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    package_info["details"][key.strip()] = value.strip()
        
        # Verificar se está instalado
        status_result = subprocess.run(
            f"dpkg -l {package_name}",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if status_result.returncode == 0:
            for line in status_result.stdout.split('\n'):
                if line.startswith('ii ') and package_name in line:
                    package_info["installed"] = True
                    break
        
        return package_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter informações do pacote: {str(e)}")


@router.post("/install")
async def install_package(package_data: Dict[str, Any], current_user: str = Depends(verify_token)):
    """Instalar um pacote."""
    try:
        package_name = package_data.get("package_name")
        if not package_name:
            raise HTTPException(status_code=400, detail="Nome do pacote é obrigatório")
        
        result = subprocess.run(
            f"apt install -y {package_name}",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Erro ao instalar pacote: {result.stderr}"
            )
        
        return {
            "message": f"Pacote {package_name} instalado com sucesso",
            "output": result.stdout
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao instalar pacote: {str(e)}")


@router.delete("/{package_name}")
async def remove_package(package_name: str, purge: bool = False, current_user: str = Depends(verify_token)):
    """Remover um pacote."""
    try:
        cmd = f"apt {'purge' if purge else 'remove'} -y {package_name}"
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Erro ao remover pacote: {result.stderr}"
            )
        
        action = "purgado" if purge else "removido"
        return {
            "message": f"Pacote {package_name} {action} com sucesso",
            "output": result.stdout
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover pacote: {str(e)}")


@router.post("/update")
async def update_package_list(current_user: str = Depends(verify_token)):
    """Atualizar lista de pacotes."""
    try:
        result = subprocess.run(
            "apt update",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Erro ao atualizar lista de pacotes: {result.stderr}"
            )
        
        return {
            "message": "Lista de pacotes atualizada com sucesso",
            "output": result.stdout
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar lista: {str(e)}")


@router.post("/upgrade")
async def upgrade_packages(package_data: Dict[str, Any] = None, current_user: str = Depends(verify_token)):
    """Atualizar pacotes do sistema."""
    try:
        specific_packages = package_data.get("packages", []) if package_data else []
        
        if specific_packages:
            # Atualizar pacotes específicos
            packages_str = " ".join(specific_packages)
            cmd = f"apt install -y {packages_str}"
        else:
            # Atualizar todos os pacotes
            cmd = "apt upgrade -y"
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Erro ao atualizar pacotes: {result.stderr}"
            )
        
        return {
            "message": "Pacotes atualizados com sucesso",
            "output": result.stdout
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pacotes: {str(e)}")


@router.post("/autoremove")
async def autoremove_packages(current_user: str = Depends(verify_token)):
    """Remover pacotes órfãos."""
    try:
        result = subprocess.run(
            "apt autoremove -y",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Erro ao remover pacotes órfãos: {result.stderr}"
            )
        
        return {
            "message": "Pacotes órfãos removidos com sucesso",
            "output": result.stdout
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover pacotes órfãos: {str(e)}")


@router.get("/repositories/list")
async def get_repositories(current_user: str = Depends(verify_token)):
    """Obter lista de repositórios configurados."""
    try:
        sources_files = []
        
        # Ler sources.list principal
        try:
            with open('/etc/apt/sources.list', 'r') as f:
                content = f.read()
                sources_files.append({
                    "file": "/etc/apt/sources.list",
                    "content": content.split('\n')
                })
        except FileNotFoundError:
            pass
        
        # Ler arquivos em sources.list.d
        result = subprocess.run(
            "find /etc/apt/sources.list.d -name '*.list' -type f",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            for file_path in result.stdout.strip().split('\n'):
                if file_path:
                    try:
                        with open(file_path, 'r') as f:
                            content = f.read()
                            sources_files.append({
                                "file": file_path,
                                "content": content.split('\n')
                            })
                    except (FileNotFoundError, PermissionError):
                        continue
        
        return {"repositories": sources_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter repositórios: {str(e)}")


@router.get("/cache/info")
async def get_cache_info(current_user: str = Depends(verify_token)):
    """Obter informações do cache do APT."""
    try:
        # Tamanho do cache
        cache_result = subprocess.run(
            "du -sh /var/cache/apt/archives",
            shell=True,
            capture_output=True,
            text=True
        )
        
        cache_size = "Desconhecido"
        if cache_result.returncode == 0:
            cache_size = cache_result.stdout.split()[0]
        
        # Estatísticas do APT
        stats_result = subprocess.run(
            "apt-cache stats",
            shell=True,
            capture_output=True,
            text=True
        )
        
        stats = {}
        if stats_result.returncode == 0:
            for line in stats_result.stdout.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    stats[key.strip()] = value.strip()
        
        return {
            "cache_size": cache_size,
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter informações do cache: {str(e)}")


@router.post("/cache/clean")
async def clean_cache(current_user: str = Depends(verify_token)):
    """Limpar cache do APT."""
    try:
        result = subprocess.run(
            "apt clean",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Erro ao limpar cache: {result.stderr}"
            )
        
        return {"message": "Cache limpo com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar cache: {str(e)}")

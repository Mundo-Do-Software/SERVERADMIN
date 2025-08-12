from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import subprocess
import platform
from datetime import datetime
import jwt
import os

# Importar módulo de compatibilidade
from app.core.unix_compat import pwd_getpwall, pwd_getpwnam, grp_getgrall, spwd_getspnam, IS_WINDOWS

router = APIRouter()
security = HTTPBearer()

# Configurações JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifica e decodifica o token JWT
    """
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/", response_model=List[Dict[str, Any]])
async def get_users(current_user: str = Depends(verify_token)):
    """Obter lista de usuários do sistema."""
    try:
        users = []
        for user in pwd_getpwall():
            try:
                # Obter informações adicionais do usuário
                shadow_info = None
                if not IS_WINDOWS:
                    try:
                        shadow_info = spwd_getspnam(user.pw_name)
                    except (PermissionError, KeyError):
                        pass  # Sem permissão para acessar shadow ou usuário não existe
                
                # Obter grupos do usuário
                user_groups = []
                for group in grp_getgrall():
                    if user.pw_name in group.gr_mem or group.gr_gid == user.pw_gid:
                        user_groups.append(group.gr_name)
                
                # Verificar se o usuário está bloqueado (apenas no Linux)
                is_active = True
                if not IS_WINDOWS and shadow_info:
                    # Verificar se a senha está bloqueada (prefixo ! ou *)
                    if shadow_info.sp_pwdp and (shadow_info.sp_pwdp.startswith('!') or shadow_info.sp_pwdp.startswith('*')):
                        is_active = False
                
                user_info = {
                    "username": user.pw_name,
                    "uid": user.pw_uid,
                    "gid": user.pw_gid,
                    "home": user.pw_dir,
                    "shell": user.pw_shell,
                    "gecos": user.pw_gecos,
                    "groups": user_groups,
                    "is_active": is_active,
                    "last_password_change": None,
                    "password_expires": None
                }
                
                if shadow_info:
                    if shadow_info.sp_lstchg:
                        user_info["last_password_change"] = datetime.fromtimestamp(
                            shadow_info.sp_lstchg * 86400
                        ).isoformat()
                    
                    if shadow_info.sp_expire and shadow_info.sp_expire != -1:
                        user_info["password_expires"] = datetime.fromtimestamp(
                            shadow_info.sp_expire * 86400
                        ).isoformat()
                
                users.append(user_info)
            except Exception as e:
                continue  # Pular usuários com problemas
        
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter usuários: {str(e)}")


@router.get("/groups", response_model=List[Dict[str, Any]])
async def get_groups(current_user: str = Depends(verify_token)):
    """Obter lista de grupos do sistema."""
    try:
        groups = []
        for group in grp_getgrall():
            group_info = {
                "name": group.gr_name,
                "gid": group.gr_gid,
                "members": list(group.gr_mem)
            }
            groups.append(group_info)
        
        return groups
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter grupos: {str(e)}")


@router.get("/{username}")
async def get_user_details(username: str, current_user: str = Depends(verify_token)):
    """Obter detalhes de um usuário específico."""
    try:
        # Verificar se o usuário existe
        user = pwd_getpwnam(username)
        
        # Obter grupos do usuário
        user_groups = []
        for group in grp_getgrall():
            if username in group.gr_mem or group.gr_gid == user.pw_gid:
                user_groups.append({
                    "name": group.gr_name,
                    "gid": group.gr_gid
                })
        
        # Obter último login (apenas no Linux)
        last_login = None
        if not IS_WINDOWS:
            try:
                result = subprocess.run(
                    f"last -1 {username}",
                    shell=True,
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0 and result.stdout.strip():
                    last_login = result.stdout.strip().split('\n')[0]
            except:
                pass
        
        # Informações do shadow (apenas no Linux)
        shadow_info = None
        if not IS_WINDOWS:
            try:
                shadow_info = spwd_getspnam(username)
            except (PermissionError, KeyError):
                pass
        
        user_details = {
            "username": user.pw_name,
            "uid": user.pw_uid,
            "gid": user.pw_gid,
            "home": user.pw_dir,
            "shell": user.pw_shell,
            "gecos": user.pw_gecos,
            "groups": user_groups,
            "last_login": last_login,
            "account_locked": False,
            "password_set": True if shadow_info and shadow_info.sp_pwdp != "*" else False
        }
        
        return user_details
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Usuário {username} não encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter detalhes do usuário: {str(e)}")


@router.post("/")
async def create_user(user_data: Dict[str, Any], current_user: str = Depends(verify_token)):
    """Criar um novo usuário."""
    if IS_WINDOWS:
        raise HTTPException(status_code=501, detail="Criação de usuários não suportada no Windows")
    
    try:
        username = user_data.get("username")
        password = user_data.get("password")
        create_home = user_data.get("create_home", True)
        home_dir = user_data.get("home", f"/home/{username}")
        shell = user_data.get("shell", "/bin/bash")
        groups = user_data.get("groups", [])
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username e password são obrigatórios")
        
        # Comando para criar usuário
        if create_home:
            cmd = f"useradd -m -d {home_dir} -s {shell} {username}"
        else:
            cmd = f"useradd -d {home_dir} -s {shell} {username}"
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao criar usuário: {result.stderr}")
        
        # Definir senha
        passwd_cmd = f"echo '{username}:{password}' | chpasswd"
        passwd_result = subprocess.run(passwd_cmd, shell=True, capture_output=True, text=True)
        if passwd_result.returncode != 0:
            # Se falhou ao definir senha, remover usuário criado
            subprocess.run(f"userdel -r {username}", shell=True)
            raise HTTPException(status_code=400, detail=f"Erro ao definir senha: {passwd_result.stderr}")
        
        # Adicionar a grupos
        for group in groups:
            group_cmd = f"usermod -a -G {group} {username}"
            subprocess.run(group_cmd, shell=True)
        
        return {"message": f"Usuário {username} criado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.put("/{username}")
async def update_user(username: str, user_data: Dict[str, Any], current_user: str = Depends(verify_token)):
    """Atualizar informações de um usuário."""
    if IS_WINDOWS:
        raise HTTPException(status_code=501, detail="Atualização de usuários não suportada no Windows")
    
    try:
        # Verificar se o usuário existe
        pwd_getpwnam(username)
        
        new_password = user_data.get("password")
        new_shell = user_data.get("shell")
        new_groups = user_data.get("groups")
        
        # Atualizar senha se fornecida
        if new_password:
            passwd_cmd = f"echo '{username}:{new_password}' | chpasswd"
            result = subprocess.run(passwd_cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                raise HTTPException(status_code=400, detail=f"Erro ao atualizar senha: {result.stderr}")
        
        # Atualizar shell se fornecido
        if new_shell:
            shell_cmd = f"usermod -s {new_shell} {username}"
            result = subprocess.run(shell_cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                raise HTTPException(status_code=400, detail=f"Erro ao atualizar shell: {result.stderr}")
        
        # Atualizar grupos se fornecidos
        if new_groups is not None:
            # Remover de todos os grupos secundários
            current_groups = [g.gr_name for g in grp_getgrall() if username in g.gr_mem]
            for group in current_groups:
                subprocess.run(f"gpasswd -d {username} {group}", shell=True)
            
            # Adicionar aos novos grupos
            for group in new_groups:
                group_cmd = f"usermod -a -G {group} {username}"
                subprocess.run(group_cmd, shell=True)
        
        return {"message": f"Usuário {username} atualizado com sucesso"}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Usuário {username} não encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar usuário: {str(e)}")


@router.delete("/{username}")
async def delete_user(username: str, remove_home: bool = True, current_user: str = Depends(verify_token)):
    """Remover um usuário."""
    if IS_WINDOWS:
        raise HTTPException(status_code=501, detail="Remoção de usuários não suportada no Windows")
    
    try:
        # Verificar se o usuário existe
        pwd_getpwnam(username)
        
        # Comando para remover usuário
        cmd = f"userdel {'--remove' if remove_home else ''} {username}"
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao remover usuário: {result.stderr}")
        
        return {"message": f"Usuário {username} removido com sucesso"}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Usuário {username} não encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover usuário: {str(e)}")


@router.post("/{username}/lock")
async def lock_user(username: str, current_user: str = Depends(verify_token)):
    """Bloquear uma conta de usuário."""
    if IS_WINDOWS:
        raise HTTPException(status_code=501, detail="Bloqueio de usuários não suportado no Windows")
    
    try:
        pwd_getpwnam(username)  # Verificar se existe
        
        result = subprocess.run(f"usermod -L {username}", shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao bloquear usuário: {result.stderr}")
        
        return {"message": f"Usuário {username} bloqueado com sucesso"}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Usuário {username} não encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao bloquear usuário: {str(e)}")


@router.post("/{username}/unlock")
async def unlock_user(username: str, current_user: str = Depends(verify_token)):
    """Desbloquear uma conta de usuário."""
    if IS_WINDOWS:
        raise HTTPException(status_code=501, detail="Desbloqueio de usuários não suportado no Windows")
    
    try:
        pwd_getpwnam(username)  # Verificar se existe
        
        result = subprocess.run(f"usermod -U {username}", shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Erro ao desbloquear usuário: {result.stderr}")
        
        return {"message": f"Usuário {username} desbloqueado com sucesso"}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Usuário {username} não encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao desbloquear usuário: {str(e)}")

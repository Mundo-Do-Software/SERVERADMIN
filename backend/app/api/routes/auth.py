from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import subprocess
import jwt
from pathlib import Path
import shlex
from dotenv import load_dotenv
try:
    # PyJWT <-> exceptions compatibility
    from jwt import PyJWTError as _PyJWTError  # type: ignore
except Exception:
    try:
        from jwt.exceptions import PyJWTError as _PyJWTError  # type: ignore
    except Exception:  # fallback
        _PyJWTError = Exception  # type: ignore
import bcrypt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pwd
import grp
try:
    import simplepam  # lightweight PAM auth
    _pam_available = True
except Exception:
    simplepam = None
    _pam_available = False

# Optional fallback: python-pam library
try:
    from pam import pam as PamLib  # type: ignore
    _pam2_available = True
except Exception:
    PamLib = None
    _pam2_available = False

# Optional fallback: pexpect to drive 'su' via a PTY when PAM misbehaves
try:
    import pexpect  # type: ignore
    _pexpect_available = True
except Exception:
    pexpect = None
    _pexpect_available = False

"""Auth routes with system-user and optional env-admin support."""

# Ensure backend/.env is loaded so os.getenv picks values when running via systemd
try:
    # backend/.env (parents[3] points to backend directory)
    _backend_dir = Path(__file__).resolve().parents[3]
    load_dotenv(_backend_dir / ".env")
except Exception:
    pass

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

# Configurações JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 horas

# Admin bootstrap via .env (opcional)
ENV_ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ENV_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")  # pode ser texto puro ou hash bcrypt
ENV_ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")  # se fornecido, prioriza hash
REQUIRE_SYSTEM_USER = os.getenv("REQUIRE_SYSTEM_USER", "true").lower() in ("1", "true", "yes", "on")
AUTH_DEBUG = os.getenv("AUTH_DEBUG", "false").lower() in ("1", "true", "yes", "on")
PAM_SERVICES = [s.strip() for s in os.getenv("PAM_SERVICES", "login,su,sshd,sudo,common-auth,system-auth").split(",") if s.strip()]

def _dbg(msg: str):
    if AUTH_DEBUG:
        print(f"[AUTH] {msg}")

class LoginRequest(BaseModel):
    username: str
    password: str
    require_sudo: bool = True

class AuthResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    access_token: Optional[str] = None  # compatibility for clients expecting this key
    token_type: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

class ValidateSudoRequest(BaseModel):
    username: str
    password: str

def verify_user_credentials(username: str, password: str) -> bool:
    """
    Verifica credenciais.
    1) Se ADMIN_USERNAME/ADMIN_PASSWORD estiverem definidos, aceita esse par (bootstrap admin)
       - Suporta ADMIN_PASSWORD_HASH (bcrypt) ou senha em texto puro em ADMIN_PASSWORD
    2) Caso contrário, tenta validar como usuário do sistema via 'su'.
    """
    # 1) Fallback admin por ambiente (somente se NÃO exigir usuário do sistema)
    try:
        username = (username or "").strip()
        password = password or ""
        if ENV_ADMIN_USERNAME and username == ENV_ADMIN_USERNAME and not REQUIRE_SYSTEM_USER:
            _dbg("Env-admin path attempted")
            # Hash tem prioridade
            if ENV_ADMIN_PASSWORD_HASH:
                try:
                    ok = bcrypt.checkpw(password.encode("utf-8"), ENV_ADMIN_PASSWORD_HASH.encode("utf-8"))
                    _dbg(f"Env-admin hash match: {ok}")
                    return ok
                except Exception as ex:
                    _dbg(f"Env-admin hash check error: {ex}")
            # Comparação em texto puro
            if ENV_ADMIN_PASSWORD is not None:
                ok = password == ENV_ADMIN_PASSWORD
                _dbg(f"Env-admin plain match: {ok}")
                return ok
            # Se usuário admin definido mas senha não confere, retorna False direto
            return False
    except Exception as e:
        print(f"Error validating env admin credentials: {e}")

    # 2) Usuário do sistema (preferência por PAM)
    # Antes, verifica se o usuário existe localmente
    try:
        pwd.getpwnam(username)
        _dbg(f"pwd.getpwnam found user '{username}'")
    except KeyError:
        _dbg(f"pwd.getpwnam: user '{username}' not found")
        return False

    try:
        pam_ok = False

        if _pam2_available:
            pamh = PamLib()
            pam_services = PAM_SERVICES
            _dbg(f"python-pam using services: {pam_services}")
            for svc in pam_services:
                try:
                    ok = bool(pamh.authenticate(username, password, service=svc))
                    _dbg(f"python-pam service '{svc}' result: {ok}")
                    if ok:
                        pam_ok = True
                        break
                except Exception as e:
                    _dbg(f"python-pam service '{svc}' error: {e}")

        if not pam_ok and _pam_available:
            # Tenta múltiplos serviços PAM comuns no Ubuntu/Debian/CentOS
            pam_services = PAM_SERVICES
            _dbg(f"simplepam using services: {pam_services}")
            for svc in pam_services:
                try:
                    ok = bool(simplepam.authenticate(username, password, service=svc))
                    _dbg(f"PAM service '{svc}' result: {ok}")
                    if ok:
                        pam_ok = True
                        break
                except Exception as e:
                    _dbg(f"PAM service '{svc}' error: {e}")

        if pam_ok:
            return True

        if not _pam2_available and not _pam_available:
            _dbg("PAM not available; will try pexpect fallback if present")

        # Final fallback: use 'su' with a pseudo-terminal
        if _pexpect_available:
            try:
                cmd = ["/bin/su", "-", username, "-c", "id -u"]
                _dbg(f"pexpect running: {' '.join(map(shlex.quote, cmd))}")
                child = pexpect.spawn(cmd[0], cmd[1:], encoding='utf-8', timeout=25)
                # Match EN and PT-BR prompts and failures
                prompt_patterns = [r'[Pp]assword:', r'Senha:', r'Authentication failure', r'falha', r'incorrect password', pexpect.EOF, pexpect.TIMEOUT]
                idx = child.expect(prompt_patterns)
                if idx in (0, 1):  # got password prompt
                    child.sendline(password)
                    idx2 = child.expect([pexpect.EOF, r'Authentication failure', r'falha', r'incorrect password', pexpect.TIMEOUT])
                    child.close()
                    ok = (child.exitstatus == 0 and idx2 == 0)
                    _dbg(f"pexpect su result: {ok}, status={child.exitstatus}, idx2={idx2}")
                    return ok
                else:
                    _dbg(f"pexpect su did not get password prompt (idx={idx})")
            except Exception as e:
                _dbg(f"pexpect su error: {e}")
        else:
            _dbg("pexpect not available; skipping su fallback")
        return False
    except Exception as e:
        print(f"Error verifying credentials: {e}")
        return False

def check_sudo_privileges(username: str) -> bool:
    """
    Verifica se o usuário tem privilégios sudo
    """
    try:
        # Admin por ambiente: considerar sudo habilitado quando permitido por configuração
        if ENV_ADMIN_USERNAME and username == ENV_ADMIN_USERNAME and not REQUIRE_SYSTEM_USER:
            return True

        # Usuário root sempre tem privilégios
        try:
            user_info = pwd.getpwnam(username)
            if user_info.pw_uid == 0:
                return True
        except KeyError:
            return False

        # Verificar via módulos Python (sem depender do PATH do systemd)
        sudo_groups = ['sudo', 'wheel', 'admin']
        user_gid = user_info.pw_gid
        for gname in sudo_groups:
            try:
                g = grp.getgrnam(gname)
                if username in g.gr_mem or g.gr_gid == user_gid:
                    return True
            except KeyError:
                # Grupo pode não existir nesta distro
                continue

        # Fallback: tentar 'id -Gn <username>' se disponível
        import shutil
        id_bin = shutil.which('id') or '/usr/bin/id'
        try:
            result = subprocess.run([id_bin, '-Gn', username], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                groups = result.stdout.strip().split()
                return any(g in groups for g in ['sudo', 'wheel', 'admin'])
        except Exception:
            pass

        return False
        
    except Exception as e:
        print(f"Error checking sudo privileges: {e}")
        return False

def get_user_info(username: str) -> Dict[str, Any]:
    """
    Obtém informações do usuário do sistema
    """
    try:
        user_info = pwd.getpwnam(username)
        
        # Obtém grupos do usuário
        groups = [g.gr_name for g in grp.getgrall() if username in g.gr_mem]
        primary_group = grp.getgrgid(user_info.pw_gid).gr_name
        if primary_group not in groups:
            groups.append(primary_group)
        
        return {
            "username": username,
            "uid": user_info.pw_uid,
            "gid": user_info.pw_gid,
            "home": user_info.pw_dir,
            "shell": user_info.pw_shell,
            "groups": groups,
            "sudo": check_sudo_privileges(username)
        }
    except KeyError:
        return None
    except Exception as e:
        print(f"Error getting user info: {e}")
        return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Cria um token JWT
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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
    except _PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Endpoint de login que verifica credenciais e privilégios sudo
    """
    try:
        # Verifica as credenciais do usuário (com suporte a admin via .env)
        if not verify_user_credentials(request.username, request.password):
            return AuthResponse(
                success=False,
                message="Usuário ou senha inválidos"
            )

        # Obtém informações do usuário
        # Admin via env: construir user_info mínimo
        if ENV_ADMIN_USERNAME and request.username == ENV_ADMIN_USERNAME and not REQUIRE_SYSTEM_USER:
            user_info = {
                "username": ENV_ADMIN_USERNAME,
                "uid": 0,
                "gid": 0,
                "home": "/var/lib/ubuntu-server-admin",
                "shell": "/bin/bash",
                "groups": ["sudo", "admin"],
                "sudo": True,
            }
        else:
            user_info = get_user_info(request.username)

        if not user_info:
            return AuthResponse(
                success=False,
                message="Usuário não encontrado no sistema"
            )

        # Verifica privilégios sudo se necessário
        if request.require_sudo and not user_info["sudo"]:
            return AuthResponse(
                success=False,
                message="Usuário não possui privilégios sudo necessários"
            )

        # Cria token JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": request.username, "sudo": user_info["sudo"]},
            expires_delta=access_token_expires
        )

        return AuthResponse(
            success=True,
            token=access_token,
            access_token=access_token,
            token_type="bearer",
            user=user_info,
            message="Login realizado com sucesso"
        )

    except Exception as e:
        print(f"Login error: {e}")
        return AuthResponse(
            success=False,
            message="Erro interno do servidor"
        )

@router.post("/validate-sudo")
async def validate_sudo(request: ValidateSudoRequest):
    """
    Valida se o usuário tem privilégios sudo
    """
    try:
        # Verifica credenciais
        if not verify_user_credentials(request.username, request.password):
            return {"valid": False}
        
        # Verifica privilégios sudo
        has_sudo = check_sudo_privileges(request.username)
        return {"valid": has_sudo}
        
    except Exception as e:
        print(f"Sudo validation error: {e}")
        return {"valid": False}

@router.get("/me")
async def get_current_user(current_user: str = Depends(verify_token)):
    """
    Retorna informações do usuário autenticado
    """
    user_info = get_user_info(current_user)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return user_info

@router.post("/logout")
async def logout():
    """
    Endpoint de logout (o token deve ser removido no frontend)
    """
    return {"message": "Logout realizado com sucesso"}

@router.get("/verify")
async def verify_auth(current_user: str = Depends(verify_token)):
    """
    Verifica se o token ainda é válido
    """
    return {"valid": True, "user": current_user}

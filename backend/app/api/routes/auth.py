from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import subprocess
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pwd
import grp

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

# Configurações JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

class LoginRequest(BaseModel):
    username: str
    password: str
    require_sudo: bool = True

class AuthResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

class ValidateSudoRequest(BaseModel):
    username: str
    password: str

def verify_user_credentials(username: str, password: str) -> bool:
    """
    Verifica as credenciais do usuário usando o sistema PAM do Linux
    """
    try:
        # Usando su para verificar as credenciais
        # Este método funciona em sistemas Unix/Linux
        result = subprocess.run(
            ['su', username, '-c', 'echo "auth_success"'],
            input=f'{password}\n',
            text=True,
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0 and "auth_success" in result.stdout
    except subprocess.TimeoutExpired:
        return False
    except Exception as e:
        print(f"Error verifying credentials: {e}")
        return False

def check_sudo_privileges(username: str) -> bool:
    """
    Verifica se o usuário tem privilégios sudo
    """
    try:
        # Verifica se o usuário está no grupo sudo ou wheel
        result = subprocess.run(
            ['groups', username],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            groups = result.stdout.strip()
            # Grupos comuns que têm privilégios sudo
            sudo_groups = ['sudo', 'wheel', 'admin', 'root']
            return any(group in groups for group in sudo_groups)
        
        # Método alternativo: verificar se pode executar sudo
        result = subprocess.run(
            ['sudo', '-n', '-l', '-U', username],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        return result.returncode == 0
        
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
    except jwt.PyJWTError:
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
        # Verifica as credenciais do usuário
        if not verify_user_credentials(request.username, request.password):
            return AuthResponse(
                success=False,
                message="Usuário ou senha inválidos"
            )
        
        # Obtém informações do usuário
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

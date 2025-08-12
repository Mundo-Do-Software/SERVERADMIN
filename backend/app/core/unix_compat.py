"""
Módulo de compatibilidade para Windows
Fornece implementações básicas dos módulos Unix para desenvolvimento
"""
import os
import platform
from typing import List, Dict, Any, NamedTuple

# Verificar se estamos no Windows
IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    # Simular estruturas Unix para desenvolvimento no Windows
    
    class PwdEntry(NamedTuple):
        pw_name: str
        pw_passwd: str
        pw_uid: int
        pw_gid: int
        pw_gecos: str
        pw_dir: str
        pw_shell: str
    
    class GrpEntry(NamedTuple):
        gr_name: str
        gr_passwd: str
        gr_gid: int
        gr_mem: List[str]
    
    class SpwdEntry(NamedTuple):
        sp_namp: str
        sp_pwdp: str
        sp_lstchg: int
        sp_min: int
        sp_max: int
        sp_warn: int
        sp_inact: int
        sp_expire: int
        sp_flag: int
    
    def getpwall():
        """Simula pwd.getpwall() no Windows"""
        return [
            PwdEntry("admin", "x", 1000, 1000, "Administrator", "/home/admin", "/bin/bash"),
            PwdEntry("user", "x", 1001, 1001, "Regular User", "/home/user", "/bin/bash"),
            PwdEntry("guest", "x", 1002, 1002, "Guest User", "/home/guest", "/bin/bash"),
        ]
    
    def getpwnam(name: str):
        """Simula pwd.getpwnam() no Windows"""
        users = {user.pw_name: user for user in getpwall()}
        if name in users:
            return users[name]
        raise KeyError(f"getpwnam(): name not found: '{name}'")
    
    def getgrall():
        """Simula grp.getgrall() no Windows"""
        return [
            GrpEntry("admin", "x", 1000, ["admin"]),
            GrpEntry("users", "x", 1001, ["user", "admin"]),
            GrpEntry("sudo", "x", 27, ["admin"]),
        ]
    
    def getspnam(name: str):
        """Simula spwd.getspnam() no Windows"""
        if name in ["admin", "user", "guest"]:
            return SpwdEntry(name, "$6$...", 19000, 0, 99999, 7, -1, -1, -1)
        raise KeyError(f"getspnam(): name not found: '{name}'")
    
    # Exportar funções compatíveis
    pwd_getpwall = getpwall
    pwd_getpwnam = getpwnam
    grp_getgrall = getgrall
    spwd_getspnam = getspnam

else:
    # No Linux/Unix, usar os módulos reais
    import pwd
    import grp
    import spwd
    
    pwd_getpwall = pwd.getpwall
    pwd_getpwnam = pwd.getpwnam
    grp_getgrall = grp.getgrall
    spwd_getspnam = spwd.getspnam

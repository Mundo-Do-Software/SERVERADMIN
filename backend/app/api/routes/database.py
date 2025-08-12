from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
import subprocess
import re
import json
from datetime import datetime
import os

router = APIRouter()

class MySQLAdmin:
    """Classe para administração do MySQL via comandos do sistema"""
    
    @staticmethod
    def execute_mysql_command(query: str, database: str = None) -> str:
        """Executa comando MySQL e retorna resultado"""
        try:
            cmd = ["mysql", "-u", "root"]
            
            # Adicionar senha se necessário (deve ser configurado)
            mysql_password = os.getenv("MYSQL_ROOT_PASSWORD")
            if mysql_password:
                cmd.extend(["-p" + mysql_password])
            
            if database:
                cmd.extend(["-D", database])
            
            cmd.extend(["-e", query])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao executar comando MySQL: {e.stderr}"
            )
    
    @staticmethod
    def get_service_status() -> bool:
        """Verifica se o serviço MySQL está ativo"""
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "mysql"],
                capture_output=True,
                text=True
            )
            return result.stdout.strip() == "active"
        except:
            return False

@router.get("/mysql/status")
async def get_mysql_status():
    """Obtém status do servidor MySQL"""
    try:
        mysql_admin = MySQLAdmin()
        is_online = mysql_admin.get_service_status()
        
        if not is_online:
            return {
                "online": False,
                "version": None,
                "uptime": None,
                "connections": 0,
                "queries": 0,
                "dataDir": None
            }
        
        # Obter informações do status
        status_query = """
        SELECT 
            @@version as version,
            @@datadir as data_dir,
            (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Uptime') as uptime,
            (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Threads_connected') as connections,
            (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Queries') as queries;
        """
        
        result = mysql_admin.execute_mysql_command(status_query)
        lines = result.strip().split('\n')
        
        if len(lines) >= 2:
            data = lines[1].split('\t')
            uptime_seconds = int(data[2]) if len(data) > 2 else 0
            
            # Converter uptime para formato legível
            days = uptime_seconds // 86400
            hours = (uptime_seconds % 86400) // 3600
            uptime_str = f"{days} dias, {hours} horas"
            
            return {
                "online": True,
                "version": data[0] if len(data) > 0 else "Unknown",
                "uptime": uptime_str,
                "connections": int(data[3]) if len(data) > 3 else 0,
                "queries": int(data[4]) if len(data) > 4 else 0,
                "dataDir": data[1] if len(data) > 1 else "/var/lib/mysql"
            }
        
        return {"online": True, "version": "Unknown", "uptime": "Unknown", "connections": 0, "queries": 0, "dataDir": "/var/lib/mysql"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do MySQL: {str(e)}"
        )

@router.get("/mysql/databases")
async def get_databases():
    """Lista todos os bancos de dados"""
    try:
        mysql_admin = MySQLAdmin()
        
        # Obter lista de bancos
        databases_result = mysql_admin.execute_mysql_command("SHOW DATABASES;")
        
        databases = []
        for line in databases_result.strip().split('\n')[1:]:  # Pular header
            db_name = line.strip()
            if db_name and db_name not in ['Database']:
                
                # Obter informações detalhadas do banco
                tables_query = f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{db_name}';"
                tables_result = mysql_admin.execute_mysql_command(tables_query)
                
                try:
                    table_count = int(tables_result.strip().split('\n')[1])
                except:
                    table_count = 0
                
                # Obter tamanho do banco
                size_query = f"""
                SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'size_mb'
                FROM information_schema.tables 
                WHERE table_schema = '{db_name}';
                """
                size_result = mysql_admin.execute_mysql_command(size_query)
                
                try:
                    size_mb = float(size_result.strip().split('\n')[1])
                    if size_mb >= 1024:
                        size_str = f"{size_mb/1024:.1f} GB"
                    elif size_mb >= 1:
                        size_str = f"{size_mb:.1f} MB"
                    else:
                        size_str = f"{size_mb*1024:.0f} KB"
                except:
                    size_str = "N/A"
                
                databases.append({
                    "name": db_name,
                    "size": size_str,
                    "tables": table_count,
                    "created": datetime.now().strftime("%Y-%m-%d")  # Simplificado
                })
        
        return databases
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar bancos de dados: {str(e)}"
        )

@router.post("/mysql/databases")
async def create_database(database_info: Dict[str, Any]):
    """Cria um novo banco de dados"""
    try:
        mysql_admin = MySQLAdmin()
        db_name = database_info.get("name")
        charset = database_info.get("charset", "utf8mb4")
        
        if not db_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome do banco é obrigatório"
            )
        
        # Validar nome do banco
        if not re.match(r'^[a-zA-Z0-9_]+$', db_name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome do banco deve conter apenas letras, números e underscores"
            )
        
        query = f"CREATE DATABASE {db_name} CHARACTER SET {charset};"
        mysql_admin.execute_mysql_command(query)
        
        return {"message": f"Banco {db_name} criado com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar banco de dados: {str(e)}"
        )

@router.delete("/mysql/databases/{db_name}")
async def delete_database(db_name: str):
    """Remove um banco de dados"""
    try:
        mysql_admin = MySQLAdmin()
        
        # Verificar se o banco existe
        check_query = f"SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '{db_name}';"
        result = mysql_admin.execute_mysql_command(check_query)
        
        if db_name not in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Banco {db_name} não encontrado"
            )
        
        # Proteger bancos do sistema
        system_dbs = ['information_schema', 'performance_schema', 'mysql', 'sys']
        if db_name in system_dbs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir o banco do sistema {db_name}"
            )
        
        query = f"DROP DATABASE {db_name};"
        mysql_admin.execute_mysql_command(query)
        
        return {"message": f"Banco {db_name} excluído com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir banco de dados: {str(e)}"
        )

@router.get("/mysql/users")
async def get_users():
    """Lista todos os usuários MySQL"""
    try:
        mysql_admin = MySQLAdmin()
        
        query = """
        SELECT 
            User, 
            Host,
            GROUP_CONCAT(DISTINCT 
                CASE 
                    WHEN Select_priv = 'Y' THEN 'SELECT'
                    WHEN Insert_priv = 'Y' THEN 'INSERT'
                    WHEN Update_priv = 'Y' THEN 'UPDATE'
                    WHEN Delete_priv = 'Y' THEN 'DELETE'
                    WHEN Create_priv = 'Y' THEN 'CREATE'
                    WHEN Drop_priv = 'Y' THEN 'DROP'
                    WHEN Super_priv = 'Y' THEN 'ALL PRIVILEGES'
                END
            ) as privileges
        FROM mysql.user 
        WHERE User != '' 
        GROUP BY User, Host;
        """
        
        result = mysql_admin.execute_mysql_command(query)
        
        users = []
        for line in result.strip().split('\n')[1:]:  # Pular header
            if line.strip():
                parts = line.split('\t')
                if len(parts) >= 3:
                    privileges = parts[2].split(',') if parts[2] and parts[2] != 'NULL' else []
                    users.append({
                        "username": parts[0],
                        "host": parts[1],
                        "privileges": [p.strip() for p in privileges if p.strip()],
                        "created": datetime.now().strftime("%Y-%m-%d")  # Simplificado
                    })
        
        return users
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar usuários: {str(e)}"
        )

@router.post("/mysql/users")
async def create_user(user_info: Dict[str, Any]):
    """Cria um novo usuário MySQL"""
    try:
        mysql_admin = MySQLAdmin()
        username = user_info.get("username")
        host = user_info.get("host", "%")
        password = user_info.get("password")
        privileges = user_info.get("privileges", [])
        
        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário e senha são obrigatórios"
            )
        
        # Criar usuário
        create_query = f"CREATE USER '{username}'@'{host}' IDENTIFIED BY '{password}';"
        mysql_admin.execute_mysql_command(create_query)
        
        # Conceder privilégios
        if privileges:
            if 'ALL PRIVILEGES' in privileges:
                grant_query = f"GRANT ALL PRIVILEGES ON *.* TO '{username}'@'{host}';"
            else:
                privs = ', '.join(privileges)
                grant_query = f"GRANT {privs} ON *.* TO '{username}'@'{host}';"
            
            mysql_admin.execute_mysql_command(grant_query)
        
        # Aplicar mudanças
        mysql_admin.execute_mysql_command("FLUSH PRIVILEGES;")
        
        return {"message": f"Usuário {username}@{host} criado com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar usuário: {str(e)}"
        )

@router.delete("/mysql/users/{username}/{host}")
async def delete_user(username: str, host: str):
    """Remove um usuário MySQL"""
    try:
        mysql_admin = MySQLAdmin()
        
        # Proteger usuário root
        if username == 'root':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível excluir o usuário root"
            )
        
        query = f"DROP USER '{username}'@'{host}';"
        mysql_admin.execute_mysql_command(query)
        
        return {"message": f"Usuário {username}@{host} excluído com sucesso!"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir usuário: {str(e)}"
        )

@router.post("/mysql/service/{action}")
async def mysql_service_action(action: str):
    """Controla o serviço MySQL (start/stop/restart)"""
    try:
        valid_actions = ["start", "stop", "restart"]
        if action not in valid_actions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ação inválida. Use: {', '.join(valid_actions)}"
            )
        
        result = subprocess.run(
            ["sudo", "systemctl", action, "mysql"],
            capture_output=True,
            text=True,
            check=True
        )
        
        return {"message": f"Serviço MySQL {action} executado com sucesso!"}
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao {action} o serviço MySQL: {e.stderr}"
        )

@router.get("/mysql/backup/{database}")
async def backup_database(database: str):
    """Faz backup de um banco específico"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"/tmp/{database}_backup_{timestamp}.sql"
        
        cmd = [
            "mysqldump",
            "-u", "root",
            "--single-transaction",
            "--routines",
            "--triggers",
            database
        ]
        
        # Adicionar senha se necessário
        mysql_password = os.getenv("MYSQL_ROOT_PASSWORD")
        if mysql_password:
            cmd.insert(2, f"-p{mysql_password}")
        
        with open(backup_file, 'w') as f:
            result = subprocess.run(
                cmd,
                stdout=f,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
        
        return {
            "message": f"Backup do banco {database} criado com sucesso!",
            "file": backup_file
        }
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer backup: {e.stderr}"
        )

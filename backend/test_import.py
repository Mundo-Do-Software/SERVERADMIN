import sys
import os

# Adicionar o diretório pai ao path para importar os módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import app
    print("✅ Importação da aplicação bem-sucedida!")
    print("✅ FastAPI app criada com sucesso!")
    print("\nRoutes disponíveis:")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.path}")
    
    print("\n🚀 Para iniciar o servidor:")
    print("uvicorn main:app --reload")
    
except Exception as e:
    print(f"❌ Erro na importação: {e}")
    print("\nVerifique se todas as dependências estão instaladas:")
    print("pip install -r requirements.txt")

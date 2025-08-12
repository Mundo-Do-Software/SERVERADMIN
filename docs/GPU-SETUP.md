# GPU Support Configuration - ServerAdmin

## Status: ✅ CONFIGURADO

Seu ambiente Docker agora está configurado para usar a **NVIDIA GeForce RTX 2060** nos containers.

## Configuração Atual

### Hardware Detectado
- **GPU**: NVIDIA GeForce RTX 2060
- **VRAM**: 6GB
- **Driver**: 577.00
- **CUDA**: 12.9

### Docker Configuration
- ✅ NVIDIA Container Runtime instalado
- ✅ GPU access habilitado nos containers
- ✅ Variáveis de ambiente configuradas

## Comandos Úteis

### Verificar GPU no sistema
```powershell
nvidia-smi
```

### Verificar GPU nos containers
```powershell
.\docker-simple.ps1 gpu
```

### Iniciar ambiente com GPU
```powershell
.\docker-simple.ps1 dev
```

### Testar GPU diretamente no container
```powershell
docker exec serveradmin-backend-1 nvidia-smi
```

## Configuração do docker-compose.dev.yml

```yaml
services:
  backend:
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=all
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
  
  frontend:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

## Uso da GPU em Aplicações

### Python (Backend)
```python
import torch

# Verificar se CUDA está disponível
if torch.cuda.is_available():
    device = torch.device("cuda")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
else:
    device = torch.device("cpu")
    print("CUDA não disponível")
```

### Exemplos de Uso
- **Machine Learning**: PyTorch, TensorFlow com aceleração GPU
- **Data Processing**: RAPIDS, CuPy para processamento paralelo
- **Computer Vision**: OpenCV com suporte CUDA
- **Mining/Computing**: CUDA kernels customizados

## Monitoramento

### Uso em tempo real
```powershell
# Monitor contínuo
nvidia-smi -l 1

# Dentro do container
docker exec serveradmin-backend-1 watch -n 1 nvidia-smi
```

### Logs de GPU
```powershell
# Verificar uso de memória
docker exec serveradmin-backend-1 nvidia-smi --query-gpu=memory.used,memory.total --format=csv

# Processos ativos
docker exec serveradmin-backend-1 nvidia-smi pmon
```

## Solução de Problemas

### GPU não detectada
1. Verificar drivers NVIDIA atualizados
2. Reiniciar Docker Desktop
3. Verificar se WSL2 está habilitado

### Performance baixa
1. Verificar se não há outros processos usando GPU
2. Monitorar temperatura (`nvidia-smi`)
3. Verificar limitações de energia

### Containers não conseguem acessar GPU
1. Verificar configuração do docker-compose
2. Testar: `docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi`
3. Reinstalar NVIDIA Container Toolkit se necessário

## Próximos Passos

1. **Instalar bibliotecas ML**: PyTorch, TensorFlow, RAPIDS
2. **Configurar monitoring**: Grafana + Prometheus para GPU metrics
3. **Otimizar containers**: Multi-stage builds para reduzir tamanho
4. **Setup CI/CD**: Testes automatizados com GPU

---
*Configuração realizada em: $(Get-Date)*
*GPU Status: ✅ Funcionando perfeitamente*

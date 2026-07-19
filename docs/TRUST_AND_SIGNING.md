# Confiança, assinatura e instalação segura

Como distribuir o Spindle no Windows **sem pedir ao usuário que desative antivírus ou SmartScreen**.

## Por que o Orchestrator “passa” no antivírus

O Orchestrator (`../safra/orchestrator`) não usa truque de packaging: ele usa:

1. **Authenticode** (SignPath OSS ou PFX próprio) nos instaladores
2. **MSI/NSIS** (instalação em Program Files) — não portable unsigned
3. Backend **JAR + Java do sistema** (sem segundo `.exe` congelado tipo PyInstaller)

Binário Windows **não assinado** continua sujeito a SmartScreen/Defender. Não há mudança de código que substitua certificado.

## Spindle — o que adotamos

| Item | Decisão |
| --- | --- |
| Formato | **NSIS setup** (`Lemain-Spindle-*-setup.exe`) |
| Portable | Removido da distribuição (padrão AV-hostile) |
| Assinatura | SignPath (OSS) e/ou PFX via `CSC_*` / `signtool` |
| Nested PE | `spindle-core.exe` + ffmpeg assinados quando há certificado no CI |
| Checksums | `CHECKSUMS.sha256` na release |

## Setup (uma vez)

1. Candidatar o repo no [SignPath OSS](https://signpath.io/product/open-source) — ver [`SIGNPATH.md`](../SIGNPATH.md)
2. Configurar secrets/vars no GitHub
3. Publicar tag `v*`

## Depois de assinar

- Se algum AV ainda alertar: submeter ao [Microsoft WDSI](https://www.microsoft.com/en-us/wdsi/filesubmission)
- Verificar SHA256 da release
- **Nunca** orientar o usuário a desligar Defender/SmartScreen

## Opções de certificado

| Opção | Custo | Nota |
| --- | --- | --- |
| SignPath OSS | Grátis (MIT, repo público) | Preferido — igual Orchestrator |
| Azure Trusted Signing | ~US$ 10/mês | Integração Microsoft |
| OV / EV comercial | Anual | EV = reputação imediata no SmartScreen |

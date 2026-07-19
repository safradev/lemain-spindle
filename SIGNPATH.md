# SignPath — configuração do Lemain Spindle

Assinatura Authenticode (gratuita para OSS elegível) — mesmo modelo do Orchestrator.

Sem certificado reconhecido, o Windows SmartScreen / Defender **pode bloquear** o instalador. Não existe atalho no código que substitua isso.

## 1. Candidatura

1. [signpath.io/product/open-source](https://signpath.io/product/open-source)
2. Repositório: `https://github.com/safradev/lemain-spindle`
3. Licença: MIT
4. Aguarde aprovação

## 2. Dashboard SignPath

| Campo | Valor sugerido |
| --- | --- |
| Project slug | `lemain-spindle` |
| Signing policy slug | `release-signing` |
| Trusted build | GitHub → `safradev/lemain-spindle` |
| Workflow | `.github/workflows/build-windows.yml` |
| Branch/tag | `refs/tags/v*` |

Artifact configuration: `*.exe` (NSIS setup).

Base de política: `.signpath/policies/lemain-spindle/release-signing.yml`.

## 3. Secrets e variáveis no GitHub

| Nome | Tipo | Origem |
| --- | --- | --- |
| `SIGNPATH_API_TOKEN` | Secret | SignPath → API tokens |
| `SIGNPATH_ORGANIZATION_ID` | Variable | UUID da org SignPath |
| `SIGNPATH_PROJECT_SLUG` | Variable | `lemain-spindle` |
| `SIGNPATH_SIGNING_POLICY_SLUG` | Variable | `release-signing` |

Opcional (certificado próprio, além ou em vez do SignPath):

| Nome | Tipo |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Secret (PFX em Base64) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Secret |
| `WINDOWS_TIMESTAMP_URL` | Variable (default DigiCert) |

## 4. Comportamento no CI

Em tag `v*`:

1. Build gera `Lemain-Spindle-*-setup.exe` (NSIS)
2. Se houver PFX: assina `spindle-core.exe`, `ffmpeg` e o instalador via electron-builder (`CSC_*`)
3. Se houver `SIGNPATH_API_TOKEN`: reenvia o setup ao SignPath e publica o artefato assinado
4. Publica `CHECKSUMS.sha256` na release

## 5. Download recomendado

Use **apenas** o instalador NSIS assinado (`*-setup.exe`). Portable unsigned foi removido — extrair/rodar de TEMP aumenta bloqueio de AV.

## Referências

- Guia: [`docs/TRUST_AND_SIGNING.md`](docs/TRUST_AND_SIGNING.md)
- Orchestrator (referência): `../safra/orchestrator/SIGNPATH.md`

# Como executar o EcoTrack (interface)

Passo a passo para subir a aplicação e acessar a UI. A API vive no repositório irmão `ecotrack-backend` (`../ecotrack-backend`).

## Pré-requisitos

- **Docker** com Compose (Caminho A — recomendado para demo e entrega)
- **Node.js 22+** (Caminho B — desenvolvimento com hot reload)
- Repositórios irmãos na mesma pasta:

```
code/
├── ecotrack-backend/
└── ecotrack-frontend/   ← você está aqui
```

- Chave **OpenWeather** (gratuita em https://openweathermap.org/api) — configure **somente** em `ecotrack-backend/.env`

## Caminho A — Stack completa com Docker (recomendado)

Sobe **PostgreSQL + API + UI** em um comando. A UI fica em **http://localhost:8080**.

### 1. Configurar o backend (uma vez)

```bash
cd ../ecotrack-backend
cp .env.example .env
```

Edite `.env` e defina:

```env
OPENWEATHER_API_KEY=sua_chave_aqui
```

### 2. Subir a stack completa

```bash
cd ../ecotrack-frontend
docker compose up --build
```

Aguarde os containers `ecotrack-db`, `ecotrack-api` e `ecotrack-ui`.

### 3. Acessar a UI

| O quê | URL |
| ----- | --- |
| Dashboard | http://localhost:8080/ |
| Alertas | http://localhost:8080/alerts |
| Swagger (opcional) | http://localhost:8000/docs |

### 4. Parar

```bash
docker compose down
```

**Não suba** `docker compose up` no backend **e** no frontend ao mesmo tempo — conflitam nas portas **5432** e **8000** e nos mesmos `container_name`.

---

## Caminho B — Desenvolvimento (Vite + API no Docker)

UI com hot reload em **http://localhost:5173**.

### 1. Subir API e banco (terminal 1)

```bash
cd ../ecotrack-backend
cp .env.example .env
# defina OPENWEATHER_API_KEY no .env

docker compose up --build
```

Deixe rodando. A API fica em http://localhost:8000.

### 2. Subir o frontend (terminal 2)

```bash
cd ../ecotrack-frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Acessar a UI

Abra **http://localhost:5173**. O Vite encaminha `/api` para `http://127.0.0.1:8000` — a API precisa estar no ar antes.

---

## Primeiro uso na interface

1. **Alertas** → **Novo alerta**
2. Busque um local (ex.: `Curitiba`) e escolha um candidato na lista
3. Defina poluente alvo e limite de concentração → **Salvar**
4. **Dashboard** → selecione o alerta → veja card, gráfico e glossário dos poluentes

Sem alerta cadastrado, o dashboard mostra estado vazio com link para `/alerts`.

---

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
| ------- | -------------- | ----------- |
| Porta 5432 ou 8000 em uso | Dois composes ou containers antigos | `docker compose down` em ambos os repos; confira com `docker ps` |
| Dashboard sem leitura de ar | `OPENWEATHER_API_KEY` ausente ou inválida | Confira `ecotrack-backend/.env` |
| UI sem dados no dev | API parada | Suba o compose do backend antes do `npm run dev` |
| Erro 429 no dashboard | Muitas consultas em `/air-quality` | Aguarde o tempo indicado em `Retry-After` (limite ~60/min) |

---

## Referência rápida de portas

| Serviço | Porta | Caminho A | Caminho B |
| ------- | ----- | --------- | --------- |
| UI | 8080 ou 5173 | Nginx (`8080`) | Vite (`5173`) |
| API | 8000 | exposta | exposta |
| PostgreSQL | 5432 | exposta | exposta |

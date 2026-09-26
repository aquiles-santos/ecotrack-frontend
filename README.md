# EcoTrack Frontend

Interface do **EcoTrack** — monitoramento de qualidade do ar (PM2.5, PM10, CO, NO₂, O₃). O usuário consulta a leitura de um alerta no dashboard e gerencia alertas georreferenciados (criar, editar, excluir, filtrar e paginar).

O browser fala somente com esta aplicação. Qualidade do ar e geocodificação passam pela API em `ecotrack-backend`. Nenhuma chamada sai do navegador para a OpenWeather ou para a Open-Meteo, e nenhuma chave de API fica neste repositório.

## Comece aqui (~5 minutos)

Fluxo recomendado para ver **UI + API + banco** com um comando. Este repositório **não funciona sozinho**: o Docker Compose daqui builda a API a partir do irmão `ecotrack-backend`.

**Pré-requisito:** [Docker](https://docs.docker.com/get-docker/) com Compose (no Windows, Docker Desktop com WSL2).

### 1. Repositórios lado a lado

```
code/
├── ecotrack-backend/
└── ecotrack-frontend/   ← você está aqui
```

Se ainda não clonou o backend, faça isso antes de continuar.

### 2. Chave OpenWeather (no backend)

A chave fica **somente** em `ecotrack-backend/.env`, não neste repo.

1. Crie uma conta gratuita em https://openweathermap.org/api e ative a **Air Pollution API**.
2. Em _My API keys_, copie a chave (pode levar alguns minutos até ficar ativa após o cadastro).
3. No `ecotrack-backend`:

```bash
cd ../ecotrack-backend
cp .env.example .env
```

4. Abra `.env` e substitua `your_openweather_api_key_here` em `OPENWEATHER_API_KEY=`.

Sem chave válida, alertas e geocode funcionam na UI; o dashboard pode não mostrar leitura real de ar.

### 3. Subir a stack completa

Na raiz do **ecotrack-frontend**:

```bash
cd ../ecotrack-frontend
docker compose up --build
```

Aguarde os containers `ecotrack-db`, `ecotrack-api` e `ecotrack-ui`.

### 4. Validar

| O quê              | URL                          |
| ------------------ | ---------------------------- |
| Dashboard          | http://localhost:8080/       |
| Alertas            | http://localhost:8080/alerts |
| Swagger (opcional) | http://localhost:8000/docs   |

Parar: `docker compose down` (na raiz do frontend).

**Não** suba `docker compose up` no **backend** e no **frontend** ao mesmo tempo — conflitam nas portas **5432** e **8000**.

**Só API/Swagger, sem interface?** Use o README e o compose do repositório `ecotrack-backend`.

## Stack

| Camada  | Tecnologia                                     |
| ------- | ---------------------------------------------- |
| UI      | Vue 3, Vite 8, Tailwind CSS 4, JavaScript      |
| Gráfico | Chart.js 4 + vue-chartjs                       |
| HTTP    | Axios (`VITE_API_BASE_URL`, default `/api/v1`) |
| Entrega | Nginx (fallback de SPA + proxy `/api/`)        |

## Pré-requisitos

- **Docker** com Compose — stack completa ([Comece aqui](#comece-aqui-5-minutos))
- Repositório irmão `ecotrack-backend` em `../ecotrack-backend`
- **Node.js 22+** — apenas para desenvolvimento com Vite (seção abaixo)

## Instalação e desenvolvimento

Modo **desenvolvimento** (Caminho B: Vite + API no Docker). Detalhes: [docs/COMO_EXECUTAR.md](docs/COMO_EXECUTAR.md#caminho-b--desenvolvimento-vite--api-no-docker).

1. No `ecotrack-backend`: `cp .env.example .env`, defina `OPENWEATHER_API_KEY` e rode `docker compose up --build` (terminal 1).
2. Neste repositório (terminal 2):

```bash
cp .env.example .env
npm install
npm run dev
```

A UI sobe em http://localhost:5173. O Vite encaminha `/api` para `http://127.0.0.1:8000`.

| Comando           | Uso                          |
| ----------------- | ---------------------------- |
| `npm run dev`     | Servidor de desenvolvimento  |
| `npm run build`   | Build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente   |
| `npm run lint`    | ESLint                       |
| `npm run format`  | Prettier                     |

`VITE_API_BASE_URL` é embutida no build. Em desenvolvimento e no container o valor é `/api/v1` (same-origin). Não use `http://localhost:8000` na imagem Nginx.

## Docker Compose (stack completa)

Primeira vez? Siga [Comece aqui (~5 minutos)](#comece-aqui-5-minutos). Referência do Caminho A: [docs/COMO_EXECUTAR.md](docs/COMO_EXECUTAR.md#caminho-a--stack-completa-com-docker-recomendado).

## Rotas consumidas

Todas relativas a `/api/v1`. No container, o Nginx preserva esse prefixo ao encaminhar para `ecotrack-api:8000`.

| Método   | Rota           | Uso na interface                         |
| -------- | -------------- | ---------------------------------------- |
| `GET`    | `/alerts`      | Lista, filtro de criticidade e paginação |
| `POST`   | `/alerts`      | Criar alerta                             |
| `PUT`    | `/alerts/{id}` | Editar alerta (parcial)                  |
| `DELETE` | `/alerts/{id}` | Excluir alerta (204, sem corpo)          |
| `GET`    | `/air-quality` | Card e gráfico do dashboard              |
| `GET`    | `/geocode`     | Busca de local no formulário de alerta   |
| `GET`    | `/pollutants`  | Glossário dos poluentes no dashboard     |

## APIs externas

O browser não chama estas APIs. Quem chama é o backend.

### OpenWeather Air Pollution

| Item               | Detalhe                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cadastro**       | https://openweathermap.org/api — conta gratuita; a chave fica em `ecotrack-backend/.env`                                                    |
| **Rota (backend)** | `GET https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={key}`                                                 |
| **Licença / uso**  | Plano gratuito de uso não comercial; [termos da OpenWeather](https://openweathermap.org/terms). Limite de 60 req/min na rota `/air-quality` |

### Open-Meteo Geocoding

| Item               | Detalhe                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| **Cadastro**       | Não precisa de chave                                                          |
| **Rota (backend)** | `GET https://geocoding-api.open-meteo.com/v1/search?name={q}&count={limit}`   |
| **Licença / uso**  | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — uso não comercial |

## Arquitetura (C4)

### Contexto

```mermaid
flowchart LR
    user(["Usuário"])
    ecotrack["EcoTrack<br/>Monitoramento de qualidade do ar"]
    openweather["OpenWeather<br/>Air Pollution API"]
    openmeteo["Open-Meteo<br/>Geocoding API"]

    user -->|Usa via navegador| ecotrack
    ecotrack -->|HTTPS: poluição por lat/lon| openweather
    ecotrack -->|HTTPS: nome do local para coordenadas| openmeteo
```

### Containers

```mermaid
flowchart TB
    user(["Usuário<br/>Browser"])

    subgraph stack ["Compose do frontend"]
        ui["ecotrack-ui<br/>Nginx :8080<br/>SPA + proxy /api/"]
        api["ecotrack-api<br/>FastAPI :8000"]
        db[("ecotrack-db<br/>PostgreSQL 18")]
    end

    openweather["OpenWeather<br/>Air Pollution API"]
    openmeteo["Open-Meteo<br/>Geocoding API"]

    user -->|http://localhost:8080| ui
    ui -->|proxy /api/v1| api
    api --> db
    api -->|air_pollution| openweather
    api -->|geocoding search| openmeteo
```

Em `npm run dev`, o browser usa o Vite na porta 5173 no lugar do Nginx. O destino das rotas `/api/v1` continua sendo a API; OpenWeather e Open-Meteo seguem só no backend.

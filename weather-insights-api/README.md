# Weather Insights API

API desenvolvida com NestJS para consultar dados climáticos em tempo real usando a OpenWeatherMap, armazenar históricos no PostgreSQL, aplicar cache em Redis e expor estatísticas de temperatura.

## Funcionalidades

- **GET /weather/:city** – Consulta o clima atual na OpenWeatherMap, persiste a leitura e armazena em cache por 10 minutos.
- **GET /weather/summary/:city** – Calcula a média, máximo e mínimo de temperatura da última semana usando dados persistidos.
- **GET /weather/history/:city** – Retorna o histórico de leituras armazenadas no banco.
- **Swagger UI** disponível em `/api/docs` com descrição dos endpoints e DTOs.
- **Vitest + Supertest** para testes de integração do serviço e controller.

## Arquitetura

```
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── dto/
│   │   ├── weather-record.dto.ts
│   │   └── weather-summary.dto.ts
│   ├── exceptions/http-exception.filter.ts
│   └── utils/redis-cache.service.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── weather/
    ├── weather.controller.ts
    ├── weather.entity.ts
    ├── weather.module.ts
    ├── weather.repository.ts
    └── weather.service.ts
```

- **WeatherModule** encapsula controller, service, repository e entidade.
- **WeatherService** chama OpenWeatherMap (via Axios), aplica cache Redis e persiste com Prisma.
- **WeatherRepository** centraliza o acesso ao banco (`WeatherRecord`).
- **RedisCacheService** oferece operações genéricas de cache usando ioredis.
- **PrismaModule/Service** expõe o cliente Prisma como provider global.

## Stack

- NestJS 11
- Prisma ORM (PostgreSQL)
- Redis (cache)
- Axios
- Swagger (`@nestjs/swagger` + `swagger-ui-express`)
- Vitest + Supertest
- Docker Compose (Postgres + Redis)

## Requisitos

- Node.js 22 (`.nvmrc` define `22.21.1`)
- npm 10+
- Docker e Docker Compose

## Configuração

1. **Instale dependências**
   ```bash
   npm install
   ```

2. **Defina variáveis de ambiente** (crie `.env` na raiz do projeto)
   ```ini
   OPENWEATHER_API_KEY=<sua-chave>
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/weather_insights"
   REDIS_URL="redis://localhost:6379"
   PORT=3000
   ```

3. **Suba Postgres e Redis com Docker Compose**
   ```bash
   docker compose up -d
   ```

4. **Prisma**
   ```bash
   npx prisma generate
   npx prisma migrate deploy   # ou npx prisma migrate dev para ambiente local
   ```

5. **Executar a API**
   ```bash
   npm run start:dev
   ```
   - Swagger: http://localhost:3000/api/docs

## Testes

```bash
npm run test
```

Os testes usam Vitest e Supertest para verificar caching, integração com OpenWeatherMap (mockado), repositório e rotas expostas.

## Scripts úteis

| Script | Descrição |
| --- | --- |
| `npm run start` | Executa a aplicação em modo produção |
| `npm run start:dev` | Modo watch com reload automático |
| `npm run build` | Compila para `dist/` |
| `npm run test` | Roda a suíte Vitest |
| `npm run lint` | Executa ESLint |
| `npm run prisma:generate` | Gera o cliente Prisma |
| `npm run prisma:migrate` | Executa `prisma migrate dev` |
| `npm run prisma:deploy` | Aplicar migrações em produção |

## Modelo Prisma

```prisma
model WeatherRecord {
  id          Int      @id @default(autoincrement())
  city        String
  temperature Float
  condition   String
  recordedAt  DateTime @default(now())

  @@index([city, recordedAt])
}
```


## Caching

- Redis armazena o resultado de `/weather/:city` por 10 minutos (`weather:current:<city>`).
- Caso o cache exista, a API evita nova chamada externa e nova persistência.



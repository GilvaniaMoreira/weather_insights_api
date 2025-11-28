# Weather Insights API

API RESTful para consulta de dados meteorológicos com cache Redis e histórico persistente. Integração com OpenWeatherMap API.

## Tecnologias

- **NestJS** - Framework Node.js progressivo
- **TypeScript** - Superset JavaScript tipado
- **Prisma** - ORM para PostgreSQL
- **Redis** - Cache em memória
- **PostgreSQL** - Banco de dados relacional
- **Swagger** - Documentação automática da API
- **Vitest** - Framework de testes

## Pré-requisitos

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- Conta OpenWeatherMap (API Key gratuita)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/gilvania/weather-insights-api.git
cd weather-insights-api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais.

4. Execute as migrations do banco de dados:
```bash
npm run prisma:generate
npm run prisma:migrate
```

## Executando a aplicação

### Desenvolvimento
```bash
npm run start:dev
```

### Produção
```bash
npm run build
npm run start:prod
```

A API estará disponível em `http://localhost:3000`

## Documentação da API

Acesse a documentação Swagger em: `http://localhost:3000/api`

### Endpoints disponíveis

#### GET /weather/:city
Retorna dados meteorológicos atuais de uma cidade.

**Exemplo:**
```bash
curl http://localhost:3000/weather/London
```

**Resposta:**
```json
{
  "id": "uuid",
  "city": "London",
  "temperature": 15.5,
  "humidity": 72,
  "description": "Partly cloudy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /weather/summary/:city
Retorna resumo estatístico dos últimos 7 dias.

**Exemplo:**
```bash
curl http://localhost:3000/weather/summary/London
```

**Resposta:**
```json
{
  "city": "London",
  "avgTemperature": 14.2,
  "maxTemperature": 18.5,
  "minTemperature": 10.1,
  "avgHumidity": 68.5,
  "period": "7 days"
}
```

#### GET /weather/history/:city
Retorna histórico completo de consultas de uma cidade.

**Exemplo:**
```bash
curl http://localhost:3000/weather/history/London
```

## Arquitetura

```
src/
├── common/           # DTOs, interfaces e utilitários compartilhados
├── config/           # Configurações da aplicação
├── weather/          # Módulo principal de clima
│   ├── weather.controller.ts
│   ├── weather.service.ts
│   └── weather.module.ts
├── cache/            # Módulo de cache Redis
├── database/         # Módulo Prisma
└── main.ts           # Entry point da aplicação
```

### Fluxo de dados

1. Cliente faz requisição para `/weather/:city`
2. Controller valida entrada
3. Service verifica cache Redis
4. Se não houver cache, consulta OpenWeatherMap API
5. Salva resultado no PostgreSQL
6. Armazena em cache por 10 minutos
7. Retorna dados ao cliente

## Testes

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Cobertura de testes
npm run test:cov
```

## Scripts disponíveis

```bash
npm run build          # Compila o projeto
npm run format         # Formata código com Prettier
npm run lint           # Executa ESLint
npm run prisma:generate # Gera Prisma Client
npm run prisma:migrate  # Executa migrations
```

## Variáveis de Ambiente

Veja `.env.example` para lista completa de variáveis necessárias.

## Licença

UNLICENSED - Projeto privado

## Autor

Gilvania

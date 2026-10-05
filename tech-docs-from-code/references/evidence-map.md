# Source map: code artifact → documented fact

Survey route. Left column — what to find in the repository; right — the fact extracted and the section
it feeds (§1 Overview, §2 Business Logic, §3 Architecture, §4 API, §5 Data Model, §6 Configuration,
§7 Monitoring & Logs). Traversal order: manifests → entry points → routers → services → models → configs
→ infrastructure → observability → tests.

## Universal artifacts

| Artifact | Fact extracted | § |
|---|---|---|
| `README*`, `docs/`, `ADR*`, `CHANGELOG*` | claimed purpose (verify against code!), history | 1 (as a hypothesis), Open questions |
| `git log --oneline -50`, `git rev-parse --short HEAD` | activity, document revision, recent changes | header, 1 |
| manifests: `pyproject.toml`, `package.json`, `go.mod`, `pom.xml`, `*.csproj`, `Gemfile` | stack, versions, package purpose, entry point (`scripts`, `[project.scripts]`, `main`) | 1, 6 |
| lock files (`poetry.lock`, `pnpm-lock.yaml`) | exact versions of key dependencies | 1 |
| `Makefile`, `justfile`, `Taskfile`, `scripts/*` | run, migration, test, lint commands | 1, 6 |
| `Dockerfile`, `.dockerignore` | base image, runtime version, port, start command, user, healthcheck | 1, 6, 3 |
| `docker-compose*.yml`, `helm/`, `k8s/`, `*.tf` | service composition, ports, networks, volumes, dependencies, env vars, limits | 3, 6 |
| `.env`, `.env.example`, `*.env.dist` | parameter names and defaults (never secret values) | 6 |
| `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile` | build/deploy flow, tests, migrations in the pipeline, environments | 3, 6 |
| `LICENSE`, `CONTRIBUTING.md` | external constraints, contribution rules | 1 (if relevant) |
| `tests/`, `*_test.*`, `conftest.py`, fixtures | actual rules, edge cases, data shapes, expected error codes | 2, 4, 5 |
| `TODO`, `FIXME`, `HACK`, `deprecated`, `@Deprecated` | known tech debt and limits | 3, Open questions |

## Entry points and HTTP layer

| Artifact / search hint | Fact extracted | § |
|---|---|---|
| `main.py`, `app.py`, `asgi.py`, `wsgi.py`, `manage.py`, `index.ts`, `server.ts`, `cmd/*/main.go`, `Program.cs`, `Application.java` | how the app boots, port, middleware, router registration, DI | 1, 3 |
| `grep -rn "include_router\|add_url_rule\|@Controller\|router\.\(get\|post\)\|app\.\(get\|post\)"` | endpoint list and their handlers | 4 |
| `openapi.json`, `swagger*`, `*.proto`, `*.graphql`, `*.avsc` | machine-readable contracts: paths, schemas, codes, fields | 4 |
| middleware, `interceptors/`, `filters/`, guards, `deps.py` | authentication, roles/scopes, limits, request correlation | 3, 4, 7 |
| `exceptions.py`, `error_handlers`, `@ExceptionHandler`, `errorHandler` | error shape, domain codes | 4 |
| pagination/sorting: `limit`, `offset`, `cursor`, `order_by` | paging rules and limits | 4 |

## Domain and business logic

| Artifact / search hint | Fact extracted | § |
|---|---|---|
| `services/`, `domain/`, `usecases/`, `handlers/` | scenarios and their steps, transaction boundaries | 2 |
| `schemas/`, `dto/`, `validators/` | validation rules, required fields, constraints | 2, 4 |
| `enum`, `status`, `state`, `Choice`, `const` | statuses and lifecycle | 2 |
| `tasks/`, `jobs/`, `celery`, `cron`, `sidekiq`, `@Scheduled` | async and scheduled work, retries | 2, 3 |
| `publishers/`, `producers/`, `consumers/`, `events/` | events, topics, queues, delivery guarantees | 2, 3, 4 |
| `idempotency`, `lock`, `retry`, `backoff`, `circuit breaker` | resilience, replay handling, compensations | 2 |
| `permissions`, `roles`, `policy`, `scopes`, `acl` | access rights and their enforcement | 2, 4 |
| transactions: `commit`, `rollback`, `session.begin`, `@Transactional` | where changes are committed, what is not atomic | 2, 5 |

## Data model

| Artifact / search hint | Fact extracted | § |
|---|---|---|
| `models/`, `entities/`, `*.entity.ts`, `schema.prisma` | tables, fields, types, relations | 5 |
| `migrations/`, `alembic/versions`, `V*__*.sql`, `changelog*.xml` | actual schema at the current revision, evolution, dangerous migrations | 5 |
| indexes: `Index(`, `index=True`, `@Index`, `CREATE INDEX` | what is indexed and which queries it serves | 5 |
| constraints: `unique=True`, `CheckConstraint`, `ForeignKey`, `ON DELETE` | integrity and cascades | 5 |
| `redis`, `cache`, `cache_key`, `ttl` | cache: what, where, how long, invalidation | 5 |
| `mongodb`, `collections`, `documents` | document model, nesting, indexes | 5 |
| seed/fixtures, dictionaries, enum tables | initial and reference data | 5 |
| encryption: `encrypt`, `fernet`, `kms`, `pgcrypto`, `mask` | personal data protection | 5, 7 |

## Configuration

| Artifact / search hint | Fact extracted | § |
|---|---|---|
| `config.py`, `settings.py`, `Settings(BaseSettings)`, `config/*.yaml`, `application*.yml`, `appsettings*.json`, `viper` | parameters, types, defaults, validation | 6 |
| `os.getenv`, `process.env`, `env::var`, `Environment.GetEnvironmentVariable` | variables read in code and their defaults | 6 |
| secret stores: `vault`, `ssm`, `SecretManager`, `sealed-secrets` | secret origin, rotation | 6 |
| feature flags: `feature_flag`, `toggle`, `LaunchDarkly`, `unleash` | behavior switches and defaults | 6 |
| pools and timeouts: `pool_size`, `max_overflow`, `timeout`, `max_connections`, `workers` | performance parameters and their effect | 6 |
| `logging`/`structlog`/`winston`/`logback` configs | levels, format, log destinations | 6, 7 |

## Observability

| Artifact / search hint | Fact extracted | § |
|---|---|---|
| `grep -rn "logger\.\|log\.\|logrus\|loggerFactory"` | key messages, levels, fields | 7 |
| `request_id`, `trace_id`, `correlation_id`, `X-Request-ID` | end-to-end correlation | 7 |
| `prometheus_client`, `micrometer`, `statsd`, `opentelemetry`, `otel` | metrics and traces: names, type, exporter | 7 |
| `@Counted`, `@Timed`, `Histogram`, `Counter(`, `Gauge(` | concrete metrics and what they measure | 7 |
| `health`, `healthz`, `readyz`, `livez`, `actuator/health` | health checks and their content | 3, 7 |
| `alerts/*.yml`, `prometheus/rules`, Grafana JSON, `datadog` monitors | alert conditions, thresholds, channels | 7 |
| global exception handler, `sentry`, `rollbar`, error reporting | how failures are captured, what reaches the report | 7 |
| retention, `logrotate`, ILM, storage policies | log and metric retention | 7 |

## Quick survey commands

Patterns below are illustrative for Python-like repositories; use `glob`/`grep`:

```sh
git rev-parse --short HEAD && git log -1 --date=short --format='%ad %s'
# entry points and routers
grep -rn "FastAPI(\|include_router\|APIRouter(" --include=*.py .
# configuration
grep -rn "BaseSettings\|os.getenv\|os.environ" --include=*.py . | head -50
# models and migrations
ls migrations app/models 2>/dev/null; grep -rn "class .*Base\|__tablename__" --include=*.py .
# observability
grep -rn "logger\.\|Counter(\|Histogram(\|/health" --include=*.py . | head -50
# tech debt and limits
grep -rn "TODO\|FIXME\|deprecated" --include=*.py . | head -50
```

Stack equivalents: TypeScript — `express`, `NestFactory`, `@Controller`, `winston`, `prom-client`;
Go — `http.HandleFunc`, `viper`, `zap`, `promhttp`; Java — `@RestController`,
`@ConfigurationProperties`, `logback.xml`, `micrometer`; .NET — `Program.cs`, `appsettings.json`,
`ILogger`, `System.Diagnostics.Metrics`.

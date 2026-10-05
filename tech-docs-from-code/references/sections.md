# Document sections: what to look for in code

Seven mandatory sections: goal, facts in code, required content, diagram, pitfalls. Search hints below
are illustrative — use `glob`/`grep`, never a linear read of the tree. The resulting document is written
in Russian (the request language); this process file is English for token economy.

## 1. Overview & Purpose

**Goal:** explain in five minutes what the system is, why it exists, what it does.
**Facts:** entry point (`main.py`, `app.py`, `index.ts`, `cmd/*/main.go`, `Program.cs`, `Application.java`);
README; manifests (`pyproject.toml`, `package.json`, `go.mod`, `pom.xml` — name, version, deps); endpoint
and entity names; `docs/`, ADRs; `.env.example`; `git log --oneline -50`.
**Required:** purpose in 2–4 sentences; 3–7 key capabilities, each code-backed; boundaries — what it does
and explicitly does not; stack and versions; entry point and run command (port, env dependencies);
consumers and owner when derivable.
**Diagram:** context — component view of the system plus the outside world (`context.puml`).
**Pitfalls:** retelling the README as truth; describing the target instead of the actual architecture;
"intended for…" with no anchor.

## 2. Business Logic

**Goal:** document domain rules and processes so they can be verified and changed.
**Facts:** service/domain layer (`services/`, `domain/`, `usecases/`, `handlers/`); validators and
schemas (`schemas/`, `serializers/`, DTO); statuses and states (`status`, `state`, `enum`) and their
transition rules; background jobs and schedulers (`tasks/`, `jobs/`, `celery`, `cron`); event handlers;
transactions; domain errors raised; tests (crispest rules and edge cases live there).
**Required:** domain entities and their roles, one line each; 3–6 main scenarios as trigger → steps →
result with function anchors; rules and constraints (invariants, checks, limits, access rights,
idempotency); lifecycle of the key entity — statuses and allowed transitions; failures and compensations
(retries, rollbacks, sagas); what runs synchronously versus in a queue or worker; scheduled operations
(crons, TTL, cleanups, reports).
**Diagrams:** activity with swimlanes per role/component for the main process; state for the entity
lifecycle; sequence when call order and transaction boundaries matter.
**Pitfalls:** mixing domain rules with implementation detail; describing intended behavior without
checking code; skipping negative paths and error handling.

## 3. Architecture & Context

**Goal:** show the system's composition, boundaries, interactions, and the architectural decisions taken.
**Facts:** directory and module structure; entry points; router and dependency registration
(`include_router`, DI containers, providers); external clients (`clients/`, `adapters/`); migrations;
`docker-compose.yml`, k8s/helm manifests, `Dockerfile`, CI pipelines; framework configuration; ADRs and
tradeoff comments; `TODO`/`FIXME`/`deprecated` markers.
**Required:** actual architecture type (modular monolith, services, layered, event-driven) justified by
code; layers and modules — purpose and allowed call direction; external systems — protocol, payload,
behavior when unavailable; data flow from request entry to storage and response; sync and async links —
exchanges, topics, queues, event names; cross-cutting concerns — authn/authz, configuration, error
handling, caching; known limits and tech debt visible in code.
**Diagrams:** context (outside world) + components (inside the service) + deployment (where it runs);
sequence for a cross-system scenario.
**Pitfalls:** a diagram disconnected from the text; "microservices" where there is a single process;
missing dependency direction; no legend for colors and arrow types.

## 4. API & Contracts

**Goal:** give a complete, precise interaction surface: endpoints, messages, events.
**Facts:** routers/controllers (`api/`, `routes/`, `controllers/`); request/response schemas (Pydantic,
zod, Joi, DTO, protobuf); `openapi.json` and swagger annotations; error codes and exception handlers;
authentication (scopes, roles, headers); pagination and filters; versioning; limits (rate limit,
timeouts); event schemas (topics, payloads); gRPC contracts; client SDKs; integration tests as call
examples.
**Required:** endpoint table — method, path, purpose, auth, role/scope, handler file; request and
response models — required and optional fields, types, constraints, JSON examples; response and error
codes — error body shape, domain codes, examples; authn/authz — scheme, where the token is issued, what
is validated; pagination, sorting, filtering, idempotency (keys, retries); versioning and compatibility
policy (what counts as breaking); events — name, payload, delivery guarantees, ordering, idempotency;
limits — payload size, timeouts, quotas, rate limit.
**Diagrams:** sequence for 1–2 key scenarios including a failure/retry path; a service-interaction
diagram when several services are involved.
**Pitfalls:** an endpoint list without schemas and error codes; hand-written examples instead of
schema-derived ones; omitting auth and limits; presenting internal methods as a public API.

## 5. Data Model

**Goal:** document storage structure, relations, integrity rules, and migration history.
**Facts:** ORM models (`models/`, `entities/`, `*.entity.ts`); migrations (Alembic, Django, Flyway,
Liquibase, Prisma, knex); SQL files; indexes and constraints; status enums; soft delete; audit fields;
cache keys and Redis structures; Mongo documents; analytics marts; seed/fixtures; test `schema.sql`.
**Required:** table/collection list — purpose, key, approximate size, owning module; fields — type,
nullability, default, constraint — for each significant entity; relations and cardinalities, and where
the FK lives; indexes and unique constraints — which queries they serve; integrity — FKs, cascades,
`ON DELETE`, transaction boundaries; migrations — how they are applied, reversibility, dangerous ones
(backfills, locks); cache and derived data — what, where, TTL, invalidation; personal data — what is
stored, encryption, masking (never the values themselves).
**Diagram:** ER (or class when domain types and methods matter), one per domain; with 20+ tables split by
domain and keep one overview.
**Pitfalls:** a diagram with table names only and no fields; mismatch with migrations (always take the
latest revision); missing join tables; enum values left undocumented.

## 6. Configuration

**Goal:** enumerate everything that controls behavior, and what happens when a value is wrong.
**Facts:** `.env`, `.env.example`; `config.py`/`settings.py`/`config/*.yaml`, `application.yml`,
`appsettings.json`; settings validation schemas (Pydantic Settings, convict, viper); defaults in code;
secret stores (Vault, SSM, k8s Secrets); feature flags; pool and timeout parameters; logging settings;
`Dockerfile`/compose/helm values; CI variables; Makefile targets.
**Required:** parameter table — name, purpose, type, default, required, source (env/secret/file), effect
of a wrong value; profiles and modes — dev/stage/prod differences and where they are set; required and
interdependent parameters — what breaks when missing; secrets — which exist, origin, rotation (no
values); behavior flags — effect and default; performance parameters — pools, workers, timeouts, retries,
batch sizes; startup procedure — commands, dependencies, migrations.
**Diagram:** deployment when configuration differs per environment; otherwise tables suffice.
**Pitfalls:** printing secret values; treating `.env.example` as complete without checking code (defaults
and parameters often exist only in code); missing the "what if it is unset" column.

## 7. Monitoring & Logs

**Goal:** explain how to tell the system is healthy and how to localize a failure.
**Facts:** logger setup (`logging`, `structlog`, `winston`, `logback`, logrus); log format and levels;
key messages (`grep -rn "logger\.\|log\."`); correlation (`request_id`, `trace_id`); metrics
(`prometheus_client`, `micrometer`, `statsd`, OpenTelemetry); health/liveness/readiness endpoints;
tracing and sampling; alerts and dashboards as IaC (`alerts/*.yml`, Grafana JSON); audit logs; exception
handlers; retention and shipping; collector sidecars in compose/helm.
**Required:** log format — structure, mandatory fields, levels and what goes to each, destination
(stdout/file); key events and messages — what to search during typical incidents, with exact text or
field; correlation — how a request, log line, trace, and event are linked (headers, ids); metrics —
names, type (counter/gauge/histogram), meaning, where to look, SLI/SLO when they exist; health checks —
what they test and what they return; tracing — instrumentation, exporter, sampling, what a trace shows;
alerts — conditions, thresholds, destination (from IaC); audit and security — what is recorded,
retention, personal data in logs (masking); incident table — symptom → metric/log → likely cause.
**Diagram:** observability map (signal sources → collectors → stores → dashboards/alerts); state or
sequence only when they help explain diagnostics.
**Pitfalls:** listing libraries without metric names and log fields; "logs go to stdout" without levels
and format; no symptom → where-to-look mapping; ignoring personal data in logs.

## Open questions (optional but useful)

Every discrepancy, guess, and gap goes here as a single line: what is unknown, why (absent from code /
README contradicts code), who can confirm. No owner — say so; an invented owner is worse than none.

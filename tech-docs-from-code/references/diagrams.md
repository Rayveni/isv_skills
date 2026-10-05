# PlantUML diagrams for the tech doc

Every skeleton below passed `check` and was rendered; copy them and replace the facts with real ones. One
file per diagram. Mandatory: `@startuml`/`@enduml`, `title`, explicit `skinparam`, and a `legend` listing
the code sources behind the facts (traceability, not decoration). Diagram labels and legends stay in
Russian — that is the document language.

## Section → diagram

| § | Primary diagram | Add when |
|---|---|---|
| 1 Overview | Context (component: system + outside world) | — |
| 2 Business Logic | Activity with swimlanes per role/component | State — entity lifecycle; Sequence — when transactions matter |
| 3 Architecture | Components inside the service + Deployment | Sequence — cross-system scenario |
| 4 API & Contracts | Sequence for 1–2 key scenarios | Component — event flow between services |
| 5 Data Model | ER (`entity`) per domain | Class — when domain types and methods matter |
| 6 Configuration | Deployment, when config differs per environment | — (tables usually suffice) |
| 7 Monitoring | Observability map (sources → collectors → dashboards) | State/Sequence — only if they explain diagnostics |

## Rules

- One diagram answers one question; never mix sequence and component.
- Up to ~30 elements; more — split into an overview plus per-scenario detail.
- Explicit aliases: `component "Сервис заказов (orders-api)" as svc`, then only `svc`. ASCII aliases,
  Russian labels.
- Arrow colors by meaning: `-[#D9534F]->` failure/current, `-[#5CB85C,bold]->` target/happy path. The
  legend must match the colors.
- `legend` lists the source files behind the facts; if a diagram rests on a guess, say so.
- In a section, put the diagram after the paragraph it illustrates, with a caption and a link to the
  `.puml` for edits.
- Files: `docs/diagrams/<topic>.puml` + same-name `.png`. Topics: `context`, `components`,
  `business-flow`, `order-lifecycle`, `api-sequence`, `data-model`, `deployment`, `observability`.

## Check and render (mandatory)

Node from `load_workspace_dependencies`; `<plantuml-skill>` is the base directory of the `plantuml` skill:

```sh
node "<plantuml-skill>/scripts/plantuml.mjs" check  docs/diagrams/context.puml
node "<plantuml-skill>/scripts/plantuml.mjs" render docs/diagrams/context.puml -o docs/diagrams/context.png
```

`check` prints ASCII art or fails with the server's line number. After rendering, read the PNG **as an
image**: clipped labels, overlapping boxes, arrows across the whole canvas, legend/color mismatch, text
too small. Fix the source and re-check. A diagram without a passing `check` and a reviewed `render` never
enters the document.

---

## 1. System context

```plantuml
@startuml context
title Контекст системы: <Сервис>
skinparam componentStyle rectangle
skinparam shadowing false
skinparam backgroundColor #FFFFFF
skinparam defaultFontName SansSerif

actor "Клиент\n(веб/мобильное)" as user
actor "Оператор" as ops

component "Сервис заказов\n(orders-api)" as svc
component "Биллинг" as billing
database "PostgreSQL\norders" as db
queue "RabbitMQ\norder.created" as mq
cloud "Платёжный шлюз" as pay

user --> svc : HTTPS / REST
ops --> svc : HTTPS / REST (админ-операции)
svc --> db : SQL :5432
svc --> mq : AMQP (событие)
svc --> billing : gRPC Reserve()
billing --> pay : HTTPS

legend right
  Источники: app/main.py, app/api/*, docker-compose.yml, .env.example
  Сплошные стрелки — синхронные вызовы; svc -> mq — публикация событий
end legend
@enduml
```

## 2. Service components

```plantuml
@startuml components
title Компоненты сервиса <name>
skinparam componentStyle rectangle
skinparam shadowing false
skinparam backgroundColor #FFFFFF

package "HTTP-слой" {
  [роутеры\napp/api/*] as api
  [схемы запросов/ответов\napp/schemas/*] as schemas
}
package "Прикладной слой" {
  [сервисы\napp/services/*] as services
  [фоновые задачи\napp/tasks/*] as tasks
}
package "Доступ к данным" {
  [репозитории\napp/repositories/*] as repos
  [модели ORM\napp/models/*] as models
}
database "PostgreSQL" as db
queue "Redis (брокер)" as redis

api --> schemas
api --> services
services --> repos
repos --> models
models --> db
services --> tasks
tasks --> redis
@enduml
```

## 3. Business process (activity with swimlanes)

```plantuml
@startuml business-flow
title Бизнес-процесс: оформление заказа
skinparam shadowing false
skinparam backgroundColor #FFFFFF

|Клиент|
start
:POST /orders;
|#AntiqueWhite|API|
:валидация схемы запроса;
if (товар в наличии?) then (да)
  :резерв на складе;
  |Сервис|
  :расчёт стоимости и скидок;
  :создание заказа (status=new);
  |Брокер|
  :публикация order.created;
  |API|
  :202 Accepted + order_id;
else (нет)
  |API|
  :409 Conflict;
  stop
endif
|Воркер|
:обработка order.created;
:подтверждение оплаты;
if (оплата прошла?) then (да)
  :status=paid;
else (нет)
  :status=failed;
  :компенсация резерва;
endif
stop
@enduml
```

## 4. Entity lifecycle (state)

```plantuml
@startuml order-lifecycle
title Жизненный цикл заказа (orders.status)
skinparam shadowing false
skinparam backgroundColor #FFFFFF

[*] --> new : POST /orders
new --> paid : оплата подтверждена
new --> failed : ошибка оплаты или таймаут
new --> cancelled : отмена клиентом/оператором
paid --> shipped : отгрузка
shipped --> done : подтверждение получения
failed --> cancelled : компенсация резерва
done --> [*]
cancelled --> [*]

note right of paid
  Источник: app/services/payment.py,
  app/models/order.py (class OrderStatus)
end note
@enduml
```

## 5. API scenario (sequence)

```plantuml
@startuml api-sequence
title Последовательность: POST /orders
skinparam shadowing false
skinparam backgroundColor #FFFFFF
autonumber "<b>[00]"

actor "Клиент" as c
participant "API\n(app/api/orders.py)" as api
participant "OrderService" as svc
database "PostgreSQL" as db
queue "RabbitMQ" as mq

c -> api : POST /orders {items, customer_id}
activate api
api -> api : валидация OrderCreate
api -> svc : create_order(dto)
activate svc
svc -> db : INSERT orders / order_items
db --> svc : order_id
svc -> mq : publish order.created
svc --> api : OrderRead
deactivate svc
api --> c : 201 Created {id, status: new}
deactivate api
@enduml
```

A failure path is a second diagram of the same shape with `alt`/`else`, or a separate file
`api-sequence-error.puml` (timeout, retry, rollback).

## 6. Data model (ER)

```plantuml
@startuml data-model
title Модель данных: заказы
skinparam shadowing false
skinparam backgroundColor #FFFFFF
skinparam linetype ortho

entity "customers" as customers {
  * id : uuid
  --
  * email : varchar(255)
  * created_at : timestamptz
}

entity "orders" as orders {
  * id : uuid
  --
  * customer_id : uuid
  * status : order_status
  * total_amount : numeric(12,2)
  * created_at : timestamptz
}

entity "order_items" as order_items {
  * order_id : uuid
  * product_id : uuid
  --
  * quantity : int
  * price : numeric(12,2)
}

customers ||--o{ orders : оформляет
orders ||--|{ order_items : содержит

legend right
  * — обязательное поле; связи — по внешним ключам из миграций
  Источник: migrations/versions/*, app/models/*
end legend
@enduml
```

Cardinalities: `||--o{` one-to-many, `||--||` one-to-one, `}o--o{` many-to-many (with the join table as
its own entity). Always reconcile the schema against the **latest** migration, not the model alone.

## 7. Deployment

```plantuml
@startuml deployment
title Развёртывание: <среда>
skinparam shadowing false
skinparam backgroundColor #FFFFFF

cloud "Балансировщик nginx" as lb

node "Хост app-01 (Docker)" as host1 {
  node "Контейнер web\nuvicorn --workers 4" as web {
    artifact "orders-api:<версия>" as img
  }
  node "Контейнер worker\ncelery -Q orders" as worker {
    artifact "orders-api:<версия>" as img2
  }
}
node "Хост pg-01" as host2 {
  database "PostgreSQL 16\nБД orders" as db
}
node "Хост mq-01" as host3 {
  queue "RabbitMQ 3.13" as mq
}

lb --> web : :8000
web --> db : :5432
web --> mq : :5672
worker --> mq
worker --> db

legend right
  Источник: docker-compose.yml, k8s/*.yaml, Dockerfile
end legend
@enduml
```

## 8. Observability

```plantuml
@startuml observability
title Наблюдаемость: источники сигналов
skinparam componentStyle rectangle
skinparam shadowing false
skinparam backgroundColor #FFFFFF

component "Сервис\norders-api" as app
component "JSON-логи\n(structlog) → stdout" as logs
component "Метрики\n/prometheus или /metrics" as metrics
component "Трейсы\nOpenTelemetry SDK" as traces
component "Health\n/health /ready" as health

component "Loki" as loki
component "Prometheus" as prom
component "Tempo" as tempo
component "Grafana" as grafana
component "Alertmanager" as am
component "Проверки платформы\n(k8s probes)" as probes

app --> logs
app --> metrics
app --> traces
app --> health
logs --> loki
metrics --> prom
traces --> tempo
loki --> grafana
prom --> grafana
tempo --> grafana
prom --> am : alert rules
health --> probes

legend right
  Источник: app/core/logging.py, app/metrics.py, app/api/health.py, alerts/*.yml
end legend
@enduml
```

---

## AS IS / TO BE

Separate files `as-is/*.puml` and `to-be/*.puml` of the same diagram; each carries a legend stating the
color meaning: `-[#D9534F]->` current state, `-[#5CB85C,bold]->` target state. Place them side by side in
the document and list the differences below. Never draw the same content in two notations.

## Common failures

| Symptom in the PNG | Cause in the source |
|---|---|
| An arrow crosses the whole canvas | No intermediate nodes or `package` grouping |
| Labels are clipped | Text too long without `\n`; split into lines |
| Legend does not match the colors | Colors were added after the legend was written |
| Diagram does not fit a page | More than ~30 elements: split by scenario |
| Schema disagrees with migrations | The model was taken from code without checking the latest migration revision |

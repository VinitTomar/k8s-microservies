# Learn K8S

## Scope

1. Http APIs
2. Events
3. Cron JOBS
4. Caching
5. Auto Scaling for 1, 2, & 3 points
6. Monitoring
7. Traces
8. Logging
9. Alerts

## Project Folder structure

```
/root
  ├── apps/
      ├── apis/
      └── consumers/
  ├── libs/
      ├── mysql-conn/
      └── rabbit-mq-conn/
  ├── event-bus/
      ├── charts/
      ├── package.json
      ├── values.yaml
      └── Chart.yaml
  ├── tsconfig.base.json
  ├── package.json
  ├── pnpm-workspace.yaml
  ├── .gitigonre
  ├── README.md
  └── turbo.json
```


## Tech stack

| SN | Requirement | Choice | Done |
| ------ | ------ | ------ | ------ |
| 1. | Programming lang | Typescript | ✅ |
| 2. | Http framework | ExpressJS | ✅ |
| 3. | Queue | RabbitMQ | ✅ |
| 4. | Cron JOBS | ? | [ ] |
| 5. | Caching | Redis | [ ] |
| 6. | AutoScaling | KEDA, Knative & HPA | ✅ |
| 7. | Monitoring | Grafana | [ ] |
| 8. | Traces | ? | [ ] |
| 9. | Logging | ? | [ ] |
| 10. | Alerts | ? | [ ] |

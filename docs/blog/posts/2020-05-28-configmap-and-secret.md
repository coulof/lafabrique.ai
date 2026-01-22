---
date: 2020-05-28
authors:
  - coulof
categories:
  - Kubernetes
---

# Merge ConfigMap and Secrets

To use a [Secret](https://kubernetes.io/docs/concepts/configuration/secret/) :material-kubernetes: value within a [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) :material-kubernetes: you can use an [initContainer](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/) :material-kubernetes: to call a template engine.

<!-- more -->

## The premise

In the [previous post](2020-05-27-kubernetes-event-monitoring.md), I presented how to use kubernetes-event-exporter :material-github: with Elasticsearch.

One of the problems I faced is that the tool doesn't follow the configuration guidelines from the [12-factor app](https://12factor.net/config) methodology.

That is to say, we have to put the credentials in the YAML configuration rather than in environment variables.

As for Kubernetes, it doesn't allow us to mix Secret values within ConfigMap.

## The solution

To solve that issue, we have 3 components:

1. the `Secret` as-is
2. the `ConfigMap` which will have the configuration as a **template**
3. the `initContainer` that will merge the two

### Secret

The secret comes from the [ECK Operator](https://www.elastic.co/elastic-cloud-kubernetes):

```yaml
apiVersion: v1
kind: Secret
data:
  elastic: YU84bnc4NzZWMXBWMThOZThqOFlnOE1r
```

### ConfigMap

The important piece is using ERB syntax `<%%= %>` to call ruby code and [ENV](https://ruby-doc.org/core-2.7.0/ENV.html) hash to access environment variables:

```yaml
receivers:
  - name: "es"
    elasticsearch:
      hosts:
        - https://quickstart-es-http:9200
      index: kube-events
      username: elastic
      password: "<%%= ENV['ELASTIC_PASSWORD'] %>"
```

### Why ERB?

1. Because I love Ruby!
2. Because the erb command line comes with the [ruby docker official image](https://hub.docker.com/_/ruby) :material-docker: (no custom Dockerfile needed)

### initContainer

Here is the `Deployment` with the initContainer `config` that will craft the config file from both the `Secret` passed as an environment variable and the `ConfigMap` template:

```yaml
initContainers:
- name: config
  image: ruby:2.7-alpine
  command: ['sh', '-c', 'erb /tmp/config.tpl > /tmp/cfg/config.yaml']
  env:
  - name: ELASTIC_PASSWORD
    valueFrom:
      secretKeyRef:
        name: quickstart-es-elastic-user
        key: elastic
  volumeMounts:
  - name: config-tpl
    mountPath: /tmp/config.tpl
    subPath: config.tpl
  - name: config
    mountPath: /tmp/cfg
```

The main container can later use that generated file.

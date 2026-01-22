---
date: 2020-05-27
authors:
  - coulof
categories:
  - Kubernetes
---

# K8s events monitoring

For events monitoring you can use this ready-to-go elastic + kibana + k8s-event-exporter stack from: [k8s-events-reporting](https://github.com/coulof/k8s-events-reporting) :material-github:

<!-- more -->

## The premise

As part of an internal project at Dell, I needed to measure the time between the different PVC and PV states (Pending, Bound, Mounted, etc.) through their lifecycles.

The idea is to measure the performance of our different drivers ([csi-powermax](https://github.com/dell/csi-powermax) :material-github:, [csi-isilon](https://github.com/dell/csi-isilon) :material-github:, [csi-vxflexos](https://github.com/dell/csi-vxflexos) :material-github:, [csi-powerstore](https://github.com/dell/csi-powerstore) :material-github:) in various scenarios.

The PV/PVC/Pod status is available with `kubectl get pv,pvc,po` and you can track the lifecycle through [Kubernetes events](https://kubernetes.io/docs/tasks/debug-application-cluster/) :material-kubernetes: with `kubectl get events`.

## How to get the events?

The [Kubernetes events reporting](https://github.com/coulof/k8s-events-reporting) :material-github: stack is composed of:

* [kubernetes-event-exporter](https://github.com/opsgenie/kubernetes-event-exporter) :material-github: for event collection
* [elasticsearch](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-elasticsearch.html) for the database
* [kibana](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-kibana.html) for the reporting engine

### kubernetes-event-exporter

This utility developed by OpsGenie will basically dump the events and forward them to different destinations (sink in their terminology).

### ElasticSearch & Kibana

The deployment uses the [Elastic Cloud on Kubernetes](https://www.elastic.co/elastic-cloud-kubernetes).

Thanks to the operator framework, we can easily [configure and deploy](https://www.elastic.co/guide/en/cloud-on-k8s/1.1/k8s-quickstart.html) a secured version of ElasticSearch and Kibana:

```sh
kubectl apply -f https://download.elastic.co/downloads/eck/1.1.1/all-in-one.yaml
```

After running `install.sh`, you can load the kibana dashboard with:

```sh
curl -X POST "localhost:5601/api/kibana/dashboards/import?exclude=index-pattern" \
  -H 'Content-Type: application/json' -d @kibana-dashboard.json
```

![Kibana Dashboard](../../assets/img/kibana_dashboard.png)

## Wrap-up

That [Kubernetes events monitoring stack](https://github.com/coulof/k8s-events-reporting) :material-github: has been used and tested for one-shot statistics and analytics. The component and approach can fit other use-cases like observability, alerting, and monitoring.

There is more to say about the kubernetes-event-exporter configuration in the [ConfigMap and Secrets](2020-05-28-configmap-and-secret.md) post.

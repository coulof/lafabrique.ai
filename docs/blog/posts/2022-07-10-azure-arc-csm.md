---
date: 2022-07-10
authors:
  - coulof
categories:
  - Kubernetes
  - Dell
---

# Dell Container Storage Module - A GitOps-ready platform!

One of the very first things I do after deploying a Kubernetes cluster is to install a CSI Driver to provide persistent storage to my workloads; coupled with a GitOps workflow, it takes seconds literally to be able to run stateful workloads.

<!-- more -->

## Introduction

GitOps process is nothing more than a few [principles](https://opengitops.dev/#principles):

* Git as a single source of truth
* Resource explicitly declarative
* Pull based

The following article will show us how to use the Azure Arc GitOps solution to deploy the Dell CSI driver for PowerMax and affiliated Container Storage Modules.

## Azure Arc GitOps

The platform we will use to implement the GitOps workflow is Azure Arc with GitHub. Other solutions are possible using [Argo CD](https://github.com/argoproj/argo-cd) :material-github:, [Flux CD](https://fluxcd.io/) or [GitLab](https://docs.gitlab.com/ee/user/clusters/agent/gitops.html) :material-gitlab:.

Azure GitOps itself is built on top of fluxcd.

### Install Azure Arc behind a proxy

The first step is to onboard your existing Kubernetes cluster within Azure portal.

If you're behind a proxy, you may need an intermediate transparent proxy. I used the [Squid image by Ubuntu](https://hub.docker.com/r/ubuntu/squid) :material-docker:.

```shell
export HTTP_PROXY=http://mysquid-proxy.dell.com:3128
export HTTPS_PROXY=http://mysquid-proxy.dell.com:3128
export NO_PROXY=https://kubernetes.local:6443

az connectedk8s connect --name AzureArcCorkDevCluster \
    --resource-group AzureArcTestFlorian \
    --proxy-https http://mysquid-proxy.dell.com:3128 \
    --proxy-http http://mysquid-proxy.dell.com:3128 \
    --proxy-skip-range 10.0.0.0/8,kubernetes.default.svc,.svc.cluster.local,.svc
```

### Add ServiceAccount

Create a service account for Azure Arc:

```shell
kubectl create serviceaccount azure-user
kubectl create clusterrolebinding demo-user-binding \
    --clusterrole cluster-admin --serviceaccount default:azure-user
```

## Repository

The Git repository organization is crucial for GitOps. We use the [monorepo](https://fluxcd.io/docs/guides/repository-structure/#monorepo) approach:

```
.
├── apps
│   ├── base
│   └── overlays
│       ├── cork-development
│       └── cork-production
├── clusters
│   ├── cork-development
│   └── cork-production
└── infrastructure
    ├── cert-manager
    ├── csm-replication
    ├── external-snapshotter
    └── powermax
```

You can consult all files in [https://github.com/coulof/fluxcd-csm-powermax](https://github.com/coulof/fluxcd-csm-powermax) :material-github:.

!!! note
    The GitOps agent comes with [multi-tenancy support](https://docs.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2#update-manifests-for-multi-tenancy) therefore we cannot cross-reference objects between namespaces.

## Demo

<iframe height="560" src="https://www.youtube.com/embed/a_fKpcrxlD0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Conclusion

This article is the first of a series that will explore more of the GitOps workflow. Next, we will see how to manage application and persistent storage with GitOps workflow, how to upgrade the modules, etc.

## References

* [https://www.gitops.tech/](https://www.gitops.tech/)
* [https://github.com/coulof/fluxcd-csm-powermax](https://github.com/coulof/fluxcd-csm-powermax)

---
date: 2020-06-19
authors:
  - coulof
categories:
  - Kubernetes
  - Dell
---

# Pod uses dynamic environment variable

This post is build-up on the [Merge ConfigMap and Secrets](2020-05-28-configmap-and-secret.md) post.
It is another use of [initContainers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/) :material-kubernetes:, templating, and [entrypoint](https://docs.docker.com/engine/reference/builder/#entrypoint) :material-docker: to customize a container startup.

<!-- more -->

## The premise

I worked on a Kubernetes architecture where the hosts of the cluster had several NIC Cards connected to different networks (one to expose the services, one for management, one for storage, etc.).

When creating and mounting an NFS volume, the [CSI driver for PowerScale/Isilon](https://github.com/dell/csi-isilon/) :material-github: passes a client IP that is used to create the export array-side. The driver picks the IP return by the fieldRef `status.hostIP`.

The problem is that IP is used to serve Kubernetes services (aka the Internal IP displayed by `kubectl get node -o wide`). So how to change that value to use the storage network-related IP?

## The implementation

In my setup, I know which NIC card connects to which network (in this case `ens33`).

The patch to the native [csi-isilon](https://github.com/dell/csi-isilon/) :material-github: deployment aims to:

1. Have a simple way to get the IP address of a specific NIC card
2. Pass that information on the driver startup

The first piece of configuration is to create a custom [entrypoint](https://docs.docker.com/engine/reference/builder/#entrypoint) :material-docker: that will set the `X_NODE_IP` variable with the proper value.

Here I use an ERB template in which I call the `ip addr` command in a subshell, then extract the IP with substring matching.

It is not displayed in the configuration above, but the `ip addr` command works because the Isilon Node Pod has access to the host network thanks to `hostNetwork: true` in its definition.

The second step is to add an [initContainers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/) :material-kubernetes: to the [DaemonSet](https://github.com/dell/csi-isilon/blob/master/helm/csi-isilon/templates/node.yaml) :material-github: to generate a new entrypoint, and then force the driver Pod to use the new entrypoint.

## Wrap-up

The same tools (ERB, ConfigMap, initContainer, Entrypoint), can be used to tune pretty much any Kubernetes Pod deployments to customize or add extra-capabilities to your Pod startup (integration with [Vault](https://www.vaultproject.io/) :material-key:, tweak program startup, etc.).

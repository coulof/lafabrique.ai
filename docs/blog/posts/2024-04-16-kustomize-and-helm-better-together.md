---
date: 2024-04-16
authors:
  - coulof
categories:
  - Kubernetes
---

# Helm and Kustomize better together

To patch a Helm chart without modifying the template manually, you can combine Kustomize's [patch transformer](https://kubectl.docs.kubernetes.io/references/kustomize/builtins/#_patchtransformer_) :material-kubernetes: and [Helm chart generator](https://kubectl.docs.kubernetes.io/references/kustomize/builtins/#_helmchartinflationgenerator_) :material-kubernetes:.

<!-- more -->

## The premise

Like every other Helm charts, the [Dell CSM Helm charts](https://github.com/dell/helm-charts/blob/main/installation-wizard/container-storage-modules/values.yaml) :material-github: see more and more variables being templatized.

This has proven to be challenging to maintain and a burden for users who want to customize original Helm charts.

For example, a contributor needs to control the [priority and preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#priorityclass) :material-kubernetes: of the CSI Driver for PowerScale Pod.

Making that change in this Helm chart means for the maintainer to propagate that change in every other Helm charts (no less than 14 at the time of the writing).

## The solution

Instead of waiting for a change to be released in the official chart, we can use Kustomize to install a patched Helm chart.

We need to use:

- The `helmCharts` generator to configure the deployment of the driver using the public repository
- The `patches` transformer to add the `priorityClassName` to the rendered files

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
- name: csi-isilon
  repo: https://dell.github.io/helm-charts
  releaseName: isilon
  namespace: powerscale
  version: 2.7.0
  valuesFile: values.yaml

patches:
- target:
    kind: DaemonSet
    name: isilon-node
  patch: |-
    - op: add
      path: /spec/template/spec/priorityClassName
      value: system-node-critical
```

Once we have the files ready, we can render the Helm chart with:

```bash
kustomize build --enable-helm .
```

It creates a `charts` directory you can use for installation with `kubectl apply -f charts`.

## Conclusion

Kustomize is a bliss to easily patch deployments, and the same trick can be used at scale with a GitOps agent like [Flux](https://fluxcd.io/flux/components/kustomize/kustomizations/) or [Argo CD](https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/).

This is indeed better to combine with a GitOps agent since, by using Helm for template rendering and `kubectl` to apply the configuration, we lose all the Helm features like `helm ls`, `helm uninstall`, `helm update`, etc.

## Sources

* [Exhaustive example](https://github.com/kubernetes-sigs/kustomize/blob/master/examples/chart.md) :material-github: using Helm generator from official repo
* [Using CSM with Flux/Azure Arc](2022-07-10-azure-arc-csm.md)

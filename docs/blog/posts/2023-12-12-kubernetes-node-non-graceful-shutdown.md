---
date: 2023-12-12
authors:
  - coulof
categories:
  - Kubernetes
  - Storage
---

# Kubernetes Node Non-Graceful Shutdown and Remediation: Insights from Dell Technologies

*Co-authored with Michael Wells Jr.*

Kubernetes has become a pivotal technology in managing containerized applications, but it is not without challenges, particularly when dealing with stateful apps and non-graceful shutdown scenarios. This article explores how to handle such situations and, more importantly, how to enable automated remediation.

<!-- more -->

---

## Graceful vs. Non-Graceful Node Shutdowns

A **graceful** node shutdown in Kubernetes is an orchestrated process. When kubelet detects a node shutdown event, it terminates the pods on that node properly, releasing resources before the actual shutdown. This orderly process allows critical pods to be terminated after regular pods, ensuring applications continue operating as long as possible.

Issues arise with a **non-graceful** shutdown, like a hard stop or node crash. In such cases, kubelet fails to detect a clean shutdown event. Kubernetes marks the node `NotReady`, and pods in a StatefulSet can remain stuck in `Terminating` mode indefinitely.

Kubernetes adopts a cautious approach in these scenarios since it cannot ascertain if the issue is :

- A total node failure
- A kubelet problem
- A network glitch

This distinction is critical for stateful apps, where rescheduling amidst active data writing could lead to severe data corruption.

---

## Role of Dell's CSM for Resiliency

Dell's [CSM for Resiliency :simple-dell:](https://dell.github.io/csm-docs/docs/concepts/resiliency/) automates decision-making in these complex scenarios, minimizing manual intervention and maximizing uptime. A typical workflow :

1. A pod with two mounted volumes is annotated for protection with CSM Resiliency
2. Upon an abrupt node power-off, the Kubernetes API detects the failure and marks the node `NotReady`
3. The **podmon controller** interrogates the storage array, querying its status regarding the node and volumes
4. Depending on its findings and a set heuristic, the module determines whether rescheduling is safe
5. If safe, the module fences off access for the failed node, removes the volume attachment, and force-deletes the pod
6. Kubernetes reschedules the pod efficiently

!!! tip "Try it live"
    The [interactive tutorials :simple-dell:](https://dell.github.io/csm-docs/docs/interactive-tutorials/) allow you to test the functionality in a hands-on environment.

---

## How to Enable the Module

To take advantage of CSM Resiliency, you need two things :

### 1. Enable it for your driver

For example with PowerFlex :

- **CSM Wizard :** check the Resiliency box
- **Operator :** set `enabled: true` in `.spec.modules[name='resiliency']`
- **Helm chart :** set `enabled: true` in `.csi-vxflexos.podmon`

### 2. Protect your application

Add the annotation to your pods :

```yaml
podmon.dellemc.com/driver: csi-vxflexos
```

---

## Conclusion

Managing non-graceful shutdowns in Kubernetes, particularly for stateful applications, is a complex but essential aspect of ensuring system resilience and data integrity. Tools like Dell's CSM for Resiliency offer automated, intelligent solutions that keep applications running smoothly even in the face of unexpected failures.

## Sources

- [Dell CSM GitHub repository :material-github:](https://github.com/dell/csm/)
- [DevOps and Automation YouTube playlist :simple-youtube:](https://www.youtube.com/watch?v=On85eebGhhE&list=PL2nlzNk2-VMHsKVguetbetbmxd4eMfc_X&index=24)
- [Original article on Dell InfoHub :simple-dell:](https://infohub.delltechnologies.com/en-us/p/kubernetes-node-non-graceful-shutdown-and-remediation-insights-from-dell-technologies/)

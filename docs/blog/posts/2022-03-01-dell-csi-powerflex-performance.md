---
date: 2022-03-01
authors:
  - coulof
categories:
  - Dell
  - Kubernetes
---

# CSI PowerFlex performance

Containerized workloads and microservices are designed to be ephemeral. It can be to answer the needs of scalability (via Pod autoscaling) or because they process data for a short period (ML workload). Every day [stateful apps](https://www.datadoghq.com/container-report/#6) are becoming a bigger part of Kubernetes workloads.

<!-- more -->

In that context, it is vital for the storage backend to be able to serve and delete volumes & snapshots as fast as possible with a low impact on the performance of the worker nodes.

## PowerFlex Software First Architecture

The CSI driver for PowerFlex is capable of blazing-fast volume provisioning thanks to its software first architecture. The PowerFlex Software Data Client directly initiates a network connection to the Storage Data Servers and mounts the block device. This network-first approach bypasses long steps like SCSI Bus rescan and leads to saving precious time in a rapidly changing ecosystem.

## How to benchmark operations in Kubernetes

To measure the performance of the CSI driver, we can measure the time between Kubernetes events; for example, the time it takes between a volume create request and volume bounded, or Pod created and started, etc.

This benchmark has been done with vanilla Kubernetes `StatefulSet` and the help of a kube-event-export/elasticsearch/kibana stack for the reporting.

## Results

The performance of the [CSI driver for PowerFlex](https://github.com/dell/csi-powerflex/) :material-github: has a steady performance with low impact on CPU performance.

For example, it takes less than 30 seconds to provision **100 volumes** in PowerFlex and make them available to Kubernetes. It takes an extra 3 minutes to format and mount the volumes to a **single Pod**.

On another run, it takes 7 minutes from start to finish to provision **100 Pods with 4 volumes each**. In this test, the Pods are scheduled on three different nodes.

With pre-provisioned and pre-formatted volumes for the same configuration (100 Pods with 4 volumes each), it takes about the same time.

During all that time, the CPU usage on the controller pod had limited impact.

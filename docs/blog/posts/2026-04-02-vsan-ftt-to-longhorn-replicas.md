---
date: 2026-04-02
authors:
  - coulof
categories:
  - Kubernetes
  - Storage
  - Longhorn
draft: true
title: "From vSAN FTT to Longhorn Replicas: A Storage Architect's Translation Guide"
description: "VMware vSAN thinks in Failures To Tolerate and RAID policies. Longhorn thinks in replica counts and StorageClasses. Same goal, different vocabulary. Here is the Rosetta Stone."
---

# From vSAN FTT to Longhorn Replicas

## A Storage Architect's Translation Guide

*For the thousands of infrastructure teams migrating from VMware to Kubernetes-native storage.*

---

## TL;DR

VMware vSAN and Longhorn solve the same problem: keep data available when hardware fails. vSAN expresses resilience as **Failures To Tolerate (FTT)** with RAID policies. Longhorn expresses it as **replica counts** in Kubernetes StorageClasses.

**The key differences:**

- :material-content-copy: **Longhorn is always mirroring.** No erasure coding. 3 replicas = 3x raw storage. vSAN RAID-6 FTT=2 = 1.5x. That is the biggest tradeoff.
- :material-kubernetes: **Longhorn is Kubernetes-native.** StorageClasses are declarative, GitOps-friendly, and per-volume. No vCenter required.
- :material-shield-check: **Blast radius is smaller.** Each Longhorn volume has its own engine process. A controller crash affects one volume, not an entire disk group. (The engines run inside an Instance Manager pod per node, so a full Instance Manager crash affects all volumes on that node, but this is comparable to a host failure in vSAN.)
- :material-map-marker-radius: **Topology is explicit.** vSAN auto-discovers fault domains per host. Longhorn uses Kubernetes node labels and zone anti-affinity rules you define.

This article maps every vSAN availability concept to its Longhorn equivalent, with ready-to-use StorageClass examples.

<!-- more -->

## Who this is for

You spent years designing vSAN clusters. You know what FTT=2 RAID-6 means in your sleep. Now your organization is moving workloads to Kubernetes, Longhorn is the storage layer, and you need to translate your availability requirements into StorageClasses.

This is not a "which is better" article. Both are solid engineering. This is a translation guide: same concepts, different vocabulary.

!!! info "Versions covered"
    **vSAN**: VCF 9.0 / vSAN ESA ([December 2025 whitepaper](https://www.vmware.com/docs/vmw-vSAN-Availability-Technologies){target="_blank"})
    **Longhorn**: [v1.11.x](https://longhorn.io/docs/){target="_blank"} (latest stable, 2026)

## vSAN availability in 60 seconds

vSAN distributes VM data ([objects](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-planning/GUID-C0AE6C24-D920-4DF2-B5E8-BF265FFBE59A.html){target="_blank"}) across hosts in a cluster. Resilience is defined by **[storage policies](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-administration/GUID-C8E919D7-54A8-4595-B3F7-D25719F27286.html){target="_blank"}** with two key settings:

**Failures To Tolerate (FTT)**: how many host failures a given object can survive.

| FTT | Meaning |
|-----|---------|
| FTT=0 | No redundancy. One failure = data unavailable. |
| FTT=1 | Tolerates 1 host failure. |
| FTT=2 | Tolerates 2 host failures. |
| FTT=3 | Tolerates 3 host failures (mirroring only, rarely used). |

**Data placement scheme**: how the redundancy is implemented.

| Scheme | How it works | Space overhead | Min hosts |
|--------|-------------|----------------|-----------|
| RAID-1 (mirroring) | Full copy on another host | 2x (FTT=1), 3x (FTT=2) | 3 (FTT=1), 5 (FTT=2) |
| RAID-5 ([erasure coding](https://en.wikipedia.org/wiki/Erasure_code){target="_blank"}) | Stripe with single parity | 1.33x | 4 |
| RAID-6 ([erasure coding](https://en.wikipedia.org/wiki/Erasure_code){target="_blank"}) | Stripe with double parity | 1.5x | 6 |

vSAN's placement engine ([CLOM](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-planning/GUID-43FDF3EC-B11D-4063-A31D-91FF1FF824B0.html){target="_blank"}) automatically distributes components across hosts, respecting anti-affinity rules so no two components of the same object land on the same host. A [quorum](https://en.wikipedia.org/wiki/Quorum_(distributed_computing)){target="_blank"} vote of components determines availability: more than 50% must be accessible.

**[Fault domains](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-planning/GUID-FE7DBC6F-C204-4137-827F-7E04FE88D968.html){target="_blank"}** define the failure boundary. By default, each host is its own fault domain. You can group hosts into rack-level or site-level fault domains to survive broader failures.

The recommended configuration for vSAN ESA clusters with 6+ hosts is **FTT=2 using RAID-6**: tolerates 2 host failures at 1.5x space overhead, with 7 hosts recommended (6 minimum + 1 for automatic rebuild).

## Longhorn availability in 60 seconds

[Longhorn](https://longhorn.io/){target="_blank"} is a distributed block storage system built for Kubernetes. Each volume gets a dedicated **[engine](https://longhorn.io/docs/archives/1.11.1/concepts/#11-the-longhorn-manager-and-the-longhorn-engine){target="_blank"}** (storage controller) and a configurable number of **[replicas](https://longhorn.io/docs/archives/1.11.1/concepts/#23-replicas){target="_blank"}** spread across cluster nodes.

The resilience model is straightforward:

> **N replicas can tolerate N-1 failures.** At least one healthy replica must remain for the volume to stay operational.

| Replicas | Failures tolerated | Space overhead |
|----------|--------------------|----------------|
| 1 | 0 | 1x |
| 2 | 1 | 2x |
| 3 | 2 | 3x |

There is no erasure coding. Every replica is a full mirror. This is simpler to reason about, simpler to rebuild, but costs more raw storage.

Resilience settings are declared in **[Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/){target="_blank"}** and applied per-volume at creation time. The [Longhorn scheduler](https://longhorn.io/docs/archives/1.11.2/nodes-and-volumes/nodes/scheduling/){target="_blank"} places replicas using a priority hierarchy:

1. **New node in a new zone** (most preferred)
2. **New node in an existing zone**
3. **Existing node in an existing zone** (least preferred, requires soft anti-affinity)

Anti-affinity is configurable at three levels: **node**, **zone**, and **disk**, each independently set to hard or soft per [StorageClass](https://longhorn.io/docs/archives/1.11.2/references/storage-class-parameters/){target="_blank"}.

## The translation table

This is the core of the article. Every vSAN concept mapped to Longhorn.

### Resilience policies

| vSAN | Longhorn 1.11.x | Notes |
|------|-----------------|-------|
| Storage Policy | `StorageClass` | Both are immutable per-object/volume after creation. |
| FTT=1 RAID-1 (2x, 3 hosts) | `numberOfReplicas: "2"` (2x, 2 nodes) | Identical space overhead. |
| FTT=1 RAID-5 (1.33x, 4 hosts) | No equivalent | Closest is 2 replicas at 2x. |
| FTT=2 RAID-1 (3x, 5 hosts) | `numberOfReplicas: "3"` (3x, 3 nodes) | Identical space overhead. |
| FTT=2 RAID-6 (1.5x, 6 hosts) | `numberOfReplicas: "3"` (3x, 3 nodes) | Same fault tolerance, **2x the storage cost**. |

The space efficiency gap is real: for 1 TB of usable data tolerating 2 failures, vSAN RAID-6 needs 1.5 TB raw, Longhorn needs 3 TB. That is the price of simplicity.

<!-- TODO: Insert diagram 1 — replica-placement-comparison.png -->
<!-- Left: vSAN FTT=2 RAID-6 across 6 nodes (4 data + 2 parity blocks, 7th node as rebuild target, "1.5x overhead") -->
<!-- Right: Longhorn 3 replicas on 3 of 6 nodes (full copies, "3x overhead") -->
![Replica placement comparison between vSAN RAID-6 and Longhorn 3 replicas](../../assets/images/vsan-ftt-longhorn/replica-placement-comparison.png)

### Fault domains and placement

| vSAN | Longhorn 1.11.x | Notes |
|------|-----------------|-------|
| Fault domain (host) | Node anti-affinity (`replicaSoftAntiAffinity`) | Default: soft. Set to `"disabled"` for hard anti-affinity. |
| Fault domain (rack) | Zone anti-affinity (`replicaZoneSoftAntiAffinity` + `topology.kubernetes.io/zone` labels) | Requires labeling nodes with zone topology. |
| Fault domain (site/stretched cluster) | `allowedTopologies` + `strictTopology` in StorageClass | Not a direct equivalent. No synchronous site-level replication built in. |
| CLOM (auto placement) | Longhorn scheduler with balance score | Balance formula: `(max - min) / mean` across usable storage. |
| Auto-Policy Management | No equivalent | You choose the StorageClass manually (or via policy engines like Kyverno/OPA). |
| Witness component | No equivalent | Longhorn uses the engine as tiebreaker. Quorum is implicit: N replicas, need at least 1 healthy. |

### Failure handling

| vSAN | Longhorn 1.11.x | Notes |
|------|-----------------|-------|
| Component state: Active | Replica healthy | Normal operation. |
| Component state: Absent (60 min rebuild timer) | Replica marked unhealthy → `staleReplicaTimeout` (default: 30 min) → auto-rebuild | Longhorn rebuilds faster by default. Longhorn also auto-creates a system snapshot before rebuilding. |
| Component state: Degraded (device PDL) | Replica failed → immediate rebuild | Same concept: known failure triggers immediate action. |
| Durability components | No equivalent | vSAN ESA creates temporary components during maintenance to capture delta writes. Longhorn relies on replica count alone. |
| Resynchronization / rebuild | Replica rebuilding | Both copy data to a new location. Longhorn always does full mirror copy (no parity recalculation). |
| Partial repairs | No equivalent | vSAN can do best-effort partial repair. Longhorn rebuilds the entire replica. |

### Operations

| vSAN | Longhorn 1.11.x | Notes |
|------|-----------------|-------|
| Maintenance mode: Full data migration | Disable node scheduling + Eviction Requested = true | All replicas evacuated before maintenance. |
| Maintenance mode: Ensure accessibility | `kubectl drain` (replicas remain, volume stays accessible) | Set Node Drain Policy to `allow-if-replica-is-stopped` before K8s upgrades. |
| Maintenance mode: No data migration | `kubectl cordon` / Disable node scheduling | Node isolated, no data movement. |
| Rebalancing after node add | [`replicaAutoBalance: "best-effort"`](https://longhorn.io/docs/archives/1.11.2/high-availability/auto-balance-replicas/){target="_blank"} | Longhorn redistributes replicas to new nodes. Only for healthy volumes. |
| Degraded Device Handling (DDH) | No direct equivalent | Longhorn relies on kernel-level device health and Kubernetes node conditions. |
| Network partitioning (CMMDS) | Kubernetes node heartbeat + Longhorn engine failover | Both detect unreachable hosts. Longhorn defers to Kubernetes for node status. |
| vSphere HA integration | Kubernetes pod scheduling + Pod Deletion Policy | Configure `Pod Deletion Policy When Node is Down` to `delete-both-statefulset-and-deployment-pod` for automatic recovery. Without it, StatefulSet pods get stuck in `Terminating`. |

### Architecture

| vSAN | Longhorn 1.11.x | Notes |
|------|-----------------|-------|
| vSAN ESA (single-tier, per-device failure) | Per-volume engine inside Instance Manager | Both minimize blast radius. Each volume gets its own engine process. The Instance Manager pod (one per node) hosts all engine/replica processes for that node. |
| vSAN OSA disk group (multi-device failure) | No equivalent | Longhorn has no disk group concept. Each disk is independent. |
| Objects and components | Volumes and replicas | vSAN objects can be 62 TB. Longhorn volumes are thin-provisioned, no hard cap. |
| Data engine: iSCSI (V1) / SPDK/NVMe (V2) | Same | Longhorn V1 uses iSCSI, V2 uses SPDK. Direct parallel. |

## What Longhorn does not have

Be honest about the gaps:

- **No [erasure coding](https://en.wikipedia.org/wiki/Erasure_code){target="_blank"}.** This is the biggest one. 3 replicas for 2 failure tolerance costs 3x storage instead of 1.5x with [RAID-6](https://en.wikipedia.org/wiki/Standard_RAID_levels#RAID_6){target="_blank"}. For large datasets, this adds up fast.
- **No [stretched clusters](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-stretched-clusters/GUID-1153D0CE-BA79-4B93-A03A-15BF3BF5E86B.html){target="_blank"}.** vSAN can synchronously replicate across two sites with a witness. Longhorn offers [DR volumes](https://longhorn.io/docs/archives/1.11.1/concepts/#33-disaster-recovery-volumes){target="_blank"} (async replication to a backup target), but no native synchronous site-level replication.
- **No adaptive RAID.** vSAN ESA adjusts its RAID-5 stripe width based on cluster size (3-host vs 5-host stripe). Longhorn replica count is static per StorageClass.
- **No durability components.** During multiple overlapping failures, vSAN ESA captures delta writes in temporary components. Longhorn has no equivalent mechanism.
- **No quorum voting with witness components.** vSAN uses a sophisticated vote count for availability determination. Longhorn's model is simpler: at least 1 healthy replica = available.

## What Longhorn does better

- **Per-volume blast radius.** Each volume has its own engine process. A crash affects exactly one volume. vSAN ESA reduced the blast radius to per-device, but Longhorn goes to per-volume.
- **Kubernetes-native lifecycle.** StorageClasses are YAML. Version them in Git, deploy them with [Helm](https://helm.sh/){target="_blank"} or [ArgoCD](https://argoproj.github.io/cd/){target="_blank"}, enforce them with [OPA](https://www.openpolicyagent.org/){target="_blank"}/[Kyverno](https://kyverno.io/){target="_blank"}. No vCenter, no [SPBM](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-administration/GUID-C8E919D7-54A8-4595-B3F7-D25719F27286.html){target="_blank"}.
- **[Data locality](https://longhorn.io/docs/archives/1.11.2/high-availability/data-locality/){target="_blank"}.** `dataLocality: "best-effort"` keeps one replica on the same node as the workload, reducing network I/O. `strict-local` goes further: single replica, co-located, maximum IOPS. vSAN has no equivalent.
- **Granular per-volume policies.** Different StorageClasses for different workloads in the same cluster is trivial. vSAN supports this too, but Longhorn makes it a natural part of the Kubernetes workflow.
- **Rolling upgrades.** Longhorn can upgrade volume engines one at a time with zero downtime. Each engine is independent.
- **[Topology-aware provisioning](https://longhorn.io/docs/archives/1.11.2/nodes-and-volumes/nodes/topology-aware-provisioning/){target="_blank"}.** `allowedTopologies` + `strictTopology` + `WaitForFirstConsumer` gives fine-grained control over where volumes land relative to their pods. Zone pinning is declarative.

## StorageClass examples

Here are four production-ready StorageClasses that map to common vSAN deployment patterns.

### Standard production (FTT=1 equivalent)

Tolerates 1 node failure. Good for most workloads.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-production
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  numberOfReplicas: "2"
  staleReplicaTimeout: "30"
  dataLocality: "best-effort"
  replicaAutoBalance: "best-effort"
  replicaSoftAntiAffinity: "false"      # hard node anti-affinity
  replicaZoneSoftAntiAffinity: "true"   # soft zone anti-affinity (prefer spread)
  fsType: "ext4"
```

**vSAN equivalent:** FTT=1 RAID-1 on a 4-host cluster with per-host fault domains.
**Space overhead:** 2x (same as vSAN RAID-1). For a 100 GiB volume, Longhorn uses 200 GiB raw.

### Critical workloads (FTT=2 equivalent)

Tolerates 2 node failures. For databases, stateful services, anything that cannot go down.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-critical
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  dataLocality: "best-effort"
  replicaAutoBalance: "best-effort"
  replicaSoftAntiAffinity: "false"      # hard node anti-affinity
  replicaZoneSoftAntiAffinity: "false"  # hard zone anti-affinity
  replicaDiskSoftAntiAffinity: "false"  # hard disk anti-affinity
  fsType: "ext4"
  recurringJobSelector: '[{"name":"backup-daily", "isGroup":true}]'
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.kubernetes.io/zone
        values:
          - zone-a
          - zone-b
          - zone-c
```

**vSAN equivalent:** FTT=2 RAID-6 on a 7-host cluster with rack-level fault domains.
**Space overhead:** 3x (vs 1.5x for vSAN RAID-6). This is where you pay the erasure coding premium. For a 100 GiB volume, Longhorn uses 300 GiB raw, vSAN RAID-6 would use 150 GiB.

!!! warning "The space efficiency gap"
    Longhorn's 3 replicas cost 2x more raw storage than vSAN RAID-6 for the same fault tolerance (2 failures). For large datasets, this is significant. Plan your capacity accordingly, or consider `numberOfReplicas: "2"` if tolerating 1 failure is acceptable.

### Performance-optimized (data locality)

For latency-sensitive workloads where the application handles its own replication (distributed databases like [CockroachDB](https://www.cockroachlabs.com/){target="_blank"}, [TiDB](https://www.pingcap.com/tidb/){target="_blank"}, Cassandra).

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-local-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  numberOfReplicas: "1"
  dataLocality: "strict-local"
  fsType: "ext4"
```

**vSAN equivalent:** FTT=0 (no infrastructure-level redundancy). The application provides HA.
**Space overhead:** 1x. No replication overhead. Maximum IOPS, minimum latency.

This is actually better than anything vSAN offers for this use case, because vSAN always applies its policy at the infrastructure level. There is no "let the application handle it" mode. Longhorn's `strict-local` with 1 replica gives you raw local disk performance with Kubernetes-native lifecycle management.

### Dev/Test (minimal resources)

No redundancy needed. Fast provisioning, minimal footprint.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-dev
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "1"
  dataLocality: "disabled"
  replicaSoftAntiAffinity: "true"
  fsType: "ext4"
```

**vSAN equivalent:** FTT=0 with no constraints. Minimum resources for non-critical workloads.

## Space efficiency: the honest math

For 1 TB of usable data with tolerance for 2 simultaneous failures:

| Solution | Raw storage needed | Overhead |
|----------|-------------------|----------|
| vSAN FTT=2 RAID-6 | 1.5 TB | 1.5x |
| vSAN FTT=2 RAID-1 | 3 TB | 3x |
| Longhorn 3 replicas | 3 TB | 3x |

Longhorn matches vSAN RAID-1 mirroring. It cannot match vSAN RAID-6 efficiency. For a 10 TB database tolerating 2 failures, you need 15 TB raw with vSAN RAID-6 or 30 TB raw with Longhorn. That is a real cost difference.

For 1 failure tolerance:

| Solution | Raw storage needed | Overhead |
|----------|-------------------|----------|
| vSAN FTT=1 RAID-5 | 1.33 TB | 1.33x |
| vSAN FTT=1 RAID-1 | 2 TB | 2x |
| Longhorn 2 replicas | 2 TB | 2x |

At FTT=1, Longhorn matches vSAN mirroring and costs about 50% more than vSAN erasure coding. The gap narrows when you consider that Longhorn thin-provisions by default, so actual disk usage depends on how much data the volume actually contains.

## Failure scenarios side by side

### Scenario 1: single node failure, 4-node cluster

**vSAN (FTT=1 RAID-5, 4 hosts):**
Object remains available. After 60 minutes, vSAN rebuilds the missing component on the 4th host. Full resilience restored automatically.

**Longhorn (2 replicas, 4 nodes):**
Volume remains available from the surviving replica. Longhorn automatically takes a system snapshot, then the Instance Manager initiates a rebuild on an available node. The stale replica is cleaned up after 30 minutes (default). Full resilience restored automatically.

**Verdict:** Nearly identical behavior. Longhorn defaults to faster rebuild (30 min vs 60 min).

### Scenario 2: two node failures, 7-node cluster

**vSAN (FTT=2 RAID-6, 7 hosts):**
Object available but degraded (FTT=0). Cannot rebuild because no unused fault domain remains. A third failure on any of the 4 remaining hosts holding the object makes it unavailable.

**Longhorn (3 replicas, 7 nodes):**
Volume available from the 1 surviving replica (FTT=0). Longhorn rebuilds 2 new replicas on 2 of the 4 remaining nodes. Full resilience restored, assuming the cluster has capacity.

**Verdict:** Longhorn has an advantage here. Because it only needs nodes (not specific fault domain slots), it can rebuild more aggressively. vSAN's 6-host stripe requires specific placement constraints.

### Scenario 3: node goes into maintenance

**vSAN (Ensure Accessibility mode):**
Minimal data movement. Components on the maintenance node become temporarily unavailable. Object stays accessible from remaining components. When the node returns, vSAN resyncs the delta.

**Longhorn (`kubectl drain`):**
Pods are evicted. Volume detaches, reattaches on a new node. If replica was on the drained node, it becomes stale but the volume continues from other replicas. When the node returns, the replica can be rebuilt or reused.

## Disaster recovery: vSAN stretched clusters vs Longhorn DR volumes

This deserves its own section because the gap is significant and the architectures are fundamentally different.

### vSAN: synchronous, active-active

vSAN [stretched clusters](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-stretched-clusters/GUID-1153D0CE-BA79-4B93-A03A-15BF3BF5E86B.html){target="_blank"} replicate data **synchronously** across two sites with a witness host at a third location. Both sites are active: VMs can run on either site, and a full site failure is transparent to the workload. Write latency increases (every write must commit to both sites), but RPO is zero: no data loss on site failure.

Key characteristics:

- **RPO = 0** (synchronous replication, zero data loss)
- **RTO = minutes** (vSphere HA restarts VMs on the surviving site)
- **Requires**: 3 sites (2 data + 1 witness), low-latency inter-site links (< 5ms RTT recommended)
- **Active-active**: workloads run on both sites simultaneously
- **Automatic failover**: no manual intervention required

### Longhorn: asynchronous, standby

Longhorn [DR volumes](https://longhorn.io/docs/archives/1.11.2/snapshots-and-backups/setup-disaster-recovery-volumes/){target="_blank"} use a different model. A standby volume on a secondary cluster pulls incremental backups from a shared backup target (S3 or NFS). The DR volume stays in read-only standby mode until manually activated during a failover.

Key characteristics:

- **RPO = last backup interval** (async replication, potential data loss = time since last backup)
- **RTO = manual activation time** (operator must activate the DR volume + redeploy workloads)
- **Requires**: 2 Kubernetes clusters + shared backup target (S3/NFS)
- **Active-passive**: DR volume is standby-only, not serving workloads
- **Manual failover**: operator activates the DR volume, converting it to a normal writable volume

<!-- TODO: Insert diagram 3 — dr-architecture-comparison.png -->
<!-- Top: vSAN stretched — Site A ↔ sync ↔ Site B, Witness at Site C, VMs on both, "RPO=0" -->
<!-- Bottom: Longhorn DR — Cluster A → backups → S3/NFS ← DR volume polls ← Cluster B (standby), "RPO=backup interval" -->
![DR architecture comparison between vSAN stretched clusters and Longhorn DR volumes](../../assets/images/vsan-ftt-longhorn/dr-architecture-comparison.png)

### Side by side

| | vSAN Stretched Cluster | Longhorn DR Volume |
|---|---|---|
| Replication | Synchronous (every write) | Asynchronous (backup intervals) |
| RPO | 0 (zero data loss) | Minutes to hours (depends on backup frequency) |
| RTO | Minutes (automatic HA restart) | Manual (activate DR volume + redeploy) |
| Failover | Automatic | Manual |
| Sites required | 3 (2 data + 1 witness) | 2 clusters + shared backup store |
| Inter-site latency | < 5ms RTT required | No constraint (async) |
| Cost | High (duplicate infrastructure + witness + low-latency links) | Lower (backup storage + second cluster, can be smaller) |
| Workload during normal ops | Active-active (both sites) | Active-passive (primary only) |

### The honest take

vSAN stretched clusters are a different class of solution. Zero RPO with automatic failover is something Longhorn simply does not offer today. If your requirement is "survive a full datacenter failure with zero data loss and no manual intervention," vSAN stretched clusters (or similar synchronous replication solutions) are the answer.

Longhorn DR volumes are closer to traditional backup-based DR: they protect against site loss, but you accept some data loss (bounded by your backup frequency) and a manual activation step. For many workloads, especially cloud-native applications designed for eventual consistency, this is perfectly acceptable and significantly cheaper to operate.

!!! tip "Closing the gap"
    If you need tighter RPO with Longhorn, increase backup frequency (every 5-10 minutes) and pair it with application-level replication. A distributed database like CockroachDB with 3 replicas across 2 sites + Longhorn local storage gives you near-zero RPO at the application layer without needing synchronous storage replication.

## Migration checklist

Moving from vSAN to Longhorn? Here is what to plan for:

- [ ] **Map your storage policies to StorageClasses.** Use the translation table above. Start with `longhorn-production` (2 replicas) for most workloads.
- [ ] **Label your nodes with topology.** Apply `topology.kubernetes.io/zone` labels to match your rack or zone layout. This replaces vSAN fault domains.
- [ ] **Set `csi-allowed-topology-keys`** in Longhorn settings if you need zone-aware placement.
- [ ] **Budget for storage overhead.** If you were on RAID-5/6, expect 50 to 100% more raw storage for the same usable capacity.
- [ ] **Enable [`replicaAutoBalance: best-effort`](https://longhorn.io/docs/archives/1.11.2/high-availability/auto-balance-replicas/){target="_blank"}** globally or per StorageClass to handle node additions gracefully.
- [ ] **Configure [backup targets](https://longhorn.io/docs/archives/1.11.1/snapshots-and-backups/backup-and-restore/set-backup-target/){target="_blank"}.** Longhorn's S3/NFS backup replaces vSAN Data Protection snapshots. Set up [recurring backup jobs](https://longhorn.io/docs/archives/1.11.1/snapshots-and-backups/scheduling-backups-and-snapshots/){target="_blank"}.
- [ ] **Configure Pod Deletion Policy.** Set `Pod Deletion Policy When Node is Down` to `delete-both-statefulset-and-deployment-pod`. Without this, StatefulSet pods get stuck in `Terminating` on failed nodes.
- [ ] **Enable auto-recovery for RWO volumes.** Set `Automatically Delete Workload Pod when RWO Volume Detaches Unexpectedly` to true. This handles Kubernetes upgrade and container runtime restart scenarios.
- [ ] **Set Node Drain Policy for upgrades.** Before Kubernetes upgrades, set Node Drain Policy to `allow-if-replica-is-stopped` to allow safe node draining.
- [ ] **Test node failure recovery.** Drain a node, observe Longhorn behavior, validate your `staleReplicaTimeout` and anti-affinity settings.
- [ ] **Consider [data locality](https://longhorn.io/docs/archives/1.11.2/high-availability/data-locality/){target="_blank"}** for latency-sensitive workloads. This is a Longhorn feature with no vSAN equivalent.

## Conclusion

vSAN and Longhorn are different implementations of the same principle: distribute copies of data across failure domains so hardware failures do not cause data loss.

vSAN wins on space efficiency thanks to erasure coding. Longhorn wins on Kubernetes integration, per-volume isolation, and operational simplicity.

If you understood vSAN storage policies, you already understand Longhorn StorageClasses. The vocabulary changed, the RAID math changed, the underlying goal did not.

## References

**vSAN:**

- [vSAN Availability Technologies (VCF 9.0)](https://www.vmware.com/docs/vmw-vSAN-Availability-Technologies){target="_blank"} — the whitepaper this article cross-references
- [vSAN Planning and Design Guide](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-planning/GUID-18F531E9-FF08-49F5-9879-8E46583D4C70.html){target="_blank"}
- [vSAN Storage Policies](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-administration/GUID-C8E919D7-54A8-4595-B3F7-D25719F27286.html){target="_blank"}
- [vSAN Fault Domains](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-planning/GUID-FE7DBC6F-C204-4137-827F-7E04FE88D968.html){target="_blank"}
- [vSAN Stretched Cluster Guide](https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-stretched-clusters/GUID-1153D0CE-BA79-4B93-A03A-15BF3BF5E86B.html){target="_blank"}

**Longhorn:**

- [Longhorn Documentation](https://longhorn.io/docs/){target="_blank"}
- [Longhorn Concepts and Architecture](https://longhorn.io/docs/archives/1.11.1/concepts/){target="_blank"}
- [StorageClass Parameters Reference](https://longhorn.io/docs/archives/1.11.2/references/storage-class-parameters/){target="_blank"}
- [Replica Scheduling](https://longhorn.io/docs/archives/1.11.2/nodes-and-volumes/nodes/scheduling/){target="_blank"}
- [Auto Balance Replicas](https://longhorn.io/docs/archives/1.11.2/high-availability/auto-balance-replicas/){target="_blank"}
- [Data Locality](https://longhorn.io/docs/archives/1.11.2/high-availability/data-locality/){target="_blank"}
- [Topology-Aware Provisioning](https://longhorn.io/docs/archives/1.11.2/nodes-and-volumes/nodes/topology-aware-provisioning/){target="_blank"}
- [Node Failure Handling](https://longhorn.io/docs/archives/1.11.1/high-availability/node-failure/){target="_blank"}
- [Best Practices](https://longhorn.io/docs/archives/1.11.2/best-practices/){target="_blank"}
- [Longhorn GitHub Repository](https://github.com/longhorn/longhorn){target="_blank"}

**General:**

- [Erasure Coding (Wikipedia)](https://en.wikipedia.org/wiki/Erasure_code){target="_blank"}
- [RAID Levels (Wikipedia)](https://en.wikipedia.org/wiki/Standard_RAID_levels){target="_blank"}
- [Kubernetes Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/){target="_blank"}
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/){target="_blank"}

---

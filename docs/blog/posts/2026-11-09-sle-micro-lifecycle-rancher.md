---
date: 2026-11-09
draft: true
authors:
  - coulof
categories:
  - Kubernetes
  - SUSE
  - Linux
title: "Patching and Upgrading SLE Micro from Rancher"
description: "Two OS lifecycles for SUSE Linux Micro nodes under K3s : weekly in-place patches with Fleet and the System Upgrade Controller, and distribution bumps by replacing nodes from a Rancher machine pool."
---

# Patching and Upgrading SLE Micro from Rancher

When you upgrade OpenShift :simple-redhat:, the operating system comes along. CoreOS and the cluster move together, node by node.

The Rancher ecosystem, including [K3s](https://docs.k3s.io/){target="_blank"} :material-open-in-new: and [RKE2](https://docs.rke2.io/){target="_blank"} :material-open-in-new:, leaves the choice and management of the OS completely open.

My recommendation is to use an immutable distribution. In my customer projects, that is most of the time [SLE Micro](https://documentation.suse.com/sle-micro/){target="_blank"} :simple-suse:.

The lifecycle is therefore split in two : Kubernetes upgrades on one side, OS upgrades underneath on the other. Rancher gives all the tools to manage both from a single stack.

I drive SLE Micro's lifecycle from Rancher, the same way we drive Kubernetes. Everything runs on a live cluster while an application keeps answering, and each part comes with a short clip.

<video autoplay loop muted playsinline preload="auto" width="100%" aria-label="SLE Micro lifecycle with Rancher, intro animation">
  <source src="../../assets/images/suc-sle-micro/sl-micro-intro-1080p.mp4" type="video/mp4">
  <source src="../../assets/images/suc-sle-micro/sl-micro-intro-1080p.webm" type="video/webm">
</video>

<!-- more -->

## Two kinds of OS change

* **The weekly patch.** We stay on the same VM. `transactional-update` builds a new btrfs snapshot in the background. The node is drained, reboots into the snapshot, and comes back. If anything goes wrong, we boot the previous snapshot.
* **The distribution bump**, twice a year, for example SLE Micro 6.1 to 6.2. Here SUSE recommends a fresh install. On SUSE Virtualization (Harvester), a fresh install is cheap : point the machine pool at the new image and let Rancher replace the nodes.

Both end with every node on the same version, and both start from Rancher.

|  | Weekly patch | Distribution bump |
|---|---|---|
| Trigger | Git commit (Plan version) | Machine pool image (UI or Terraform) |
| Mechanism | `transactional-update`, btrfs snapshot | New VM from the new image |
| Node | Same VM, drain, reboot, uncordon | New VM joins, old VM removed |
| Rollback | Boot the previous snapshot | Pool back to the previous image |

The demo cluster has three SLE Micro 6.1 nodes on SUSE Virtualization, running K3s and managed by Rancher. Each node holds every role (control plane, etcd, worker), so they upgrade strictly one at a time. A small heartbeat page queries the cluster every second through a single floating IP and shows which pod and node answered.

## The weekly patch : Fleet and the System Upgrade Controller

### Stop nodes from patching themselves

By default, SLE Micro patches and reboots itself on a timer. On a cluster node, that reboot happens without a drain. The machine pool's cloud-init registers the node with SCC, then turns self-patching off, so the cluster is the only owner of the OS lifecycle :

```yaml
#cloud-config
runcmd:
  - transactional-update --non-interactive register -r "<REGISTRATION_CODE>" -e "<EMAIL>"   # inject from a secret-backed template, never commit it
  - systemctl disable --now transactional-update.timer || true
  - systemctl disable --now rebootmgr.service || true
  - systemctl enable health-checker.service || true
```

### Three ordered Plans

The [System Upgrade Controller](https://github.com/rancher/system-upgrade-controller){target="_blank"} :simple-github: (SUC) ships with Rancher-provisioned clusters. It runs `Plan` objects : cordon, drain, run a job on the node, uncordon.

I use three Plans, applied in order : etcd nodes, then control plane, then workers. Their node selectors don't overlap, so each node belongs to exactly one Plan. Here is the etcd one, trimmed :

```yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: os-patch-etcd
spec:
  version: "0000.00-0"          # set by the overlay, bump it = new rollout
  concurrency: 1
  nodeSelector:
    matchExpressions:
      - {key: node-role.kubernetes.io/etcd, operator: In, values: ["true"]}
  cordon: true
  drain:
    force: true
    ignoreDaemonSets: true
    deleteEmptydirData: true
    timeout: 900s
  upgrade:
    image: registry.suse.com/bci/bci-micro:15.7
    command: ["/bin/sh", "-c"]
    args:
      - exec chroot /host /bin/sh /var/lib/os-upgrade/bin/upgrade.sh
```

Why these settings :

* `concurrency: 1` on etcd and control plane nodes keeps quorum : only one member is down at a time. Workers go two by two.
* `tolerations: Exists` lets the job run on control plane nodes despite their taints.
* `drain.force` and `deleteEmptydirData` avoid a drain stuck on a bare pod or an `emptyDir`. The 15-minute timeout leaves room for PodDisruptionBudgets.

In the demo, all three nodes run etcd, so only `os-patch-etcd` matches anything. The other two Plans select zero nodes and pass through.

### Ordering Plans with a label

SUC can't run one Plan after another. When a node finishes a Plan, SUC labels it `plan.upgrade.cattle.io/<plan>=<hash>`, where the hash is the Plan's `status.latestHash`. I use that label to order the Plans.

The `prepare` step of `os-patch-cp` and `os-patch-workers` runs `wait-plan.sh`. It counts the nodes of the previous group, counts those carrying the current hash label, and loops until both numbers match :

```sh
hash=$(kubectl -n "$NS" get plan "$PLAN" -o jsonpath='{.status.latestHash}')
total=$(kubectl get nodes -l "$SELECTOR" -o name | wc -l)
done_=$(kubectl get nodes -l "$SELECTOR,plan.upgrade.cattle.io/$PLAN=$hash" -o name | wc -l)
[ "$done_" -ge "$total" ] && exit 0
```

`prepare` runs before cordon and drain, so a waiting node keeps serving. The Plan passes its arguments, for example `os-patch-etcd node-role.kubernetes.io/etcd=true`. The `kubectl` image has no `awk` or `grep`, hence `wc -l` on names.

### Scripts without a custom image

I didn't want to build and maintain an image for three shell scripts. The scripts live as plain files in Git, and kustomize generates the `os-scripts` ConfigMap from them.

A Plan can't mount a ConfigMap though. So kustomize `replacements` copy each script body into an env value of the Plan :

```yaml
configMapGenerator:
  - name: os-scripts
    files: [scripts/upgrade.sh, scripts/wait-plan.sh, scripts/inventory.sh]
replacements:
  - source: {kind: ConfigMap, name: os-scripts, fieldPath: data.upgrade\.sh}
    targets:
      - select: {kind: Plan}
        fieldPaths: [spec.upgrade.envs.[name=UPGRADE_SCRIPT].value]
```

!!! note "Pulling from the SUSE Application Collection"
    The `prepare` step and the inventory DaemonSet use the `kubectl` image from the [SUSE Application Collection](https://apps.rancher.io/){target="_blank"} :simple-suse: (`dp.apps.rancher.io/containers/kubectl:1.37.2`). That registry needs credentials : I created the K3s cluster with a Docker registry secret, `dp-apps-rancher-io`, which both ServiceAccounts reference in `imagePullSecrets`. Keep that secret out of Git.

The upgrade container is a stock `bci-micro:15.7`. It only needs `sh`, `mkdir` and `chroot` : it writes `$UPGRADE_SCRIPT` to `/host/var/lib/os-upgrade/bin/upgrade.sh`, then `chroot /host` runs it with the node's own tools (`transactional-update`, `btrfs`, `SUSEConnect`).

Because the script text is part of the Plan spec, editing a script changes the Plan hash. SUC then cordons and drains every node again, even with the same release ID. `upgrade.sh` finds its state file and only verifies, but you still pay a drain per node.

### One line to start a rollout

Fleet delivers the Plans from Rancher to downstream clusters. A Rancher cluster label, `os-lifecycle/wave=canary` or `prod`, picks the overlay. Each overlay only sets `spec.version`, the release ID.

Starting the weekly patch is a one-line Git commit :

```diff
       - op: replace
         path: /spec/version
-        value: "2026.45-1"
+        value: "2026.45-2"
```

Canary clusters get it first. When they converge, I set the same value in the prod overlay.

### What runs on the node

SUC passes the Plan's `spec.version` to the job as `SYSTEM_UPGRADE_PLAN_LATEST_VERSION`, and `upgrade.sh` uses it as the release ID. The script must be idempotent, because SUC re-runs the job after every reboot and on every retry.

On a new release, it goes through four steps :

1. **Preflight** : the node must be registered with SCC and have at least 3 GiB free on btrfs. Otherwise it fails before touching anything.
2. **Apply** : `transactional-update --non-interactive up` writes a new snapshot and sets it as the default for the next boot. It doesn't touch the running system. With `MODE=patch`, it only installs security patches.
3. **Record** : the script saves `<release> <snapshot id>` in `/var/lib/os-upgrade/state`. If no new snapshot was created, there was nothing to install : it verifies and exits 0, without a reboot.
4. **Reboot** : it schedules the reboot 10 seconds later with `systemd-run`, then sleeps. The reboot kills the pod, the job counts as failed, and Kubernetes retries it once the node is back.

On the second run, the script compares three btrfs subvolume IDs : the booted one, the default one, and the one it recorded.

```sh
read -r st_rel st_snap < "$STATE"
if [ "$st_rel" = "$RELEASE" ]; then
  if [ "$cur" = "$st_snap" ]; then
    verify && { log "release $RELEASE active"; exit 0; }
    exit 1
  fi
  if [ "$def" = "$st_snap" ]; then
    reboot_host                                   # applied, not yet booted
  fi
  log "ERROR: booted $cur, expected $st_snap (rolled back by health-checker?). Node stays cordoned."
  exit 1
fi
```

* **Booted the recorded snapshot** : `verify` waits for the `k3s` (or `rke2`) service and checks `health-checker`. Exit 0, SUC uncordons the node and moves on.
* **Recorded snapshot is the default but not booted** : the reboot didn't happen yet, so it reboots again.
* **Neither** : `health-checker` rolled the node back to its previous snapshot. The job fails, the node stays cordoned on the old snapshot, and the rollout stops there. With `concurrency: 1`, the other nodes are untouched.

The weekly patch on the demo cluster, 15 minutes squeezed into one (waiting phases at ×50) :

<video controls muted playsinline preload="metadata" width="100%" aria-label="Weekly patch of SLE Micro from Rancher, time-lapse">
  <source src="../../assets/images/suc-sle-micro/sle-micro-patch-1080p.mp4" type="video/mp4">
</video>

In the clip, each node goes `Ready,Cordoned`, then comes back with a new kernel (`6.12.0-160000.5` to `.40`) and a new boot ID. Right after the reboot, the Plan shows `FAILED` for a few seconds : that is the job killed by the reboot, before SUC retries it and the verify step passes.

The heartbeat page stays green, and answers come from the other two nodes. Over the 15 minutes, 5 requests timed out, each when a node was drained or rebooted. The service kept answering.

### Seeing drift : the os-inventory DaemonSet

SUC labels record which Plan ran on a node, and nothing about its packages. Someone can still run `transactional-update` by hand, or a node can come back from a rollback.

The `os-inventory` DaemonSet reads the host directly. It mounts `/` read-only, and runs as root with `SYS_CHROOT` only, so it can call the node's own `rpm`. Every 10 minutes, it labels its node :

```sh
ver=$(. /host/etc/os-release && echo "${VERSION_ID:-unknown}")
fp=$(chroot /host rpm -qa --qf '%{NAME}-%{VERSION}-%{RELEASE}.%{ARCH}\n' | sort | sha256sum | cut -c1-16)
[ -f /host/var/lib/os-upgrade/state ] && read -r rel _ < /host/var/lib/os-upgrade/state

kubectl label node "$NODE_NAME" --overwrite \
  "$PREFIX/os-version=$ver" "$PREFIX/rpm-fp=$fp" "$PREFIX/os-release=$rel"
```

* `os-version` : `VERSION_ID` from `/etc/os-release`, for example `6.1`.
* `rpm-fp` : the first 16 characters of a SHA-256 over the sorted package list. Two nodes with the same fingerprint run the same packages.
* `os-release` : the last release ID `upgrade.sh` recorded, or `none`.

One command then shows the whole cluster :

```bash
kubectl get nodes -L os-lifecycle/os-version,os-lifecycle/rpm-fp,os-lifecycle/os-release
```

## The distribution bump : replace the nodes

For SLE Micro 6.1 to 6.2, I don't migrate in place. In Rancher, under **Cluster Management**, I edit the [machine pool](https://docs.harvesterhci.io/v1.9/rancher/node/k3s-cluster#create-k3s-kubernetes-cluster){target="_blank"} :simple-suse:, switch the image to the SLE Micro 6.2 one, and save. The same change could be a Terraform diff.

Rancher then rolls the pool :

1. It creates a new VM from the 6.2 image, which joins the cluster.
2. It drains one of the old 6.1 nodes and deletes it. The heartbeat pods reschedule onto the new node.
3. It repeats until all three nodes are replaced.

Every node IP changes, but users hit a stable MetalLB VIP, so it doesn't matter. Rollback is the same move backwards : point the pool at the previous image.

The 6.1 to 6.2 bump on the demo cluster, 15 minutes squeezed into one (waiting phases at ×40) :

<video controls muted playsinline preload="metadata" width="100%" aria-label="SLE Micro 6.1 to 6.2 distribution bump from Rancher, time-lapse">
  <source src="../../assets/images/suc-sle-micro/sle-micro-bump-1080p.mp4" type="video/mp4">
</video>

In the clip, the new nodes show up as "SUSE Linux Enterprise Server 16.0" : SLE Micro 6.2 is built on the SLES 16 code base, and that is the OS name Kubernetes reports for those nodes. Each new node joins before an old one is cordoned, drained and removed. Over the run, 10 requests timed out, mostly when an old node was drained.

## Trade-offs and what's left

This is a prototype. Its limits :

* **Patches are not atomic across the cluster.** Each node converges on its own, and a mirror can publish new packages mid-rollout. The `rpm-fp` label is how you notice.
* **Kubernetes upgrades should wait for the OS.** A small `gate.sh` script passes only when every Plan is done, all nodes share the same `rpm-fp`, and none is cordoned. Only then does it set the new `kubernetesVersion` on the Rancher cluster.
* **Two triggers for two lifecycles.** The patch lives in Git, the bump lives in the machine pool. The next step is one release definition for both, the way OpenShift moves the OS and Kubernetes together. Nothing does that today.

## Conclusion

On SLE Micro, patches stay in place through snapshots, and distribution bumps replace the nodes. With Fleet, the System Upgrade Controller and a machine pool, Rancher starts both, and a rollback stops the rollout on the failing node.

The Plans, scripts and cloud-init are in the [sle-micro-os-lifecycle repository](https://github.com/coulof/sle-micro-os-lifecycle){target="_blank"} :simple-github:. To go further :

* [K3s automated upgrades with SUC](https://docs.k3s.io/upgrades/automated){target="_blank"} :material-open-in-new:
* [SUSE Linux Micro documentation](https://documentation.suse.com/sle-micro/){target="_blank"} :simple-suse:
* [Installing SUSE Linux Micro on Hyper-V](2026-04-16-sles-micro-hyper-v.md), if you want to try SLE Micro on your laptop first

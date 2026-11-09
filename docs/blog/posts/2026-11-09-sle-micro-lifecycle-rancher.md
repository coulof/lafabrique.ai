---
date: 2026-11-09
draft: true
authors:
  - coulof
categories:
  - Kubernetes
  - SUSE
  - Linux
title: "Patching and Upgrading SL Micro from Rancher"
description: "Two OS lifecycles for SUSE Linux Micro nodes under K3s : weekly in-place patches with Fleet and the System Upgrade Controller, and distribution bumps by replacing nodes from a Rancher machine pool."
---

# Patching and Upgrading SL Micro from Rancher

When you upgrade OpenShift :simple-redhat:, the operating system comes along. CoreOS and the cluster move together, node by node.

With K3s or RKE2 on SUSE Linux Micro (SL Micro), the two lifecycles are separate today. Rancher upgrades Kubernetes, and the OS underneath is left to you.

I drive SL Micro's lifecycle from Rancher, the same way we drive Kubernetes. Everything runs on a live cluster while an application keeps answering.

:simple-youtube: Here is the video walkthrough :
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/TODO_VIDEO_ID" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>

<!-- more -->

## Two kinds of OS change

* **The weekly patch.** We stay on the same VM. `transactional-update` builds a new btrfs snapshot in the background. The node is drained, reboots into the snapshot, and comes back. If anything goes wrong, we boot the previous snapshot.
* **The distribution bump**, twice a year, for example SL Micro 6.1 to 6.2. Here SUSE recommends a fresh install. On SUSE Virtualization (Harvester), a fresh install is cheap : point the machine pool at the new image and let Rancher replace the nodes.

Both end with every node on the same version, and both start from Rancher.

|  | Weekly patch | Distribution bump |
|---|---|---|
| Trigger | Git commit (Plan version) | Machine pool image (UI or Terraform) |
| Mechanism | `transactional-update`, btrfs snapshot | New VM from the new image |
| Node | Same VM, drain, reboot, uncordon | New VM joins, old VM removed |
| Rollback | Boot the previous snapshot | Pool back to the previous image |

The demo cluster has three SL Micro 6.1 nodes on SUSE Virtualization, running K3s and managed by Rancher. Each node holds every role (control plane, etcd, worker), so they upgrade strictly one at a time. A small heartbeat page queries the cluster every second through a single floating IP and shows which pod and node answered.

## The weekly patch : Fleet and the System Upgrade Controller

### Stop nodes from patching themselves

By default, SL Micro patches and reboots itself on a timer. On a cluster node, that reboot happens without a drain. The machine pool's cloud-init turns it off, so the cluster is the only owner of the OS lifecycle :

```yaml
#cloud-config
runcmd:
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

In the video, you can see the node go `Ready,Cordoned`, then `NotReady`, then `Ready` with a new boot ID. The heartbeat stays green ; answers come from the other two nodes. An occasional request fails when it hits a node going down, and the service keeps answering.

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

For SL Micro 6.1 to 6.2, I don't migrate in place. In Rancher, under **Cluster Management**, I edit the machine pool, switch the image to the SL Micro 6.2 one, and save. The same change could be a Terraform diff.

Rancher then rolls the pool :

1. It creates a new VM from the 6.2 image, which joins the cluster.
2. It drains one of the old 6.1 nodes and deletes it. The heartbeat pods reschedule onto the new node.
3. It repeats until all three nodes are replaced.

Every node IP changes, but users hit a stable MetalLB VIP, so it doesn't matter. Rollback is the same move backwards : point the pool at the previous image.

## Trade-offs and what's left

This is a prototype. Its limits :

* **Patches are not atomic across the cluster.** Each node converges on its own, and a mirror can publish new packages mid-rollout. The `rpm-fp` label is how you notice.
* **Kubernetes upgrades should wait for the OS.** A small `gate.sh` script passes only when every Plan is done, all nodes share the same `rpm-fp`, and none is cordoned. Only then does it set the new `kubernetesVersion` on the Rancher cluster.
* **Two triggers for two lifecycles.** The patch lives in Git, the bump lives in the machine pool. The next step is one release definition for both, the way OpenShift moves the OS and Kubernetes together. Nothing does that today.

## Conclusion

On SL Micro, patches stay in place through snapshots, and distribution bumps replace the nodes. With Fleet, the System Upgrade Controller and a machine pool, Rancher starts both, and a rollback stops the rollout on the failing node.

The Plans, scripts and cloud-init are in the [sle-micro-os-lifecycle repository](https://github.com/coulof/sle-micro-os-lifecycle){target="_blank"} :simple-github:. To go further :

* [K3s automated upgrades with SUC](https://docs.k3s.io/upgrades/automated){target="_blank"} :material-open-in-new:
* [SUSE Linux Micro documentation](https://documentation.suse.com/sle-micro/){target="_blank"} :simple-suse:
* [Installing SUSE Linux Micro on Hyper-V](2026-04-16-sles-micro-hyper-v.md), if you want to try SL Micro on your laptop first

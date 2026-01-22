---
date: 2020-11-01
authors:
  - coulof
categories:
  - Dell
  - Kubernetes
---

# PersistentVolume static provisioning

In this article, we will discuss and present a script ([ingest-static-pv.sh](https://github.com/coulof/dell-csi-static-pv) :material-github:) for Persistent Volume [static provisioning](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#static) :material-kubernetes: of Dell CSI Drivers for PowerMax, PowerStore, PowerScale, PowerFlex, and Unity.

<!-- more -->

## The premise

As part of an OpenShift migration project from one cluster to a new one, we wanted to ease the transition by loading the existing persistent storage in the new cluster.

## Concepts for static provisioning

### PersistentVolume static provisioning

The [static provisioning](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#static) :material-kubernetes:, as opposite to [dynamic provisioning](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#dynamic) :material-kubernetes:, is the action of creating `PersistentVolume` upfront so they are ready to be consumed later by a `PersistentVolumeClaim`.

### reclaimPolicy

Each `StorageClass` has a [`reclaimPolicy`](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming) :material-kubernetes: that tells Kubernetes what to do with a volume once it is released.

You can change it at any point with:

```bash
kubectl patch pv [my_pv] -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

### volumeHandle

The `volumeHandle` is the unique identifier of the volume created on the storage backend. What follows is how it's constructed for each Dell driver:

#### PowerMax

```
csi-<Cluster Prefix>-<Volume Prefix>-<Volume Name>-<Symmetrix ID>-<Symmetrix Vol ID>
```

#### PowerStore

Just the volume's or NFS share UUID:

```yaml
volumeHandle: 880fb26c-9a94-4565-9e6e-c0bf2b029ecc
```

#### PowerScale

Volume name, Export ID and Access Zone separated by `=_=_=`:

```yaml
volumeHandle: PowerScaleStaticVolTest=_=_=176=_=_=System
```

#### PowerFlex

Just the volume's ID:

```yaml
volumeHandle: ecdbd5bd0000000a
```

#### Unity

Volume/filesystem name, protocol, and CLI ID:

```yaml
volumeHandle: csiunity-fde5df688a-iSCSI-fnm00000000000-sv_16
```

## Using ingest-static-pv.sh

Get help on volumeHandle format:

```bash
STORAGECLASS=powermax VOLUMEHANDLE=help ./ingest-static-pv.sh
```

Example dry-run:

```bash
STORAGECLASS=powermax \
VOLUMEHANDLE=csi-fdg-pmax-9e954fcdfa-000197900704-0017C \
PVNAME=pmax-9e954fcdfa \
SIZE=8 \
PVCNAME=testpvc \
./ingest-static-pv.sh
```

This outputs:

```yaml
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pmax-9e954fcdfa
spec:
  capacity:
    storage: 8Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: powermax
  volumeMode: Filesystem
  csi:
    driver: csi-powermax.dellemc.com
    volumeHandle: csi-fdg-pmax-9e954fcdfa-000197900704-0017C
    fsType: ext4
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: testpvc
  namespace: default
spec:
  volumeName: pmax-9e954fcdfa
  storageClassName: powermax
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 8Gi
```

To apply for real, use `DRYRUN=false`.

## Conclusion

The static provisioning proved to be very useful for migration projects.

The script [ingest-static-pv.sh](https://github.com/coulof/dell-csi-static-pv) :material-github: is planned to be used in migration projects, including OpenShift cluster migrations.

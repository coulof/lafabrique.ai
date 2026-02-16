---
date: 2025-02-26
authors:
  - coulof
categories:
  - Kubernetes
  - Storage
---

# Use Harvester with Dell Storage

*Co-authored with Parasar Kodati.*

Dell CSI drivers for PowerStore, PowerMax, PowerFlex, and PowerScale have all been tested and are compatible with [KubeVirt :material-open-in-new:](https://kubevirt.io/). This guide provides instructions for installing Dell CSI for PowerMax on [Harvester :simple-suse:](https://harvesterhci.io/), though the steps are very similar regardless of the storage backend.

Tested on :

- Harvester v1.3.1
- CSM v2.11
- PowerMax protocols : Fibre Channel, iSCSI, and NFS

<!-- more -->

---

## Getting Started

To use `helm` and `kubectl`, first download the `KUBECONFIG` from the Harvester UI :

<div class="video-wrapper">
  <iframe src="https://www.youtube.com/embed/ivlfEc43hjo?rel=0" frameborder="0" allowfullscreen></iframe>
</div>

---

## Prerequisites

### Connectivity

The bare-metal nodes need access to the REST API endpoint and the storage network to provision and mount volumes.

When dealing with Fibre Channel, it is imperative that the zoning to the nodes is completed **before** installing the CSI driver.

As part of the installation process, you will need :

- The Unisphere API endpoint (and possibly a backup endpoint for PowerMax)
- The credentials to access the API
- The storage identifier (SymID for PowerMax)
- The storage pool

### Multipathd

Configuring the multipath service is mandatory when using block storage protocols like Fibre Channel, iSCSI, or NVMe.

The CloudInit manifest below sets up :

- `multipathd` to start on node boot
- `multipath.conf` to ensure only EMC LUNs are part of multipathd (not Longhorn volumes)

```bash
kubectl apply -f https://raw.githubusercontent.com/dell/iac-storage-automation/refs/heads/main/kubernetes/harvester/multipathd-harvester.yaml
```

To take effect immediately, either restart the node or SSH into it and start the service manually.

!!! tip "iSCSI and NVMe"
    If you use iSCSI, adapt the sample file to start the `iscsid` daemon. For NVMe, ensure the `nvme-auto-connect.service` is started.

---

## Namespace and Secret Creation

```bash
kubectl create namespace powermax
kubectl create secret generic powermax-creds -n powermax \
  --from-literal=username=unisphere_user \
  --from-literal=password=your_password
```

---

## Helm Installation

The simplest way to install Dell CSI and CSM with Helm is to use the [Installation Wizard :simple-dell:](https://dell.github.io/csm-docs/docs/deployment/csminstallationwizard/src/index.html). First, add the repo :

```bash
helm repo add dell https://dell.github.io/helm-charts
```

<div class="video-wrapper">
  <iframe src="https://www.youtube.com/embed/qVZ4EzEYA4M?rel=0" frameborder="0" allowfullscreen></iframe>
</div>

---

## StorageClass and VolumeSnapshotClass

For StorageClass creation, refer to the [samples :material-github:](https://github.com/dell/csi-powermax/tree/main/samples/storageclass). They contain different configurations (with or without replication, different file system types, and more).

For VolumeSnapshotClass, see the [samples in the same repository :material-github:](https://github.com/dell/csi-powermax/tree/main/samples/volumesnapshotclass).

---

## Harvester csi-driver-config

The last step is configuring Harvester's `csi-driver-config` to allow the Dell provisioner to take Virtual Machine snapshots.

Go to **Advanced** > **Settings** > **csi-driver-config** > **Edit Setting** :

```json
{
  "driver.longhorn.io": {
    "volumeSnapshotClassName": "longhorn-snapshot",
    "backupVolumeSnapshotClassName": "longhorn"
  },
  "csi-powermax.dellemc.com": {
    "volumeSnapshotClassName": "powermax-snapclass",
    "backupVolumeSnapshotClassName": "powermax-snapclass"
  }
}
```

---

## Conclusion

At the time of publication, Harvester supports third-party storage for data volumes only. This will change soon and will allow a full CSM experience.

In the meantime, you can experiment with Harvester and send your feedback :wink:

## Sources

- [Dell CSM GitHub repository :material-github:](https://github.com/dell/csm/)
- [DevOps and Automation YouTube playlist :simple-youtube:](https://www.youtube.com/watch?v=On85eebGhhE&list=PL2nlzNk2-VMHsKVguetbetbmxd4eMfc_X&index=24)
- [Original article on Dell InfoHub :simple-dell:](https://infohub.delltechnologies.com/en-us/p/use-harvester-with-dell-storage/)

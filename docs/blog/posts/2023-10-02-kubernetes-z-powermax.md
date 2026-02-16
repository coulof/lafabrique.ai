---
date: 2023-10-02
authors:
  - coulof
categories:
  - Kubernetes
  - Storage
---

# Kubernetes on Z with PowerMax: Modern Software Running on Mainframe

*Co-authored with Justin Bastin.*

With the 2023 addition of Kubernetes on LinuxOne, you can scale, reduce TCO, and build the hybrid cloud your IT management requires. Combined with Dell PowerMax storage and its CSI driver, you get container orchestration with enterprise storage on mainframe hardware.

<!-- more -->

---

## Benefits of Kubernetes on System Z and LinuxOne

When I was a customer, I consistently evaluated how to grow the technical influence of the mainframe platform. If discussing financials, I would evaluate the total cost of ownership (TCO) alongside various IT solutions. If discussing technical pain points, I would evaluate solutions that may alleviate the issue.

For example, when challenged with finding a solution for a client organization aiming to refresh various x86 servers, I searched online presentations, YouTube videos, and technical websites for a spark. The client organization had already identified the pain point. The hard part was *how*.

Over time, I found the ability to run Linux on a mainframe (called Linux on Z), using an Integrated Facility for Linux (IFL) engine. Once the idea was formed, I started baking the cake. I created a proof-of-concept environment, installed Linux and a couple of applications, and began testing.

The light-bulb moment came not in resolving the original pain point, but in discovering new opportunities :

- **Physical server consolidation** : create a plethora of virtual servers when needed
- **License consolidation** : certain x86 applications were licensed per engine. A quad-core x86 server may need four application licenses. I needed one license for my Linux on Z environment
- **Scalability** : scale horizontally by adding more VMs and vertically by increasing network ports, memory, and storage
- **Reliability** : mainframe technology has been known to be reliable, utilizing fault-tolerant mechanisms within the software and hardware to continue business operations

With Kubernetes providing container orchestration irrelevant of the underlying hardware and architecture, you can leverage LinuxOne benefits to deploy applications in a structured fashion :

- **Enablement of DevOps processes**
- **Container scalability** : one LinuxOne box with hundreds (if not thousands) of containers
- **Hybrid cloud strategy** : LinuxOne servicing various internal business organizations with compute and storage needs

With Dell providing storage to mainframe environments with PowerMax 8500/2500, a Container Storage Interface (CSI) was created to simplify allocating storage to Kubernetes environments on Linux on Z.

---

## Deploy Kubernetes

Linux on IBM Z runs on the `s390x` architecture. All software needs to be compiled for that architecture.

Luckily, Kubernetes, CSI sidecars, and Dell CSI drivers are built in Go. [Since the early days of Go :material-open-in-new:](https://go.dev/blog/ports), portability and support of different OS and architectures has been a core goal. You can list compatible OS and architectures with :

```bash
go tool dist list
```

The easiest way to try Kubernetes on LinuxOne is [k3s :material-open-in-new:](https://k3s.io/). It installs with a one-liner :

```bash
curl -sfL https://get.k3s.io | sh -
```

---

## Build Dell CSI Driver

The Dell CSI Driver for PowerMax is composed of a container for all actions against Unisphere and mounting LUNs to pods, with a set of official [CSI sidecars :material-kubernetes:](https://kubernetes-csi.github.io/docs/sidecar-containers.html) to interact with Kubernetes.

The official sidecars are published for multiple architectures including `s390x`. Dell publishes images for `x86_64` only.

To build the driver, we first build the binary, then the container image.

### Binary

Clone the driver from [csi-powermax :material-github:](https://github.com/dell/csi-powermax) into your `GOPATH`. Build with :

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=s390x GO111MODULE=on go build
```

Verify the output :

```bash
file csi-powermax
csi-powermax: ELF 64-bit MSB executable, IBM S/390, version 1 (SYSV), statically linked, Go BuildID=…, with debug_info, not stripped
```

### Container

The distributed driver uses a minimal [Red Hat Universal Base Image :simple-redhat:](https://www.redhat.com/en/blog/introducing-red-hat-universal-base-image). There is no `s390x`-compatible UBI image, so we rebuild from a Fedora base :

```dockerfile
# Dockerfile to build PowerMax CSI Driver
FROM docker.io/fedora:37

# Dependencies, followed by cleaning the cache
RUN yum install -y \
    util-linux \
    e2fsprogs \
    which \
    xfsprogs \
    device-mapper-multipath \
    && \
    yum clean all \
    && \
    rm -rf /var/cache/run

# Validate some CLI utilities are found
RUN which mkfs.ext4
RUN which mkfs.xfs

COPY "csi-powermax" .
COPY "csi-powermax.sh" .
ENTRYPOINT ["/csi-powermax.sh"]
```

Build the container image with [docker buildx :simple-docker:](https://www.docker.com/blog/how-to-rapidly-build-multi-architecture-images-with-buildx/) for cross-architecture support :

```bash
docker buildx build -o type=registry -t coulof/csi-powermax:v2.8.0 --platform=linux/s390x -f Dockerfile.s390x .
```

The last step is to update the image in the [Helm chart values :material-github:](https://github.com/dell/helm-charts/blob/main/charts/csi-powermax/values.yaml) to point to the new image.

Et voila ! Everything else is the same as with a regular CSI driver.

---

## Wrap-up, Limitations, and Disclaimer

Thanks to the open-source model of Kubernetes and Dell CSM, it is easy to build and utilize them for many different architectures.

The CSI driver for PowerMax supports FBA devices via Fibre Channel and iSCSI. There is no support for CKD devices, which require code changes.

!!! note "Support disclaimer"
    Dell officially supports the published image and binary (through GitHub tickets, Service Requests, and Slack), but not custom builds.

Happy dabbling on IBM Z !

## Sources

- [Dell CSM GitHub repository :material-github:](https://github.com/dell/csm/)
- [DevOps and Automation YouTube playlist :simple-youtube:](https://www.youtube.com/watch?v=On85eebGhhE&list=PL2nlzNk2-VMHsKVguetbetbmxd4eMfc_X&index=24)
- [Original article on Dell InfoHub :simple-dell:](https://infohub.delltechnologies.com/en-us/p/kubernetes-on-z-with-powermax-modern-software-running-on-mainframe/)

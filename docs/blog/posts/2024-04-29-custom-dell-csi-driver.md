---
date: 2024-04-29
authors:
  - coulof
categories:
  - Kubernetes
  - Development
---

# How to Build a Custom Dell CSI Driver

With all the Dell Container Storage Interface (CSI) drivers and dependencies being open-source, anyone can tweak them to fit a specific use case. This post shows how to create a patched version of a Dell CSI Driver for PowerScale.

<!-- more -->

---

## The Premise

As a practical example, the following steps show how to create a patched version of the Dell CSI Driver for PowerScale that supports a longer mounted path.

The [CSI Specification :material-open-in-new:](https://github.com/container-storage-interface/spec/blob/master/spec.md#nodestagevolume) defines that a driver must accept a max path of 128 bytes minimum :

```
// SP SHOULD support the maximum path length allowed by the operating
// system/filesystem, but, at a minimum, SP MUST accept a max path
// length of at least 128 bytes.
```

Dell drivers use the [gocsi :material-github:](https://github.com/dell/gocsi) library as a common boilerplate for CSI development. That library [enforces the 128-byte maximum path length :material-github:](https://github.com/dell/gocsi/blob/main/middleware/specvalidator/spec_validator.go#L772).

The PowerScale hardware supports path lengths up to 1023 characters, as described in the File system guidelines chapter of the [PowerScale spec :simple-dell:](https://www.delltechnologies.com/asset/en-us/products/storage/technical-support/docu65240.pdf). We will build a `csi-powerscale` driver that supports that maximum length.

---

## Steps to Patch a Driver

### Dependencies

The Dell CSI drivers are built with Go and run as containers. Prerequisites :

- Go (v1.16 minimum at time of publication)
- Podman or Docker
- Optionally `make` to run the Makefile

### Clone, Branch, and Patch

Clone the official [csi-powerscale :material-github:](https://github.com/dell/csi-powerscale) repository :

```bash
cd $GOPATH/src/github.com/
git clone git@github.com:dell/csi-powerscale.git dell/csi-powerscale
cd dell/csi-powerscale
```

Pick the version to patch (`git tag` lists versions). In this example, v2.1.0 :

```bash
git checkout v2.1.0 -b v2.1.0-longer-path
```

Fork the gocsi library to your GitHub :

![Fork gocsi repository](../../assets/images/github_fork_dell_gocsi.png)

*Forking the gocsi repository on GitHub.*

Clone your fork and add upstream :

```bash
cd $GOPATH/src/github.com/
git clone git@github.com:coulof/gocsi.git coulof/gocsi
cd coulof/gocsi
git remote add upstream git@github.com:dell/gocsi.git
```

Check the gocsi version used by the driver and branch it :

```bash
grep gocsi $GOPATH/src/github.com/dell/csi-powerscale/go.mod
git checkout v1.5.0 -b v1.5.0-longer-path
```

The patch is a one-liner :

```diff
--- a/middleware/specvalidator/spec_validator.go
+++ b/middleware/specvalidator/spec_validator.go
@@ -770,7 +770,7 @@ func validateVolumeCapabilitiesArg(
 }

 const (
-       maxFieldString = 128
+       maxFieldString = 1023
        maxFieldMap    = 4096
        maxFieldNodeId = 256
 )
```

Commit, push, and tag :

```bash
git commit -a -m 'increase path limit'
git push --set-upstream origin v1.5.0-longer-path
git tag -a v1.5.0-longer-path
git push --tags
```

### Build

Back in the csi-powerscale repo, use the [replace directive :material-open-in-new:](https://go.dev/ref/mod#go-mod-file-replace) in `go.mod` to point to the patched library :

```diff
 replace (
+       github.com/dell/gocsi => github.com/coulof/gocsi v1.5.0-longer-path
        k8s.io/api => k8s.io/api v0.20.2
```

Download the new module and build :

```bash
go mod download
make build
```

!!! tip "Local testing"
    For local-only testing, point the replace directive to a local directory :
    ```
    replace github.com/dell/gocsi => ../../coulof/gocsi
    ```

Build the container image. The quickest path is to overlay the binary on the official image :

```dockerfile
FROM dellemc/csi-isilon:v2.1.0
COPY "csi-isilon" .
```

```bash
docker build -t coulof/csi-isilon:v2.1.0-long-path -f Dockerfile.patch .
```

Or rebuild entirely using the provided [Makefile :material-github:](https://github.com/dell/csi-powerscale/blob/v2.1.0/Makefile) :

```bash
BASEIMAGE=registry.fedoraproject.org/fedora-minimal:latest \
  REGISTRY=docker.io \
  IMAGENAME=coulof/csi-powerscale \
  IMAGETAG=v2.1.0-long-path \
  make podman-build
```

Push to your registry :

```bash
docker push coulof/csi-isilon:v2.1.0-long-path
```

---

## Update CSI Kubernetes Deployment

The last step is to replace the driver image. Depending on your deployment method :

**Helm :**

```yaml
images:
  driver: docker.io/coulof/csi-powerscale:v2.1.0-long-path
```

Then `helm upgrade` as described in the [documentation :simple-dell:](https://dell.github.io/csm-docs/docs/deployment/helm/drivers/installation/isilon/).

**CSM Operator :**

```yaml
apiVersion: storage.dell.com/v1
kind: CSIIsilon
metadata:
  name: isilon
spec:
  driver:
    common:
      image: "docker.io/coulof/csi-powerscale:v2.1.0-long-path"
```

**Quick test with kubectl patch :**

```yaml
# patch_csi-isilon_controller_image.yaml
spec:
  template:
    spec:
      containers:
        - name: driver
          image: docker.io/coulof/csi-powerscale:v2.1.0-long-path
```

```bash
kubectl patch deployment -n powerscale isilon-controller \
  --patch-file patch_csi-isilon_controller_image.yaml
```

Verify :

```bash
kubectl get pods -n powerscale
kubectl logs -n powerscale -l app=isilon-controller -c driver
```

---

## Wrap-up and Disclaimer

Thanks to open source, it is easy to fix and improve Dell CSI drivers or [Dell Container Storage Modules :material-github:](https://github.com/dell/csm/).

!!! note "Support disclaimer"
    Dell officially supports the published image and binary (through tickets, Service Requests, etc.), but **not custom builds**.

## Sources

- [Dell CSM GitHub repository :material-github:](https://github.com/dell/csm/)
- [Original article on Dell InfoHub :simple-dell:](https://infohub.delltechnologies.com/en-us/p/how-to-build-a-custom-dell-csi-driver/)

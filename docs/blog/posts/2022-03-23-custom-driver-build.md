---
date: 2022-03-23
authors:
  - coulof
categories:
  - Dell
  - Kubernetes
---

# Build a custom Dell CSI Driver

With all the Dell CSI drivers and dependencies being open-source, anyone can tweak them to fit a specific use case.

This article demonstrates creating a patched version of a Dell CSI Driver for PowerScale.

<!-- more -->

## The premise

As a practical example, the following steps indicate how to create a patched version of Dell CSI Driver for PowerScale that supports a longer mounted path.

The [CSI Specification](https://github.com/container-storage-interface/spec/blob/master/spec.md#nodestagevolume) :material-github: defines that a driver must accept a max path 128 bytes minimal.

Dell drivers use the library [`gocsi`](https://github.com/dell/gocsi) :material-github: as a common boilerplate for CSI development. That library [enforces the 128 bytes maximum path length](https://github.com/dell/gocsi/blob/main/middleware/specvalidator/spec_validator.go#L772) :material-github:.

The PowerScale hardware supports path length up to 1023 characters as described in the PowerScale spec. Therefore, we will build a csi-powerscale driver that supports that maximum length path value.

## Steps to patch a driver

### Dependencies

The pre-requisites are:

* Golang (v1.16 minimal)
* Podman or Docker
* Optionally `make` to run the Makefile

### Clone, Branch & Patch

Clone the official csi-powerscale repository:

```shell
cd $GOPATH/src/github.com/
git clone git@github.com:dell/csi-powerscale.git dell/csi-powerscale
cd dell/csi-powerscale
git checkout v2.1.0 -b v2.1.0-longer-path
```

![Fork gocsi on GitHub](../../assets/images/github_fork_dell_gocsi.png)

Fork and clone the gocsi library:

```shell
cd $GOPATH/src/github.com/
git clone git@github.com:coulof/gocsi.git coulof/gocsi
cd coulof/gocsi
git remote add upstream git@github.com:dell/gocsi.git
git checkout v1.5.0 -b v1.5.0-longer-path
```

Apply the patch:

```diff
--- a/middleware/specvalidator/spec_validator.go
+++ b/middleware/specvalidator/spec_validator.go
@@ -770,7 +770,7 @@ const (
-       maxFieldString = 128
+       maxFieldString = 1023
```

### Build

Update `go.mod` to use the patched library:

```diff
replace (
+       github.com/dell/gocsi => github.com/coulof/gocsi v1.5.0-longer-path
```

Build the binary: `make build`

Build the image:

```shell
cat << EOF > Dockerfile.patch
FROM dellemc/csi-isilon:v2.1.0
COPY "csi-isilon" .
EOF

docker build -t coulof/csi-isilon:v2.1.0-long-path -f Dockerfile.patch .
docker push coulof/csi-isilon:v2.1.0-long-path
```

### Update CSI Kubernetes deployment

If using helm, add to `myvalues.yaml`:

```yaml
images:
  driver: docker.io/coulof/csi-powerscale:v2.1.0-long-path
```

Or patch existing deployment:

```shell
kubectl patch deployment -n powerscale isilon-controller \
  --patch-file path_csi-isilon_controller_image.yaml
```

## Wrap-up & disclaimer

Thanks to open-source it is easy to fix and improve Dell CSI drivers or [Dell Container Storage Modules](https://github.com/dell/csm/) :material-github:.

Keep in mind that Dell officially supports the published images and binaries; **not custom builds**.

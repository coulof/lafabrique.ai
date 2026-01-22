---
date: 2020-05-29
authors:
  - coulof
categories:
  - Dell
  - Kubernetes
---

# Gitlab CI/CD with CSI PowerMax

Watch the [basic deployment](https://youtu.be/dfKPWqKMuGk) :material-youtube: & [snapshot-based deployment](https://youtu.be/6sClYeToXRg) :material-youtube: videos on Youtube and check the [.gitlab-ci-cd.yaml](https://gitlab.com/coulof/todos) :material-gitlab: on Gitlab.

<!-- more -->

## The premise

For the first release of the [CSI Driver for PowerMax](https://github.com/dell/csi-powermax) :material-github: we wanted to show how the PV dynamic provisioning and snapshot capabilities.

To present a realistic scenario, we used Gitlab CI/CD, its [Kubernetes runner](https://docs.gitlab.com/ee/user/project/clusters/add_remove_clusters.html#adding-and-removing-kubernetes-clusters) :material-gitlab:, and the CSI Driver off course.

The application itself is a fork of the [VueJS example app TODO](https://vuejs.org/v2/examples/todomvc.html), which we modified to use [Sinatra as an API provider](https://gitlab.com/coulof/todos/-/blob/master/server.rb) and SQLite to store the TODOs.

## The implementation

The concept is:

* the master branch corresponds to the latest image and is the production environment
* anytime we push a new branch to GitLab we:
    * build the image
    * take a snapshot of PV from production
    * create an [environment](https://docs.gitlab.com/ee/ci/environments/) :material-gitlab: to access the new app
* new commits on the branch will keep using their own environment with an independent PV
* on branch merge:
    * the dedicated environment and related PV are deleted
    * the production is redeployed with the latest image

Most of the magic on the storage layer happens in the [PVC](https://gitlab.com/coulof/todos/-/blob/master/deploy/todos/templates/pvc.yaml) :material-gitlab:, [Snap](https://gitlab.com/coulof/todos/-/blob/master/deploy/todos/templates/snap.yaml) :material-gitlab: definitions, and with the Helm variables.

Under the scene, we will have two independent volumes in PowerMax. For more deep-dive on PowerMax SnapVX you can check that [white paper](https://www.dellemc.com/resources/en-us/asset/white-papers/products/storage/h13697-dell-emc-powermax-vmax-all-flash-timefinder-snapvx-local-replication.pdf).

To avoid the storage box to be bloated by the project, we also defined a resource Quota on the namespace.

!!! note "Limitations"
    The current version of the CSI driver (v1.2) the snapshot API is v1alpha1 and not compatible with Kubernetes v1.17 and beyond.

    A snapshot is only accessible from the [same namespace](https://kubernetes.io/blog/2019/12/09/kubernetes-1-17-feature-cis-volume-snapshot-beta/#importing-an-existing-volume-snapshot-with-kubernetes) :material-kubernetes: and cannot restore a volume on a different namespace.

## Videos

For a live demo, check the videos here:

<iframe height="560" src="https://www.youtube.com/embed/dfKPWqKMuGk" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<iframe height="560" src="https://www.youtube.com/embed/6sClYeToXRg" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

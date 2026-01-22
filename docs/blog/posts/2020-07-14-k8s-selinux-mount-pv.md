---
date: 2020-07-14
authors:
  - coulof
categories:
  - Linux
  - Kubernetes
---

# K8s mount PV with SELinux

If you want to use Kubernetes with [SELinux](https://wiki.gentoo.org/wiki/SELinux) :material-linux: and mount `PersistentVolume`, you have to make sure your mounted FS has labels.

You can do it with the [mountOptions](https://unofficial-kubernetes.readthedocs.io/en/latest/concepts/storage/persistent-volumes/#mount-options) :material-kubernetes: `-o context="system_u:object_r:container_var_lib_t:s0"` and if your driver doesn't support it, you can write an SELinux policy.

<!-- more -->

## The premise

The problem came from a customer who is using Docker Enterprise with [CSI Driver for VxFlexOS](https://github.com/dell/csi-vxflexos/) :material-github: (now PowerFlex), and SELinux enforced on the nodes.

Anytime a Pod tried to write data on the `PersistentVolume`, we had `Permission denied` error from the OS.

SELinux relies on file label (sometimes called context) in the file extended attributes:

```bash
ls -lZd /root /home /etc
drwxr-xr-x. root root system_u:object_r:etc_t:s0       /etc
drwxr-xr-x. root root system_u:object_r:home_root_t:s0 /home
dr-xr-x---. root root system_u:object_r:admin_home_t:s0 /root
```

By default, on a newly formatted and mounted FS the files are unlabeled:

```bash
mkfs.ext4 /dev/loop0
mount -o loop /dev/loop0 /media/xxx
ls -Z
drwxr-xr-x. root root system_u:object_r:unlabeled_t:s0 xxx
```

On the customer setup, it was forbidden to do any action on an unlabeled file.

## How to get the new FS labeled?

### Option 1: restorecon

The typical way to relabel a directory is to use the command `restorecon` against the mount point. Not feasible in a dynamic Kubernetes environment.

### Option 2: autorelabel

Create a file named `.autorelabel` at the root level to force a relabel on the mountpoint. Still not feasible in a dynamic environment.

### Option 3: mount with context option

Mount the FS with the [context option](https://www.man7.org/linux/man-pages/man8/mount.8.html#FILESYSTEM-INDEPENDENT_MOUNT_OPTIONS) :material-linux:.

Unfortunately, the DellEMC CSI drivers didn't have the `mountOption` capability at the time of that post.

### Option 4: SELinux policy

The last possibility is to write a specific policy to allow containers to manipulate unlabeled files and directories.

Since SELinux follows a model of the least-privilege, the challenge was to have all the syscalls a container needs:

```
class file { create open getattr setattr read write append rename link unlink ioctl lock };
```

To compile the policy, you will need the SELinux Devel package (in Fedora: `dnf install selinux-policy-devel.noarch`):

```bash
make -f /usr/share/selinux/devel/Makefile
semodule -i vxflexos-cni.pp
```

## Wrap-up

`mountOptions` capability is now available with every Dell Technologies CSI driver.

The Gentoo website is a gold mine of information for SELinux! To understand better the issue, I mostly read:

* [Labels](https://wiki.gentoo.org/wiki/SELinux/Labels) :material-linux:
* [Tutorial to create a policy](https://wiki.gentoo.org/wiki/SELinux/Tutorials/Creating_your_own_policy_module_file) :material-linux:
* [SELinux Project Policies](https://github.com/SELinuxProject/refpolicy/tree/master/policy/modules/apps) :material-github:

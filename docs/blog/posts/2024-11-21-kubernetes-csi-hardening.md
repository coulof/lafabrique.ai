---
date: 2024-11-21
authors:
  - coulof
categories:
  - Kubernetes
  - Linux
---

# 🔒🧰 Hardening Kubernetes CSI Drivers: Reducing `CAP_SYS_ADMIN` Without Breaking Storage

Many Kubernetes storage drivers still rely on the powerful—and notoriously over‑broad—Linux capability `CAP_SYS_ADMIN` to perform host‑level operations. While it enables critical actions like filesystem mounts, it also substantially expands the attack surface of your cluster.

This post explains why CSI node plugins often end up needing `CAP_SYS_ADMIN`, what breaks when you remove it, and several concrete hardening strategies using tools like seccomp, AppArmor, SELinux, and controlled privilege elevation.

<!-- more -->


For background on the underlying primitives, Kubernetes has solid docs on [Linux kernel security constraints](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/) and [SecurityContext configuration](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/).

---

## The Problem: Why CSI Drivers Need `CAP_SYS_ADMIN`

Linux [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html) were introduced to break down the all‑or‑nothing root model into smaller, isolated privileges. But `CAP_SYS_ADMIN` ended up becoming the "the new root". It covers a huge range of operations, including:

- Mounting and unmounting filesystems
- Adjusting kernel settings
- Managing namespaces
- Interacting deeply with host resources

CSI node plugins frequently require mount operations, so many vendors simply grant:

- `privileged: true`
- `CAP_SYS_ADMIN`
- `runAsUser: 0`

This configuration works, but increases risk. Hardening efforts aim to reduce this exposure without breaking CSI functionality.

---

## The Impact: What Breaks Without `CAP_SYS_ADMIN`

Removing `CAP_SYS_ADMIN` or removing privileged mode typically causes immediate failures:

1. Mount operations fail (e.g., `mount(2)` is denied).
2. Bidirectional mounts—used heavily by CSI—stop working.
3. Node‑level operations that expect privilege begin failing.

These failures result in stuck PVCs, pods unable to start, and CSI errors during NodeStage/NodePublish.

---

## The Solution: Hardening Strategies

Since the CSI driver still depends on `CAP_SYS_ADMIN`, the next best approach is to constrain what the process can do.

### 1. Restrict syscalls with [seccomp](https://kubernetes.io/docs/tutorials/security/seccomp/)

A seccomp profile can significantly reduce exposure by limiting which syscalls can be used.

Good starting points:
- Begin with `RuntimeDefault`.
- Observe denied syscalls.
- Allow only the handful of required mount‑related syscalls.

This approach is powerful but requires careful tuning.

### 2. Constrain behavior with [AppArmor](https://kubernetes.io/docs/tutorials/security/apparmor/)

AppArmor lets you define precise rules for file access and process execution.

- Easier to write than seccomp.
- Works on Ubuntu‑based Kubernetes distributions.

### 3. Use [SELinux](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#assign-selinux-labels-to-a-container)

On OpenShift and other SELinux‑enforcing platforms, SELinux policies provide strong confinement at the host level.

- Ideal when SELinux is already part of the platform.
- Policies may require an operator to distribute.


## Choosing the Right Hardening Strategy

### On OpenShift
- Prefer SELinux + seccomp.
- Avoid privileged mode when possible.

As everything in OpenShift this can be controlled by an Operator ; here the [Security Profiles Operator
](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/security_and_compliance/security-profiles-operator).

### On Ubuntu-based Kubernetes such as microk8s & Charmed Ubuntu
- AppArmor is an excellent first step.
- Combine with seccomp for syscall isolation.

## Getting Started with CSI Hardening

To begin hardening your Kubernetes CSI drivers:

1. **Start with seccomp**: Apply `RuntimeDefault` seccomp profile and monitor denied syscalls
2. **Add platform-specific hardening**:
   - Ubuntu: Implement AppArmor profiles
   - OpenShift: Configure SELinux policies
3. **Monitor and iterate**: Gradually tighten security policies based on observed behavior
4. **Test thoroughly**: Validate CSI functionality after each hardening step

## Comparison of Hardening Approaches

| Approach | Complexity | Platform Support | Effectiveness |
|----------|------------|------------------|---------------|
| seccomp | Medium | All Linux | High |
| AppArmor | Low | Ubuntu-based | Medium |
| SELinux | High | RHEL/OpenShift | Very High |
| Privilege Reduction | Low | All | Medium |

## Conclusion

Hardening Kubernetes CSI drivers requires a balanced approach that maintains storage functionality while reducing security risks. By implementing seccomp profiles, leveraging platform-specific security frameworks, and gradually reducing privileges, you can significantly improve your cluster's security posture without breaking critical storage operations.

Start with the least disruptive changes, monitor their impact, and progressively implement stronger security measures. The goal is to move away from broad `CAP_SYS_ADMIN` privileges while ensuring your CSI drivers continue to function reliably.


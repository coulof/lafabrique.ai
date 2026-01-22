---
date: 2021-01-04
authors:
  - coulof
categories:
  - Linux
  - Kubernetes
---

# Implement Tanzu on private networks with VyOS

With a virtual router (here [VyOS](https://vyos.io/) :material-linux:), and proper routing table, it is possible to implement [VMware Tanzu](https://docs.vmware.com/en/VMware-Tanzu-Kubernetes-Grid/1.0/vmware-tanzu-kubernetes-grid-10/GUID-tanzu-k8s-clusters-create.html) on private networks without NSX-T.

<!-- more -->

## The premise

I needed to evaluate VMware Tanzu basic capabilities with [CSI driver for PowerScale](https://github.com/dell/csi-powerscale) :material-github:.

As a prerequisite, Tanzu needs two networks at least:

* Management cluster (Supervisor cluster)
* Workload cluster (on-demand clusters)

In my lab, I only have one routable VLAN. For Tanzu, I decided to use three networks:

* Frontend network (`10.247.247.0/24`) - routable to external world with Load-Balancer VIP
* Management network (`10.0.0.0/24`) - for vSphere management
* Workload network (`10.0.1.0/24`) - to host all Tanzu clusters

The problem: I do not have an NSX-T license. Luckily, Linux is here to save the day.

![Architecture](../../assets/img/tanzu/vmware-dswitch.png)

## The implementation

The trick is to use a virtual machine that acts as a router. My choice was [VyOS](https://vyos.io/products/#vyos-platform) :material-linux:, a Debian-based distro designed for routing.

VyOS will route between connected interfaces, so I just had to configure NAT:

```
nat {
    source {
        rule 10 {
            outbound-interface eth0
            source {
                address 10.0.0.0/24
            }
            translation {
                address masquerade
            }
        }
        rule 20 {
            outbound-interface eth0
            source {
                address 10.0.1.0/24
            }
            translation {
                address masquerade
            }
        }
    }
}
```

### Ping issue

During workload cluster creation I got an error. The ICMP echo requests went through the router but the response was issued directly on the DSwitch.

![Ping error](../../assets/img/tanzu/tanzu_ping_error.png)

The fix required three network configuration changes on HAProxy:

1. Set workload IP with `/32` mask in `/etc/systemd/network/10-workload.network`
2. Update gateway of Management NIC in `/etc/systemd/network/10-management.network`
3. Add default route for external with higher weight in `/etc/systemd/network/10-frontend.network`

Apply changes with `systemctl restart systemd-networkd`.

### DNS

Tanzu nodes need to resolve DNS names of VMs on private networks.

VyOS does not come with DNS service, so I installed [dnsmasq](https://wiki.archlinux.org/index.php/dnsmasq) on the HAProxy (PhotonOS uses rpm packages: `yum install dnsmasq`).

The `dnsmasq.conf` configuration:

```ini
interface=eth2
listen-address=10.0.1.1
no-hosts
local=/tanzu.local/
log-queries
```

## Conclusion

For basic features (NAT, static/dynamic routing, DHCP, Firewall, etc.) VyOS is an excellent virtual router that can get you a long way if you don't have NSX-T license :material-emoticon-wink:.

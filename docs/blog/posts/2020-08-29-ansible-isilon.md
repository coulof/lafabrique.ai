---
date: 2020-08-29
authors:
  - coulof
categories:
  - Dell
  - Ansible
---

# Home dir automation with Ansible PowerScale / Isilon

[ansible-isilon](https://github.com/dell/ansible-isilon) :material-github: eases the admin tasks on Isilon / PowerScale ; watch how cool it can be on [Youtube](https://www.youtube.com/watch?v=RF5WoeRry1k&list=PLbssOJyyvHuVXyKi0c9Z7NLqBiDiwF1eA&index=3) :material-youtube: and how to use it below.

<!-- more -->

## The premise

In my old days at the university, I used to work [Sun Ray](https://en.wikipedia.org/wiki/Sun_Ray) :material-wikipedia: thin client. Students and teachers were all connected to the same SPARC server to work. Each of us had its own home directory accessible from the NFS server.

More than 15 years later, enterprises of any size still use home directories on NFS for their users!

In the following article, we will show how to use [Ansible](https://www.ansible.com/) :material-ansible: to manage home directories hosted on a PowerScale array in a university.

The predicate is that [Active Directory](https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/manage/ad-ds-simplified-administration) :material-microsoft-windows: **is the reference** for the userbase. Each LDAP user can be either in the *student* group or the *teacher* group.

Any student or teacher in AD must have his homedir in PowerScale and be accessible via NFS exports. Any student who is no longer enrolled and not in AD will have their homedir removed.

The ansible playbook will:

* Get the list of students and teachers from AD
* Create a unix home directory in PowerScale/Isilon for each user
* Set different quotas if the user is a student or a teacher
* Have daily snapshots of the home directories with varying policies of retention if for the students and teachers
* Mount the home directories in a list of UNIX server
* Cleanup the home directories of students that are not in the AD anymore

## The implementation

In this chapter I will not detail all the tasks as most of them are self-explanatory, but, describe a few tips & tricks that can be reused in other playbooks.

### Install Ansible modules for PowerScale/Isilon

The [Product Guide](https://github.com/dell/ansible-isilon/blob/master/dellemc_ansible/docs/Ansible%20for%20Dell%20EMC%20Isilon%20v1.1%20Product%20Guide.pdf) :material-github: documents the module installation and usage.

This example comes with a [Dockerfile](https://github.com/dell/ansible-storage-automation/blob/master/powerscale/Dockerfile) :material-github: that has the required dependencies to run the playbook.

As the [ansible-isilon](https://github.com/dell/ansible-isilon) :material-github: is very specific about Isilon SDK version, the most important line is:

```bash
RUN pip3 install isi-sdk-8-1-1 pywinrm && \
    git clone https://github.com/dell/ansible-isilon.git
```

Once `docker build`-ed, you can execute the playbook with:

```bash
podman run --security-opt label=disable -e ANSIBLE_HOST_KEY_CHECKING=False \
           -v ~/.ssh/id_rsa.emc.pub:/root/.ssh/id_rsa.pub -v ~/.ssh/id_rsa.emc:/root/.ssh/id_rsa \
           -v "$(pwd)"/homedir/:/ansible-isilon \
           -ti docker.io/coulof/ansible-isilon:1.1.0 ansible-playbook \
           -i /ansible-isilon/hosts.ini /ansible-isilon/create_homedir_for_ad_users_in_isilon.yml
```

Note that on my Fedora 32 machine, the `--security-opt label=disable` is mandatory to be able to mount the volumes.

### The files

To use the playbook, you will have to update a couple of files:

* [hosts.ini](https://github.com/dell/ansible-storage-automation/blob/homedir/powerscale/homedir/hosts.ini) :material-github: ; which has the inventory of Unix and Domain Controller
* [credentials-isi.yml](https://github.com/dell/ansible-storage-automation/blob/homedir/powerscale/homedir/credentials-isi.yml) :material-github: ; which has the details of the PowerScale
* [create_homedir_for_ad_users_in_isilon.yml](https://github.com/dell/ansible-storage-automation/blob/homedir/powerscale/homedir/create_homedir_for_ad_users_in_isilon.yml) :material-github: ; which is the playbook with all the tasks

### UnionFS

To stick with the usual `/home/<username>` file system hierarchy, I wanted to mount the students and teachers sub-dirs within the same `/home`:

```
/mnt/nfs_teachers/      /mnt/nfs_students/      /home
├── alice               ├── carol               ├── alice
└── bob                 └── dan                 ├── bob
                                                ├── carol
                                                └── dan
```

The capability of writing in lowerdirs live is available in [AuFS](https://en.wikipedia.org/wiki/Aufs) :material-wikipedia: and [UnionFS](https://en.wikipedia.org/wiki/UnionFS) :material-wikipedia: but not in the very popular [OverlayFS](https://en.wikipedia.org/wiki/OverlayFS) :material-wikipedia:.

I used `unionfs-fuse` which is available from Ubuntu repo or [CentOS third-party repo](https://centos.pkgs.org/7/repoforge-x86_64/fuse-unionfs-0.26-1.el7.rf.x86_64.rpm.html).

## Video

For a live demo, check the video here:

<iframe height="560" src="https://www.youtube.com/embed/RF5WoeRry1k" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

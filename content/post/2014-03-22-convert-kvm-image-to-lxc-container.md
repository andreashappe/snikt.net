---
layout: post
categories: ["tech", "linux", "virtualization"]
title: "How to convert an KVM image into a LXC container"
description: "How to use convert an KVM image into a LXC container"
keywords: "libvirt virtualization virt-install qemu lvm kvm lxc"
aliases:
  - /blog/2014/03/22/convert-kvm-image-to-lxc-container
date: 2014-04-07
---

[KVM](http://www.linux-kvm.org/page/Main_Page) was an improvement over [Xen](http://www.xenproject.org/) for me. Still for many use-cases a [LXC](https://linuxcontainers.org/) are a more performance, light-weight alternative -- which also seems to be en vougue nowadays.

Through switching to LXC I've reduced my overall memory usage a bit -- the main benefit is, that processes within an LXC container are separated processes within the host system. This should allow the host system to manage memory (think cache, buffers, swap, etc.) more efficiently.

I've started converting most of my trusted KVM images into LXC containers, this post contains the necessary steps.

<!-- more -->

## Step 1: create a new empty lxc container

First of all we'll create a new empty LXC container with a default configuration. I'll name it 'imap', guess it's purpose.

~~~ bash
$ lxc-create --name imap
~~~

LXC's containers are created within `/var/lib/lxc` and, surprise!, a new and aptly named `/var/lib/lxc/imap` container can be found. The container containes two entries for now: `config` for its configuration and an empty `rootfs`-directory which will contain the containers filesystem soon.

## Step 2: copy the KVM image into the LXC container

I'm using LVM-backed KVM/QEMU images, each LVM volume mirrors a physical harddrive including partition tables, etc. Alas this prevents us from just mounting the KVM root image.

First of all let's output the KVM image's partition table:

~~~ bash
$ sudo fdisk -l /dev/vg0/imap.img

Disk /dev/vg0/imap.img: 107.4 GB, 107374182400 bytes
255 heads, 63 sectors/track, 13054 cylinders, total 209715200 sectors
Units = sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disk identifier: 0x00022ea3

            Device Boot      Start         End      Blocks   Id  System
/dev/vg0/imap.img1   *        2048   209713151   104855552   83  Linux
~~~

So the real filesystem starts at sector 2048 and each sector is 512 bytes long. This allows us to calculate this partitions offset within the image and loopback mount the partition into the hosts filesystem:

~~~ bash
 $ mount -o loop,offset=$((2048*512)) /dev/vg0/imap.img /mnt-source
~~~

Now we can copy the old KVM image's contents into the new container:

~~~ bash
 $ rsync -av /mnt-source/* /var/lib/lxc/imap/rootfs
~~~

## Step 3: prepare the container's device nodes and fix fstab

LXC does not support udev, so we'll have to create the container's device nodes by ourself. To simplify this, I've used the following bash script and copied it to /usr/local/sbin/create-lxc-nodes.sh

~~~ bash
#!/bin/bash
ROOT=$(pwd)
DEV=${ROOT}/dev
mv ${DEV} ${DEV}.old
mkdir -p ${DEV}
mknod -m 666 ${DEV}/null c 1 3
mknod -m 666 ${DEV}/zero c 1 5
mknod -m 666 ${DEV}/random c 1 8
mknod -m 666 ${DEV}/urandom c 1 9
mkdir -m 755 ${DEV}/pts
mkdir -m 1777 ${DEV}/shm
mknod -m 666 ${DEV}/tty c 5 0
mknod -m 600 ${DEV}/console c 5 1
mknod -m 666 ${DEV}/tty0 c 4 0
mknod -m 666 ${DEV}/tty1 c 4 1
mknod -m 666 ${DEV}/tty2 c 4 2
mknod -m 666 ${DEV}/tty3 c 4 3
mknod -m 666 ${DEV}/tty4 c 4 4
mknod -m 666 ${DEV}/tty5 c 4 5
mknod -m 666 ${DEV}/tty6 c 4 6
mknod -m 666 ${DEV}/full c 1 7
mknod -m 600 ${DEV}/initctl p
mknod -m 666 ${DEV}/ptmx c 5 2
~~~

Use this script to create all needed device nodes:

~~~ bash
 $ cd /var/lib/lxc/imap/rootfs
 $ /usr/local/sbin/create-lxc-nodes.sh
~~~

As all filesystems were already prepared by the host system there's no need for the guest system's init system to do any work during bootup (actually this might rather be harmful). To prevent any problems I've commented out each and every line within the guests "etc/fstab" configuration file.

## Step 4: create LXC configuration file

Each LXC container's configuration is stored in the "config" file which is situated around the "rootfs" directory. Let's create a new one:

~~~
# Template used to create this container: (null)
# Parameters passed to the template:
lxc.mount.entry = proc proc proc nodev,noexec,nosuid 0 0
lxc.mount.entry = sysfs sys sysfs defaults  0 0
lxc.tty = 2
lxc.pts = 1024
lxc.cgroup.devices.deny = a
lxc.cgroup.devices.allow = c 1:3 rwm
lxc.cgroup.devices.allow = c 1:5 rwm
lxc.cgroup.devices.allow = c 5:1 rwm
lxc.cgroup.devices.allow = c 5:0 rwm
lxc.cgroup.devices.allow = c 4:0 rwm
lxc.cgroup.devices.allow = c 4:1 rwm
lxc.cgroup.devices.allow = c 1:9 rwm
lxc.cgroup.devices.allow = c 1:8 rwm
lxc.cgroup.devices.allow = c 136:* rwm
lxc.cgroup.devices.allow = c 5:2 rwm
lxc.cgroup.devices.allow = c 254:0 rm
lxc.utsname = imap
lxc.network.type = veth
lxc.network.flags = up
lxc.network.link = virbr0
lxc.network.hwaddr = 00:16:3e:f1:35:ab
lxc.network.ipv4.gateway = 192.168.122.1
lxc.network.ipv4 = 192.168.122.15
lxc.cap.drop = sys_module
lxc.cap.drop = mac_admin
lxc.cap.drop = mac_override
lxc.cap.drop = sys_time
lxc.rootfs = /var/lib/lxc/imap/rootfs
~~~

We'll allow a couple of devices (mostly terminals) and provide a mounted proc and sys filesystem to the guest. Note the container's name (lxc.utsname) and the configured path for it's root filesystem (/var/lib/lxc/imap/rootfs). In addition this configuration file contains the network configuration (ipv4 sets the IP address which the container will be assigned to by the internal DHCP server). Please don't forget to provide an unique MAC address (hwaddr) to each container.

## Step 5: start the container

Start the container in the background and SSH into it

~~~ bash
 $ lxc-start --name imap -d
 $ ssh 192.168.122.15
~~~

Say welcome to your new container!

## Appendix 1: improve the container..

There are some things that are not needed anymore. All commands are entered within the container (which is a Debian 7.0 system BTW)!

~~~ bash
 $ apt-get remove --purge acpid acpi
 $ update-rc.d -f hwclock.sh remove
 $ update-rc.d -f mountall.sh remove
 $ update-rc.d -f checkfs.sh remove
 $ update-rc.d -f udev remove
~~~

Let's see how we can improve the container in the future..

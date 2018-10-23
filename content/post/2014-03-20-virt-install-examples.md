---
layout: post
tags: ["linux", "virtualization"]
title: "How to use virt-install to install new virtual machines within libvirt/kvm"
description: "How to use virt-install to install new virtual machines within libvirt/kvm"
keywords: "libvirt virtualization virt-install qemu lvm kvm"
aliases:
  - /blog/2014/03/20/virt-install-examples
date: 2014-03-22
---

I've been using [KVM](http://www.linux-kvm.org/page/Main_Page) and [virt-install](http://linux.die.net/man/1/virt-install) to manage virtual machines on one of my servers, this post shows how to use virt-install.

<!-- more -->

According to the package management system I'm having the following packages installed:

~~~ bash
root@edgewalker ~ # dpkg -l | grep virt
ii  libvirt-bin                         1.1.1-0ubuntu8.1                    amd64        programs for the libvirt library
ii  libvirt0                            1.1.1-0ubuntu8.1                    amd64        library for interfacing with different virtualization systems
ii  munin-libvirt-plugins               0.0.6-1                             all          Munin plugins using libvirt
ii  openvpn                             2.3.2-4ubuntu1                      amd64        virtual private network daemon
ii  python-libvirt                      1.1.1-0ubuntu8.1                    amd64        libvirt Python bindings
ii  qemu-kvm                            1.5.0+dfsg-3ubuntu5                 amd64        QEMU Full virtualization on x86 hardware (transitional package)
ii  virt-top                            1.0.7-1                             amd64        show stats of virtualized domains
ii  virtinst                            0.600.4-2ubuntu2.1                  all          Programs to create and clone virtual machines
~~~

Storage-wise I'm using a LVM volume group called 'vg0' (which was imported into the libvirt configuration).

# How to use virt-install

To setup a new guest machine I'm using the following command:

~~~ bash
$ virt-install -n virtual_machine_name -r 4096 --os-type=linux --os-variant=debianwheezy --disk pool=vg0,size=40,bus=virtio,sparse=false,cache=none,io=native -w bridge=virbr0,model=virtio --graphics none -l http://ftp.debian.org/debian/dists/wheezy/main/installer-amd64/ --autostart -x console=ttyS0,115200n8
~~~

That's mostly it. The parameters configure the following

| Parameter | Value | Why? |
|:---- | :---- | :--- |
| -n | virtual_machine_name | the name of the virtual machine, d'oh |
| -r | 4096 | virtual memory size, this would be 4GB |
| -l, -os* | .. | which operating system to install |
| --disk | .. | create a new LVM volume with 40GB, use virtio drivers for higher performance |
| -w | .. | network configuration, use the default bridge |
| --graphics | none | we don't need not graphical user interface |
| --autostart | none | automatically start installation |
| -x console | .. | also create a virtual console, this will allow us to finish installation |

The host-bridge setup (created by the debian installation) will assign a private IP address to the virtual machine through DHCP. I'm using the virtio drivers as those should yield better performance than the rest.



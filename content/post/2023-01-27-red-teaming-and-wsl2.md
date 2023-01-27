---
layout: post
title: "Using WSL2 to hide from EDR"
categories: ["Security"]
date: 2023-01-27
keywords:
- windows
- security
- active directory
- WSL2
- CrowdStrike
- Undercover
---

**TL;DR WSL2 seems to be one big [lolbin](https://lolbas-project.github.io/#) when it comes to EDR**

## Scenario/Background

During a recent [assumed-breach pen-test assignment](https://www.sans.org/webcasts/assumed-breach-better-model/) I was stranded as a low-level user on a fully-updated Windows 10 Enterprise system (10.0.19045) including a deployed CrowdStrike Falcon EDR suite (6.49.16303.0). As I respect CrowdStrike I did not want to execute any malicious scripts on the host, so what to do?

### WSL2 to the rescue!

Installation was done quite comfortable through the company's [Software Center](https://learn.microsoft.com/en-us/mem/configmgr/core/understand/software-center), no local administrative rights required.

### What is WSL2 again?

The [Windows Subsystem for Linux (WSL)](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) is a compatibilty layer for running linux binaries within Windows. WSL1 was a compatiblity layer for running Linux binaries on top of the Windows kernel. This should make it a bit akin to using wine for runing windows binaries under Linux.

[WSL2 is using Hyper-V](https://learn.microsoft.com/en-us/windows/wsl/compare-versions) to run a full linux kernel within a lightweigt virtual machine. Linux running within WSL2 has thus it's own network stack, all files are stored within a virutal machine on the host computer. For our purposes it is similar to installing and starting a virtual machine from within windows, albeit in our use-case without needing local adminstrative rights.

## How to install Linux images?

Still being a bit paranoid, I did not want to install anything too obviously malicious and manually downloaded and started an Debian Linux Image:

~~~ powershell
PS c:\Users\happe> wsl --set-default-version 2
PS c:\Users\happe> curl.exe --insecure -L -o debian.appx https://aka.ms/wsl-debian-gnulinux
PS c:\Users\happe> Add-AppxPackage .\debian.appx
~~~

Which I then started the linux image (and became root within the WSL2 virtual machine):

~~~
$ wsl debian -u root
~~~

Nothing to be seen here. And CrowdStrike also saw nothing.

### Maybe I am just too paranoid..

A couple of days later I thought to become "louder" and installed Kali Linux directly through the wsl infrastructure:

~~~ powershell
PS c:\Users\happe> wsl --list --online
PS c:\Users\happe> wsl --install -d kali-linux
PS c:\Users\happe> wsl kali-linux --user root
~~~

Still no response by the EDR. You know, typical windows users run Kali. As I am not too fond of the Windows graphical user interface, I even installed [Win-KeX](https://www.kali.org/docs/wsl/win-kex/) within kali-linux so that I'd have a fully graphical linux hacking distribution available.

Still no response by the EDR.

## Potential Problems and drawbacks

I did run into some unexpected issues though..

### init system with the kali image

When using the Kali image, you don't have a fully blown linux distribution. It seems as if the image was optimized for fast boot times and is missing is a full-blown systemd-based init system.

I did try to run OpenVAS within WSL2 (did I mention that I am prone to overdo stuff) and failed. While I was able to install it, the setup scripts failed due to the lack of systemd. It seems as if the background scanners are implemented as systemd services and communicate over MQTT with the main OpenVAS process (great architecture).

I was able to start various background services by hand, but after half an hour gave up as I still was able to use nmap with all nse scripts. It was out-of-scope for this assignment, but other network vulnerability scanners such as the monolithic nessus should work without any problems.

### DNS was not configured correctly within WSL2

Please note, that WSL did not configure the correct DNS server within linux for me. I had to manually alter the `/etc/resolv.conf` and add the Active Directory domain server (which is shown on the host cmd.exe line through `ipconfig /all`).

Of course, the WSL2 image is also not part of the Active Directory domain but only network-connected.

### Network is routed, not bridged

Network-wise the WSL2 machine is assigned a host-private IP and all traffic is routed through the host network (so the host computer becomes a NAT device for the virtual machine).

This offers you a bit of cover against network-based IDS but prevents you form utilizing network sniffing tools such as tcpdump (as you only get the traffic between the host and the WSL2 image) or Responder (as you would only get network hashes from the host machine).

For now. It seems as if Windows 11 allows for the creation of [WSL2 images using a bridged network](https://randombytes.substack.com/p/bridged-networking-under-wsl). Fun times ahead.

## How to utilize those Linux Images?

Except from minor issues, using an WSL2 image is  not not too different from using a normal Linux system.

How powerful is this? Quite a lot. While your root user within the virtual linux system does not map to the Windows local admin user, conceptionally you now have a virtual machine running kali linux that is not monitored by the EDR.

With that I was able to use a couple of tools of questionable nature:

- running a [Chisel](https://github.com/jpillora/chisel) reverse SOCKS5 proxy from within WSL2 did not trigger any EDR or network detection. I used this to create a reverse proxy tunnel to an Microsoft Azure hosted virtual machine. This allowed me to use `proxychains` on that virtual machine to fully access the internal customer network without needing any further installed binaries within WSL2.

- through that reverse proxy I was able to call [bloodhound-python](https://github.com/fox-it/BloodHound.py) to create an data capture for Bloodhound (just remember to pass the internal DNS-server IP and force using TCP for dns-queries):

~~~
$ proxychains bloodhound-python -u $myuser -p $mypass -ns $ad_dns -d $ad_domain -c DCOnly --dns-tcp
~~~

- As nothing was detected by the EDR, I just installed `nmap` within WSL2 and scanned the internal network..

## Conclusion

Overall, I was rather amazed how much flexibility using the WSL2 image gave me during the pen-test assignment. As Windows 10 start to become out-phased at the end of this year (2023), I might encounter WSL2 running on Windows 11 more in the future (and might exploit it's bridged network features).

Not having a fully-blown init system was surprising to me, but as the main systemd developer is now employed by Microsoft this might also be changing in the future.

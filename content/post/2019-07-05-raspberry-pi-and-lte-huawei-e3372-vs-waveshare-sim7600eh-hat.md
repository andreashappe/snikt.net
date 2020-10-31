---
layout: post
title: "LTE uplink for Raspberry Pi: Huawei E3372 vs Waveshare SIM7600E-H"
categories: ["tech"]
date: 2019-07-05
keywords:
- linux
- raspberry pi 3b+
- lte
- huawei e3372
- waveshare sim7600e-h
---

I spent some time playing around with various LTE-options for my [Raspberry Pi Access Point/Router setup](https://snikt.net/blog/2019/06/22/building-an-lte-access-point-with-a-raspberry-pi/).

My [Huawei E3372](https://amzn.to/2xvgRls) USB LTE modem works find but only implements a fake network card. This means that a virtual network card is emulated, all traffic is NATted over a virtual router located behind that virtual network card. This happens in addition to the network translation (NAT) that my Raspberry Pi access point already does. Also, I think that my Raspberry with the external USB LTE modem looks a bit unprofessional:

{{< figure src="/assets/2019/setup_e3372.jpg" title="Raspberry Pi 3b+ with Huawei E3372" >}}

After some research I bought a [Waveshare SIM7600E-H hat](https://www.waveshare.com/wiki/SIM7600E-H_4G_HAT). This module is just put on top of the Raspberry (at least that's what I thought) and thus would make for a more compact and professional looking setup. When I initially setup this combination I found out, that the communication is actually performed through an attached USB cable, so the setup is not as clean as I hoped that it would be:

{{< figure class="figure" src="/assets/2019/setup_sim7600.jpg" title="Raspberry Pi 3b+ with Waveshare SIM7600E-H" >}}

After doing [some research](https://www.raspberrypi.org/forums/viewtopic.php?t=224355), I was able to configure the LTE modem, more or less using the following script stored in `/usr/local/bin/start_lte.sh`:

~~~ bash
#!/bin/sh

qmicli -d /dev/cdc-wdm0 --dms-set-operating-mode='online'

# needed to sleep otherwise modem is sometimes not ready
sleep 2

ip link set wwan0 down
echo 'Y' | tee /sys/class/net/wwan0/qmi/raw_ip
ip link set wwan0 up

qmicli -p -d /dev/cdc-wdm0 --device-open-net='net-raw-ip|net-no-qos-header' --wds-start-network="apn='business.gprsinternet',username='t-mobile',password='tm',ip-type=4" --client-no-release-cid

# get dhcp address
udhcpc -i wwan0
~~~

You need to install `libqmi-utils` and `udhcpc` for that (`apt install libqmi-utils udhcpc`). I am calling this script from `/etc/rc.local` so it is automatically started on system boot.

To be honest, I'd prefer to call this through an udev-rule so it would only be called when (or if) the modem is connected but somehow this didn't seem to work. You should exchange the configured APN-data in the last line with your provider data!

Be aware that in my case, this setup gave me a dynamic public IP address. So minimize publicly available services, change all account passwords and maybe install `fail2ban` before you do this. As I get an public IP address this would allow me to host a public web server through my Raspberry or create a simple "call-home" VPN setup. This increases the usefulness of the access point tremendously.

How's performance? So far I cannot give a sure answer. Currently Vienna (Austria) is drenched with tourists so the available wireless bandwidth is strained. I am getting around 25-40 MBit/second on the downstream compared to the 60MBit/sec that I got with the Huawei modem. Upstream seems to be same while latency is in the 15-17ms range (thus better).

So far, this increases the usability of my setup a lot but does not achieve the same download-performance as the original Huawei E3372-based setup. There seems always something to improve upon..

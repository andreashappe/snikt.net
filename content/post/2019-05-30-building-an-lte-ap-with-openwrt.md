---
layout: post
title: "Building an LTE Access point with OpenWRT/Rooter"
categories: ["tech"]
date: 2019-05-30
---

My LTE internet connection (70 Mbit downstream, 15 MBit upstream) came with a combined [Huawei B315s LTE modem/access point](https://amzn.to/30QwbXi). As I was using it for the last two to three years a couple of problems did arise:

* the internet connection was often shaky, oftentimes the uplink connection got lost and I had to power-cycle the modem/access point. Subjectively this got improved with the last system upgrade.
* while the internet down speed on the wired connection was good, the speed achieved through the wireless connection was atrocious (see measurements later in this blog post)
* the power supply is badly built and takes the space of two power outlets.
* I am not trusting proprietary hardware and software too much.

Some research showed that I should be able to replace the existing hardware with an [OpenWRT](https://openwrt.org/)-based access point and a single USB LTE-modem. I wasn't sure if the drivers would work out and what the resulting internet performance would be but there's only a single way to find that out: build it.

So I bought a cheap [LTE-modem (Huawei E3372)](https://amzn.to/2WeV5kP) and used an old OpenWRT-powered travel access point ([TP-LINK WR307n](https://openwrt.org/toh/tp-link/tl-wr703n)), I initially setup OpenWRT using [this instructions](https://openwrt.org/toh/tp-link/tl-wr703n#tftp_install_necessary_on_v17_hardware)). To have a better chance to have my modem supported I switched over to the [ROOTer firmware](https://www.ofmodemsandmen.com/): this firmware is also based upon OpenWRT but adds multiple USB LTE modem drivers. To flash the new firmware I used the following instructions (i.e., just used the OpenWRT firmware upgrade web operation to install the new firmware).

How are the results looking? See for yourself:

{{< figure src="/assets/2019/routers.jpeg" title="Both my old (in the back) and new (in the front) 4G router/access points" >}}

After I powered up the newly flashed access point/router, configured WPA2 for my wireless network and connected the USB LTE modem (after I put in my old router's SIM card first). When I checked the access point's web interface no USB LTE modem was detected. Bummer! But then it occurred to me that my laptop already was connected to the internet. What happened? The USB LTE stick was not detected as an USB LTE modem but as a network device --- including routes for the internet standard gateway, etc. This might make my internet uplink speed somewhat slower (as the USB stick plays "additional" router) and adds another NAT traversal to my internet connection but at least this worked out-of-the-box. This also means that flashing ROOTer over OpenWRT might have been unnecessary but.. whatever works.

Let's do some performance measurements to compare the achieved internet performance with the original setup. First, let's check the old router/access point (note the slow speed achieved with the WLAN/wireless connection):

client | connection | latency | downstream | upstream
-------|------------|---------|------------|-----------
laptop | lan        | 24ms    | 66.79MBit/s| 13.70
laptop | wlan       | 27ms    | 19.38MBit/s|13.71
phone  | wlan       | 21ms    | 16.10MBit/s|13.70

Now in comparison, the following speed was achieved using ROOTer and the TP-Link/LTE-Modem combination:

client | connection | latency | downstream | upstream
-------|------------|---------|------------|-----------
laptop | lan        | 21ms    | 57.57MBit/s|13.59MBit/s
laptop | wlan       | 25ms    | 41.72MBit/s|13.87MBit/s
phone  | wlan       | 20ms    | 36.4MBit/s |11.9MBit/s

The improvement over the wireless network is brutal --- over twice the speed! Not bad for a totally under-powered (lacking any serious CPU and/or RAM) old flashed travel router.

What are the benefits of this setup?

* Double the download speed on the wireless interface.
* I can power the access point through an open port on my multi-port USB charger and thus save one power outlet. In case of an power outage I can use an off-the-shelf USB battery pack to keep the access point/router powered and thus maintain my internet connectivity.
* With OpenWRT I can disable the status LED on the access point and thus decrease light pollution in my room.
* I do place more trust into an open-source rooter compared to proprietary routers.

What is left to do in the future?

* replace the under-powered TP-Link with a [Raspberry Pi](https://amzn.to/30MIhAG)-clone device. The TP-Link already has too little flash memory to utilize the latest version of OpenWRT so an upgrade might be sensible anyway. I should think what to do with the additional computing capacity of a Raspberry though.. some sort of SmartHome/HomeAutomatisation solution would be great..
* try to switch the Huawei USB LTE modem from the emulated network card mode into a USB-modem mode and see if this would change the performance characteristics.
* I am not sure if I should keep ROOTer (OpenWRT might be enough as the modem drivers provided by ROOTer seem to be not needed) or switch to a pure Linux-based setup.

Stay tuned..

---
layout: post
title: "Building an LTE Access Point with a Raspberry Pi"
categories: ["tech"]
date: 2019-06-22
keywords:
- linux
- huawei 4g modem
- access point
- lte
- linux
- raspberry pi 3b+
- hostapd
- dnsmasq
- bridge
---

In [one of my last experiments](https://snikt.net/blog/2019/05/30/building-an-lte-access-point-with-openwrt-rooter/) I replaced my crappy T-Mobile (now Magenta) 4G modem/access point with an OpenWRT-based cheap travel router and a 4G USB LTE modem. That doubled my speed over the wireless (WLAN) network but the setup was limited by the outdated and under-powered travel rooter. So I got myself a cheap Raspberry Pi 3b+ and created a minimal Linux-based 4G router/access-point. My basic goal was to create the minimal feasible configuration so that I have a good starting point for future IoT/VPN/SmartHome experiments. I think I succeeded.

Hardware I used:

* [Raspberry Pi 3b+](https://amzn.to/2IYZ77h)
* [Huawei E3372 USB LTE modem](https://amzn.to/2RtmGsU)
* [Samsung 32GB microSDHC memory card](https://amzn.to/2N5h9KD)
* and an old phone USB charger (2.5A)

## What did I want to achieve?

I wanted to have the minimal feasible setup, for that means:

* the Raspberry Pi gets an static IP address of it's own (which will be 192.168.66.1 in this blog post)
* the wireless (WLAN) and  the cable-based (Ethernet) interfaces are bridged --- it makes no difference if you connect via cable or through wireless.
* the wireless (WLAN) should use WPA2 with a static password. 802.11n will be used as this wireless band is less overcrowded than the 802.11b band in this area.
* a DHCP/DNS server will offer IP-addresses to both wired and wireless clients.
* the Internet uplink will be provided through the USB LTE modem. As this emulates a network device, a simple NAT rule combined with IP forwarding should suffice.

This translated into the following simple setup steps:

## Initial Raspberry Pi Setup

My access point wouldn't need a graphical user interface so based it upon the [Raspbian Stretch Lite image](https://www.raspberrypi.org/downloads/raspbian/). After I downloaded and extracted the Image, i extracted it and transferred it upon a MicroSDHC card (the SD card reader within my Laptop detects the card as `/dev/sda`, to prevent accidents I will name the device `/dev/sdX` in the following):

~~~ bash
$ cd Downloads
$ unzip 2019-04-08-raspbian-stretch-lite.zip
$ sudo dd if=2019-04-08-raspbian-stretch-lite.img of=/dev/sdX
$ sync
$ sudo eject /dev/sdX
~~~

With the card prepared, I plugged it into the Raspberry Pi and also connected a display and keyboard. While it is feasible to do a fully head-less setup, this was more of an exploratory setup.. and working on a network connection while being connected over the same connection is finicky at best.

After the Pi was powered up, I logged in using the default credentials (`pi:raspberry`) and immediately grew the file system to contain the whole SD card:

~~~ bash
# navigate to "advanced options" -> "expand file system"
$ sudo raspi-config
$ sudo reboot
~~~

After the reboot, I changed the default password, enabled SSHd for remote logins and performed a system update (including a new kernel, version `4.19.42-v7+`)

~~~ bash
# to change the password
$ passwd

# enable SSHd
$ sudo systemctl enable ssh
$ sudo systemctl start ssh

# perform a system upgrade
$ sudo apt update
$ sudo apt dist-upgrade
$ sudo reboot
~~~

Now the Pi is ready for the basic network setup.

## Configuring the wireless/wired Bridge

Let's start with the basic network setup which will be a bridge. A bridge contains multiple network interfaces, traffic will be shared between those network interfaces (which will be `eth0` for the wired network, and `wlan0` for the wireless network interface for us).

First install needed tools:

~~~ bash
$ sudo apt install bridge-utils
~~~

The network interfaces are configured through `/etc/network/interfaces`, you can create that file if it does not exist:

~~~
# Include files from /etc/network/interfaces.d:
source-directory /etc/network/interfaces.d

# automatically connect the wired interface
auto eth0
allow-hotplug eth0
iface eth0 inet manual

# automatically connect the wireless interface, but disable it for now
auto wlan0
allow-hotplug wlan0
iface wlan0 inet manual
wireless-power off

# create a bridge with both wired and wireless interfaces
auto br0
iface br0 inet static
        address 192.168.66.1
        netmask 255.255.255.0
        bridge_ports eth0 wlan0
        bridge_fd 0
        bridge_stp off
~~~

Please note, that the IP-configuration for the Pi is entered at the bridge stanza. We give the Pi a fixed static IP address of `192.168.66.1`. Another option would be to use a DHCP configuration to automatically receive an IP-Address, e.g. through the wired network interface and thus create a wired/wireless bridge. As we want to use the Pi as sole DHCP server, a static IP-Address is better fitting.

With this setup, you can now connect another computer through the wired network interface, statically configure the computer with an IP address, i.e. `192.168.66.2`, and SSH into the Pi using your changed credentials.

As a next step, we'll configure dynamic IP-address assignments for connected clients.

## Configuring the DHCP/DNS server

We gonna use dnsmasq as a combined DHCP/DNS server, so let's install that first:

~~~ bash
$ sudo apt install dnsmasq
~~~

And then create a minimal configuration in `/etc/dnsmasq.conf`:

~~~
# which network interface to use
interface=br0

# which dhcp IP-range to use for dynamic IP-adresses
dhcp-range=192.168.66.50,192.168.66.150,12h
~~~

And that's actually it, with that you will get dynamic IP-adresses in the Range of `192.168.66.50-150`. You can now reboot the Pi, change your computer to use DHCP and should get an dynamic IP address assigned.

Next step: configure the wireless network interface.

## Configuring the wireless (WLAN) access-point Interface

We will use `hostapd` to provide a fake access point to wireless clients. First of all, install and enable it:

~~~ bash
$ sudo apt install hostapd
$ systemctl unmask hostapd
$ systemctl enable hostapd
~~~

In addition we need to provide a minimal `hostapd`-configuration through `/etc/hostapd/hostapd.conf`:

~~~
bridge=br0

interface=wlan0
driver=nl80211
ssid=LakeOfFire

hw_mode=a
channel=36
ieee80211d=0
country_code=AT

ieee80211n=1
ieee80211ac=1
wmm_enabled=1

wpa=2
auth_algs=1
wpa_key_mgmt=WPA-PSK
wpa_passphrase=pleasechangethis
rsn_pairwise=CCMP
~~~

This configures a new access-point with ESSID `LakeOfFire` (yeah, I am a Nirvana fan) that will be using our already configured bridge interface `br0`. We use the 5Ghz band (as this is less used here) and enable 802.11n Ethernet speeds. The wireless will be protected through WPA2 with a key of `pleasechangethis`. Please change this password.

In addition we need to change `/etc/default/hostapd` to automatically start the wireless access point on system startup:

~~~
DAEMON_CONF="/etc/hostapd/hostapd.conf"
~~~

If you now reboot everything, you should be able to connect through both the wired as well as the wireless interface. In addition, your wireless clients should be able to connect to your wired client and vice-versa.

Now add the USB LTE modem to the mix..

## Adding the LTE modem through the USB LTE Modem

The USB LTE modem is detected as a virtual network device (`eth1` in our case). This makes the initial setup quite easy as we just need to add another network device at the end of `/etc/network/interfaces` and configure it to automatically receive IP-addresses:

~~~
auto eth1
allow-hotplug eth1
iface eth1 inet dhcp
~~~

For the routing we need to enable IP forwarding within the configuration file `/etc/sysctl.conf` by setting:

~~~
net.ipv4.ip_forward=1
~~~

In addition we need some firewall rules to forward and masquerade traffic from our bridge (`br0`) to the LTE modem. We will use `iptables` to setup those rules and `iptables-persistent` to recover those rules after a reboot (which we do afterwards):

~~~ bash
$ sudo apt install iptables iptables-persistent
$ sudo iptables -t nat -A POSTROUTING -j MASQUERADE
$ sudo iptables -A FORWARD -i eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
$ sudo iptables -A FORWARD -i wlan0 -j ACCEPT
$ sudo iptables-save > /etc/iptables/rules.v4
$ sudo reboot
~~~

And with that, the access point will forward traffic towards the great wide internet.. this concludes our initial minimal setup.

## Performance Comparison

The original T-Mobile/Magenta 4G access-point provided the following performance (downstream/upstream are always in MBit/second):

client | connection | latency | downstream | upstream
-------|------------|---------|------------|-----------
laptop | lan        | 24ms    | 66.79|13.70
laptop | wlan       | 27ms    | 19.38|13.71
phone  | wlan       | 21ms    | 16.10|13.70

With the prior OpenWRT setup I was able to already improve the performance (a lot):

client | connection | latency | downstream | upstream
-------|------------|---------|------------|-----------
laptop | lan        | 21ms    | 57.57|13.59
laptop | wlan       | 25ms    | 41.72|13.87
phone  | wlan       | 20ms    | 36.40|11.90

The new setup yielded better performance, but as I switched both my mobile phone (to an [Xiaomi Mi Mix 2s](https://snikt.net/blog/2019/06/11/switching-a-xiaomi-mi-mix-2s-to-linageos-android-9/)) as well as changed my laptop's linux distribution those should not be directly compared. At least they give you a feeling for the performance change (I used the [Ookla Speedtest](https://www.speedtest.net/de) for this, not sure what I used for the prior measurements):

client | connection | latency | downstream | upstream
-------|------------|---------|------------|-----------
desktop | lan       | 15ms    | 65.41|13.53
laptop | wlan       | 16ms    | 48.33|13.59
phone  | wlan       | 14ms    | 55.3M|15.40

So overall it seems like a nice speed (and latency) improvement. Not bad as a starting point for future experiments.

## Findings and Next Steps

The weak point of this setup seems to be the modem: the Huawei E3372 HiLink network mode might be the best for an easy setup, but I really would like to compare it with a "traditional" modem setup -- e.g., with an assigned IP address and no additional NAT being performed by the modem (through the fake network interface). Will look into that.

I believe I could further optimize the wireless (WLAN) settings to get more performance out of it --- but it already is good enough for my needs (and almost at the bandwidth offered by my mobile provider) so I won't spend time on that.

The setup is more power-hungry than the original OpenWRT-Setup. I did need to switch to a more powerful USB charger as I was keeping getting "Under-voltage detected!" errors on the Raspberry Pi. So I need an additional power-outlet when compared to the old setup. Bummer.

Performance seems to be better than with the under powered travel rooter -- no surprise here. Given that I now have more computing capabilities, memory and storage I will extend the basic router/access-point setup with additional functions. On my to-do list are:

* configuring a permanent [privacy focused VPN tunnel](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001), install docker on the Raspberry Pi and force a Container, e.g. providing BitTorrent functionality, to only use the VPN.
* perform some spam/advertisement filtering on the network level
* replace the "virtual network" modem with a "real" modem and check the network performance difference
* investigate some SmartHome/IoT solutions.
* Also, do something with the embedded Bluetooth receiver on the Raspberry Pi.

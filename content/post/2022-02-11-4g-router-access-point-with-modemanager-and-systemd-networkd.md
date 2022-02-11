---
layout: post
title: "Building a 4G/LTE router+accesspoint using hostapd, network-manager and modemmanager"
categories: ["Linux", "Tech"]
date: 2022-02-11
keywords:
- linux
- 4G modem
- access point
- lte
- linux
- raspberry pi
- hostapd
- bridge
---

So I've been using a [Raspberry Pi 4b+](https://amzn.to/3oHoPTL) together with a [WaveShare LTE Modem](https://amzn.to/34xLECl) as 4G router/access-point for my home network setup. I do like my hardware to be quiet and thus fan-less, alas the Raspberry Pi 4b+ gets a tad on the warm side. So this was a perfect opportunitiy to play around with an older [Raspberry Pi 3b+](https://amzn.to/3LqliTj) which should use approx. 20-25% less power (both, during idle and load) and with "new" software.

My [existing setup](https://snikt.net/blog/2019/07/05/lte-uplink-for-raspberry-pi-huawei-e3372-vs-waveshare-sim7600e-h/) was working fine, but I've read a lot about  [systemd-networkd](https://wiki.archlinux.org/title/systemd-networkd) recently, so this is a perfect time to try to use it. In addition, the shell script that was used to activate the 4G network interface always felt like a kludge, so let's try to do this in a cleaner way using [modemmanager](https://www.freedesktop.org/wiki/Software/ModemManager/) and [network-manager](https://wiki.archlinux.org/title/NetworkManager). During the setup I found out, that in the near future I might be able to cut out network-manager as systemd-networkd/modemmanager might be sufficient for my needs.

## network interfaces and target setup

What network interfaces do I have?

- `enxb827eb480c95`: wired network interface
- `wlan0`: my wireless interface
- `lo`: loopback
- `wwan0`: the add-on waveshare sim-7600e 4G modem

The goal is to create a software access-point using hostapd (which will be using the `wlan0` interface). The `wlan0` interface and the wired network interface should both be placed upon a software bridge (`br0`) so you can connect a client either through a ethernet cable or through the access-point. Both devices on the bridge should have the same local IP-address (192.168.111.1) and new clients should get a new IP-address through DHCP.

The 4G modem should automatically connect to my internet provider (T-Mobile) on startup and all connected devices should be able to access the Internet through the 4G modem.

## how to get to a simple network setup

To achieve my goal, I did the following steps:

- replace some services with systemd-provided services
- configure [hostapd](https://wiki.archlinux.org/title/software_access_point) to automatically create a soft access point using the embedded wireless card
- use `systemd-networkd` to create a bridge, assign all wired an the wireless (`wlan0`) interface
- configure the modem using `modemmanager`/`network-manager`. To simplify the setup I am using `network-manager` to configure the modem after it has been brought up by `modemmanager`, but future `systemd-networkd` releases [might be able to directly communicate with modemmanager](https://github.com/systemd/systemd/issues/20370). This should further reduce the memory usage (currently the running system has a RSS of 100mb, removing `network-manager` might remove a quarter of that)

## initial cleanup

I started with the Ubuntu 64bit Raspberry image and removed some stuff:

- removed `snapd`, not needed on a router
- removed `netplan.io`, as I will use `network-manager` and `systemd-networkd`
- removed `unattended-upgrades`
- removed `cron as` I rather would use systemd timed jobs
- removed `rsyslog` as I am fond of `journald`, and if there's no `cron` package installed `journald` will persist logs for me

I did have to install some other packages though:

- `modemmanager`, `network-manager` and `libqmi-utils` for managing my modem
- `bridge-utils` for managing and inspecting my network bridge
- `hostapd` for creating an access point
- `iptables` just in case

## Configure software access point (wlan0)

I already had a `hostapd.conf` but I did had to do some try-and-error to finally get `network-manager` and `wpa_supplicant` from not interfering with my access point configuration.

First, make sure that `wpa_supplicant` will not interfere:

~~~ bash
$ sudo systemctl disable wpa_supplicant.service
$ sudo systemctl disable wpa_supplicant@wlan0.service
~~~

To prevent `network-manager` from doing weird stuff I added my wireless interface to the "do not control this for me" list. I am using a vanilla `/etc/NetworkManager/NetworkManager.conf` (without any changes):

~~~ ini
[main]
plugins=ifupdown,keyfile

[ifupdown]
managed=false

[device]
wifi.scan-rand-mac-address=no
~~~

Notice that the `keyfile` plugin is enabled by default. I am using this to prevent network-manager from configuring my wireless card. To achieve this, I added the following as `/etc/NetworkManager/conf.d/unmanaged.conf`:

~~~ ini
[keyfile]
unmanaged-devices=interface-name:wlan0
~~~

Please notice that I explicitely declared `wlan0` as unmanaged-device (for network-manager).

Now I can just copy my old hostapd config over `/etc/hostapd/hostapd.conf`:

~~~ ini
# driver setup
bridge=br0
interface=wlan0
driver=nl80211

# country setup
country_code=AT

# a means 5 GHz
hw_mode=a
wmm_enabled=1

# auto select channel with least interference
# is channel=0 working?
channel=40
ieee80211ac=1
ieee80211n=1
ieee80211d=0
ieee80211h=0

# 802.11ac support

# basic setup
ssid=FieldsOfGlory
wpa=2
auth_algs=1
wpa_key_mgmt=WPA-PSK
wpa_passphrase=AndWatchingTheSkyTurnRed

# use AES instead of TKIP
rsn_pairwise=CCMP

require_ht=1
~~~

I am quite sure, that the configuration could be improved, but it works for now. Please note, that I am configuring `wlan0` as network interface (`interface=wlan0`) and instruct `hostapd` to put newly connected clients onto a bridge (`bridge=br0`). We will configure the bridge after we enabled hostapd (so that the access point automatically starts on bootup). To do enable hostapd we'll just use systemd:

~~~ bash
$ systemctl unmask hostapd
$ systemctl enable hostapd
~~~

Next: configure the bridge

## Configure a bridge using systemd-networkd

All systemd-networkd configuration can be found under `/etc/systemd/network`. For my setup we will use three cnofig files: one to create the bridge device, one to configure IPs for the bridge (and enable ip forwarding/routing) and one to add all wired interfaces to the bridge. Hostapd will add itself to the bridge (as this was configured through `bridge=br0` in its configuration file).

Lets start by creating a new bridge named `br0` in a config file named `00-br0.netdev`:

~~~ ini
[NetDev]
Name=br0
Kind=bridge
~~~

Prettry straight forward, the config file just contains the name that the bridge will use and that it's a bridge. Now lets add some IP configuration through the config file `00-br0.network`:

~~~ ini
[Match]
Name=br0

[Network]
Address=192.168.111.1/24
DHCPServer=true
IPForward=true
IPMasquerade=both

[DHCPServer]
PoolOffset=100
PoolSize=64
EmitDNS=yes
DNS=8.8.8.8
~~~

We initially "match" the ip config to `br0`, as in "let's configure our bridge br0". The network section is magic: through Address we configure our IP-address and network subnet. Using `DHCPServer=true` enables systemd-networkd internal DHCP server to serve clients (such as wired or wireless connected computers), we further configure the DHCP Server in the "DHCPServer" section (mostly pushing a DNS server and only allowing ips ranging from 100-164 so that there is no overlap with statically configured devices on my network). `IPForward=true` and `IPMasquerade=both` (you could also use `ipv4` instead of `both`) actually configured all ip forwarding and masquerading. So no manually added iptables rules this time.. this feels like magic.

Now lets add a simple rule to automatically add all wired devices to the bridge through `10-bind-en.network`:

~~~ ini
[Match]
Name=en*

[Network]
Bridge=br0
~~~

To be honest, I just wasn't able to remeber the full device name of the ethernet device, so I just added all devices starting with `en*` (which would also include eth0, etc.).

And that's it for systemd-networkd. Did I mention that this feels a bit like magic?

## ModemManager configuration

We will lookup and configure stuff through the command line tools `nmcli` and `mmcli`. Initially check if a modem was even found and enable it:

~~~ bash
$ mmcli --list-modems
    /org/freedesktop/ModemManager1/Modem/0 [QUALCOMM INCORPORATED] 0
$ sudo mmcli -m 0 -e
successfully enabled the modem
~~~

Not sure if this step was needed, but it's always a good idea to check if those pesky things are working before using them.

Now we'll do the easy way and use network-manager to configure a new connection, setup the APN ("internet.t-mobile.at") and configure the connection/device to automatically start on bootup:

~~~ bash
$ nmcli c add type gsm ifname '*' con-name tmobile apn "apn=internet.t-mobile.at,username=t-mobile,password=tm
$ sudo nmcli connection modify tmobile connection.autoconnect yes
$ sudo nmcli device set cdc-wdm0 autoconnect yes
~~~

## ..and reboot the system

And that's acutally it. Reboot the system (`systemctl reboot`) and hopefully your Raspberry Pi is now acting as an 4G internet router plus access point.

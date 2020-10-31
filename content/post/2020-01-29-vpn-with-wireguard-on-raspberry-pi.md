---
layout: post
title: "Building a simple VPN with WireGuard with a Raspberry Pi as Server"
categories: ["tech"]
date: 2020-01-29
keywords:
- linux
- raspberry pi
- vpn
- wireguard
---

Now that wireguard will be part of the upcoming Linux 5.6 Kernel it's time to see how to best integrate it with my [Raspberry Pi based LTE-Router/Access Point Setup](https://snikt.net/blog/2019/06/22/building-an-lte-access-point-with-a-raspberry-pi/).

## What is my scenario?

* Raspberry Pi 3 with a LTE hat, using a public IP address. This will be the VPN server (called _edgewalker_ in this post)
* An Android Phone that should use the VPN for all communication when connected
* An Linux Laptop that should use the VPN only accessing network services that are exposed to the VPN

Each device connected to the VPN should be able to connect to all other devices, e.g., my phone should be able to connect to a webserver running on the laptop as long as both are part of the VPN network. If setup is easy enough I'm actually thinking about adding my (Ethernet-connected) Desktop to the VPN too.

Given that wired and wireless connections seem to become more insecure over time ([Tailored Access Operations](https://en.wikipedia.org/wiki/Tailored_Access_Operations), [KRACK attacks against WPA2](https://www.krackattacks.com/) or [Dragonblood attacks against WPA3](https://arstechnica.com/information-technology/2019/04/serious-flaws-leave-wpa3-vulnerable-to-hacks-that-steal-wi-fi-passwords/)) I am seriously considering using wireguard for all my devices, regardless in which environment they are running.

## Server Setup

### Installing the Software

WireGuard provides [pre-compiled software packages](https://www.wireguard.com/install/) for most Linux Distributions, Windows and MacOS. Android and iOS applications are provided through the different app stores.

I am using the current Fedora Linux 31 and failed reading the fine manual. I searched for `wireguard-tools` packages, found and installed them. And then was wondering why nothing was working. Further investigation showed that I did not have the `wireguard-dkms` package installed (containing the network driver) and this package was not contained within my distribution repository.

Would I have read the manual I would have done the right steps:

~~~ bash
$ sudo dnf copr enable jdoss/wireguard
$ sudo dnf install wireguard-dkms wireguard-tools
~~~

On the Raspberry Pi I am using Raspbian Buster, this distribution already included the `wireguard` package, I installed it with:

~~~ bash
$ sudo apt install wireguard
~~~

On the Android Phone, I used the Google App Store to install the [WireGuard VPN Application](https://play.google.com/store/apps/details?id=com.wireguard.android).

### Key Setup

Wireguard utilizes a simple private/public key scheme to authenticate VPN peers. You can easily create VPN keys with the following command:

~~~ bash
$ wg genkey | tee wg-laptop-private.key |  wg pubkey > wg-laptop-public.key
$ wg genkey | tee wg-server-private.key |  wg pubkey > wg-server-public.key
$ wg genkey | tee wg-mobile-private.key |  wg pubkey > wg-mobile-public.key
~~~

This gives us three keypairs (and thus six files at all). We will not refer to those files within the configuration files but copy their content (which is just a single line which is the base64-encoded key) in the configuration files.

### Server Configuration

Configuration was quite easy, I just created the following file at `/etc/wireguard/wg0.conf`:

~~~ ini
[Interface]
Address = 10.200.200.1/24
ListenPort = 51820
PrivateKey = <copy private key from wg-server-private.key>
PostUp   = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o wwan0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o wwan0 -j MASQUERADE

[Peer]
# laptop
PublicKey = <copy public key from wg-laptop-public.key>
AllowedIPs = 10.200.200.2/32

[Peer]
# mobile phone
PublicKey = <copy public key from wg-mobile-public.key>
AllowedIPs = 10.200.200.3/32
~~~

Some notes:

* Please fill in the values from the created key files
* I am creating a VPN network that uses `10.200.200.0/24` for its internal IP range
* my server uses `wwan0` as external network interface in the `PostUp`/`PostDown`-Commands, please adapt that to use your network-facing interface (might be eth0)

It's easy to bring the VPN network up with the following command:

~~~ bash
$ sudo wg-quick up wg0
~~~

One small thing: I am using `dnsmasq` as DNS server and have bound it to the network interface `br0`. This will be too restrictive for serving DNS requests from connected VPN devices so I added the `wg0` wireguard Ethernet devices to the allowed device list. In dnsmasq you do this by adding a new config line to `/etc/dnsmasq.conf` with the network interface, e.g.:

~~~ conf
interface=br0
interface=wg0
~~~

In addition I've added some iptable rules to allow traffic to the listening UDP port (51280):

~~~ bash
$ sudo iptables -I INPUT -p udp --dport 51820 -j ACCEPT
~~~

Now that everything works, we can utilize systemd to automatically start the VPN tunnel:

~~~ bash
$ sudo systemctl enable wg-quick@wg0.service
~~~

## Client Setup

### Client configuration on the Laptop

Mostly the Laptop setup consists of creating a matching configuration file in `/etc/wireguard/wg0.conf` on the Laptop:

~~~ ini
[Interface]
Address = 10.200.200.2/24
PrivateKey = <copy private key from wg-laptop-private.key>

[Peer]
PublicKey = <copy public key from wg-server-public.key>
AllowedIPs = 10.200.200.0/24
Endpoint = edgewalker:51820
~~~

Some notes:

* edgewalker should be the public IP-address or public hostname of the VPN server
* By setting `AllowedIPs` to `10.200.200.0/24` we are only using the VPN for accessing the internal VPN network. Traffic to all other IPs/servers will still use the "normal" public internet. Also the pre-configured DNS-Server on the Laptop will be used.

We can use the same `wg-quick` and `systemd` commands for testing as well as for automatic connection setup:

~~~ bash
$ sudo wg-quick up wg0
$ sudo systemctl enable wg-quick@wg0.service
~~~

### Client configuration on the Android Phone

We use a very similar configuration file for our Android phone. We prepare the following file (let's call it `mobile.conf`) on the server through ssh:

~~~ ini
[Interface]
Address = 10.200.200.3/24
PrivateKey = <copy private key from wg-mobile-private.key>
DNS = 10.200.200.1
        
[Peer]
PublicKey = <copy public key from wg-server-public.key>
AllowedIPs = 0.0.0.0/0
Endpoint = edgewalker:51820
~~~

In contrast to the laptop setup we are forcing the mobile device to use our VPN server as DNS server (that's the `DNS` setting) as well as using the newly VPN tunnel for all traffic (by using `0.0.0.0/0` as wildcard for `AllowedIPs`).

It would be tedious to copy this configuration file onto a mobile device, so we convert it into a QR code:

~~~ bash
$ sudo apt install qrencode
$ qrencode -t ansiutf8 < mobile.conf
~~~

This outputs an ASCII QR-Code on the console. This code can be scanned from within the Android VPN application and automatically setups the VPN tunnel.

## Conclusion

WireGuard's configuration is just magic when compared to similar OpenVPN setups..

---
layout: post
tags: ["security", "linux", "network"]
title: Revising my lazy http/https interception setup
description: "Lazily creating an HTTP/HTTPS interception proxy with network-manager and mitmproxy"
date: 2018-11-23
---

I've wrote about about creating a simple wireless (WLAN for us right-pondian) http/https interception setup before. Mostly I'm using this as a first step when testing mobile/desktop applications.

Linux' network-manager is perfectly able to create an software access-point with most modern network cards. Alas GNOME's configuration tool only allows for the creation of ad-hoc networks (and switching to KDE for just this is a bit overkill for me) so you have to setup the access point on the command line with *nmtui* or *nmcli*. In this example I will show how to create the interception setup with the latter.

# Identify the Wireless Network Card

First of all we need to identify our wireless network interface that we are going to use. For that you can just call *nmcli* and search it in the detailed list of network interfaces or call *nmcli dev* and search for *wifi* interfaces:

~~~ shell
$ nmcli dev | grep wifi
wlp61s0     wifi      connected     lalala
~~~

As my laptop has only a single wireless card, I store this in a variable:

~~~ shell
$ capturing_interface=$(nmcli dev | grep wifi | cut -f 1 -d \ )
~~~

# Enable the Software Access Point

Now we're using *nmcli* to create a new software access point with ssid "interceptingAP" (so that hopefully noone connects accidentially) and with an password of "trustno1". Fun fact: always create your capturing network with passwords, otherwise innocent bystanders will connect. Or so I hear.

Note that we need root access rights to create the access point. If you know your wireless device name you can just pass it instead of *$capturing_interface* :

~~~ shell
$ sudo nmcli dev wifi hotspot ifname $capturing_interface \
                    ssid interceptingAP password trustno1
Device 'wlp61s0' successfully activated with '97b03a23-5470-4b09-9f2a-d20b05c4b111'.
~~~

# Setup the Listening Proxy

Now we can setup our proxy software. Last time I was using BURP (which I still prefer). If you're using BURP there are some configuration steps that you need to take care of (all in the proxy tab):

* in the intercept sub-tab disable "intercept is on" so that messages get forwarded automatically by the proxy
* in the options sub-tab, edit the proxy listener and set "bind to address" from "loopback only" to "all interfaces" and enable "support invisible proxying (enable only if needed)" in the "request handling" tab

This time I want to try a new tool, [mitmproy](https://mitmproxy.org/). This tool works on the command line (also provides a web interface) so it would be well suited for a headless setup, e.g., using a Raspberry Pi.

[Download](https://mitmproxy.org/downloads/) and install the latest version, this was 4.0.4 during writing of this guide.

Start the proxy:

~~~ shell
$ mitmproxy --mode transparent --showhost
~~~

# Forward Http(s) Traffic

Almost done, now we just need some iptables rules to transparently forward potential web traffic to our intercepting proxy software. this time we will forward ports 80 and 443 for IPv4 and IPv6:

~~~
# forward port 80 (http)
$ sudo iptables -t nat -A PREROUTING -p tcp --destination-port 80 -j REDIRECT --to-ports 8080
$ sudo ip6tables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080

# forward all https traffic too (port 443),
$ sudo iptables -t nat -A PREROUTING -p tcp --destination-port 443 -j REDIRECT --to-ports 8080
$ sudo ip6tables -t nat -A PREROUTING -p tcp --destination-port 443 -j REDIRECT --to-ports 8080
~~~

Now we connect (in my case I will just use my mobile phone to connect to the access point) and browse to some website.

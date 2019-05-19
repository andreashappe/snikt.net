---
layout: "post"
categories: ["linux", "security"]
title: Rogue Access Point and SSL Man-in-the-Middle the easy way
description: "How to setup an rogue access point and do ssl interception using KDE and BURP"
keywords: "SSL TLS mitm rogue accesspoint ap security netsec"
aliases:
  - /blog/2014/02/24/rouge-ap-and-ssl-mitm
date: 2014-03-20
---

After I've tried [setting up a rogue access point using squid and hostapd](http://snikt.net/blog/2014/01/26/transparent-ssl-proxy-with-squid/) I've seen that KDE's network-manager offers host access-point functionality. How easy is it to combine this with BURP for an SSL man-in-the-middle attack? Well some GUI clicking and 3 command line invocations..

<!-- more -->

## The Hardware

I bought two USB 802.11n wireless adaptorts on [deal extrem](http://dx.com), so far both of them work as an access point:

* [a small whitish one](http://dx.com/p/dx-original-mini-nano-usb-2-0-ieee802-11n-b-g-150mbps-wi-fi-wlan-wireless-network-adapter-white-256382#.UwtXYtuVuCw) for $5.55, perfect for working "undercover". This was supported by a standard Ubuntu 13.10 installation.
* [a larger one](http://dx.com/p/edup-ep-ms150n-150mbps-mini-usb-wireless-network-lan-card-adapter-w-antenna-black-243861#.UwtXQNuVuCw) for $8.92, should have a better reception as it has an antenna (you see that I'm a software guy). Be aware that you'll need a recent Kernel for this version, Kernel 3.13 in the upcoming Ubuntu 14.04 supports it.

## Setting up the Hardware

Hostap was rather hard to setup, how is KDE faring? You can add a new "Wireless (shared)" network connection within the network manager (this was done with the network-manger in KDE 4.12, KDE 4.13 looks similar).

First of all setup the wireless network:

![](/assets/2014-nm-ap-ssl/network_manager_1.png)

Then make sure that IPv4 is enabled and shared (you can disable IPv6 BTW):

![](/assets/2014-nm-ap-ssl/network_manager_3.png)

For bonus points, you can automatically use an anonymous VPN service for all outgoing traffic:

![](/assets/2014-nm-ap-ssl/network_manager_2.png)

And that's it on the access point side.

## Setting up BURP

[BURP](http://portswigger.net/burp/) supports SSL MitM-Operation out-of-the-box. You just have to start it, by default it listens on Port 8080 (BTW: I'm using the command line parameter to force usage of IPv4, don't know but Java always binds on IPv6 addresses on my network):

~~~ bash
 $ java -Djava.net.preferIPv4Stack=true -jar burpsuite_free_v1.5.jar
~~~

After BURP starts navigate to it's proxy's history where you will see all captured requests after the final configuration step:

![](/assets/2014-nm-ap-ssl/burp.png)

It's also quite interesting how much background traffic an Android phone makes. I can't believe that sending data periodically every 5 minutes is the best thing ever for my battery.

## Use iptables to forward traffic to BURP

Now that we have an access-point and an listening interception proxy we just need to forward traffic from the former to the latter. I'm just forwarding all traffic, an attacker might only forward http (port 80) and selected https (port 443) connections to the interception proxy. To forward one port just use the following iptables script:

~~~ bash
# forward port 80 (http)
$ iptables -t nat -A PREROUTING -p tcp --destination-port 80 -j REDIRECT --to-ports 8080

# forward all https traffic too (port 443),
$ iptables -t nat -A PREROUTING -p tcp --destination-port 443 -j REDIRECT --to-ports 8080
~~~

And that's it.

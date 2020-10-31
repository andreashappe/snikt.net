---
layout: post
title: "Adding advertisement-filtering and spotify support to a Linux-based Access Point/Router"
categories: ["tech"]
date: 2019-12-08
keywords:
- linux
- spotify
- advertisement filtering
- raspberry pi
---

The last weeks I've tried to improve upon my [Raspberry Pi based LTE-Router/Access Point](https://snikt.net/blog/2019/06/22/building-an-lte-access-point-with-a-raspberry-pi/). Normally I would heave tons of software on it, try it out and let it simmer on. I did that this time too: the ELK-Stack (too little memory) and [HomeAssistant](https://www.home-assistant.io/) (too little SmartHome-devices in my flat) only had a short intermezzo on this hardware. What stuck?

Before that a small note: originally I was using a [IKEA USB charger](https://www.ikea.com/de/de/p/koppla-ladegeraet-mit-3-usb-ausgaengen-weiss-20415027/); its spec should be sufficient but I kept getting "Undervoltage detected" error messages in dmesg/syslog. I switched it out my Xiaomi Phone's USB charger: the warnings disappeared.

## Adding Spotify-Support

As the Raspberry has an Audio Out socket, I've added [spotifyd](https://github.com/Spotifyd/spotifyd). This allows me to use it as an audio sink/speaker from within the Android Spotify app.

Setup was quite easy:

* Install spotifyd according to [the provided documentation](https://github.com/Spotifyd/spotifyd/wiki/Installing-on-a-Raspberry-Pi)
* Configure spotifyd to automatically get started by systemd (same documentation)
* Configure it with your spotify id (I used Facebook Login for spotify, [this is the easiest way to retrieve the id I've found](https://community.spotify.com/t5/Accounts/how-do-i-find-my-spotify-user-id/td-p/665532))
* Connect the Audio-Out to the AUX-IN of my stereo system.

More less this removed my need for having an Amazon Alexa Echo standing around. One always powered-on device less.

## Do some lightweight Advertisement-Filtering for connected devices

Yeah, I know there's [pi-hole](https://pi-hole.net/) but I prefer simple solutions. I found a [DNS-Blacklist](https://github.com/notracking/hosts-blocklists) with known-advertisement sites, the basic idea is to configure this on my Raspberry Pi; it will remove all requests for known advertisement and tracking sites from clients' requests, e.g., from my Desktop or my mobile devices. I still use [uBlock Origin](https://addons.mozilla.org/de/firefox/addon/ublock-origin/) and [Privacy Badger](https://addons.mozilla.org/de/firefox/addon/privacy-badger17/) on my clients, at least the Raspberry Pi setup should lighten their work load. To set up:

Create a new Directory /var/cache/black_list:

~~~ bash
$ mkdir -p /var/cache/dns_blacklists
~~~

Download the blacklists:

~~~ bash
$ cd /var/cache/dns_blacklists
$ wget https://raw.githubusercontent.com/notracking/hosts-blocklists/master/hostnames.txt
$ wget https://raw.githubusercontent.com/notracking/hosts-blocklists/master/domains.txt
~~~

Configure dnsmasq to use this blacklists by adding the following lines to `/etc/dnsmasq.conf`:

~~~
conf-file=/var/cache/dns_blacklist/domains.txt
addn-hosts=/var/cache/dns_blacklist/hostnames.txt
~~~

Restart dnsmasq (`systeemctl restart dnsmmasq`). Voila! Be sure to re-download the blacklist periodically and restart dnsmasq afterwards.

## Potential next steps

What's up next? As soon as I am back to the default kernel (damn you, raspberry-update) I will add WireGuard VPN functionality to the Raspberry Pi Setup. Sometimes I also feel like replacing the Raspbian Distribution with something more akin to my line of work, e.g. Kali Linux. Maybe investigate if I can directly stream Netflix videos to my computer stream and thus reduce the need to power-up my desktop.

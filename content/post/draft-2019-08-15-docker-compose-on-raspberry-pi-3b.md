---
layout: post
title: "Building a secure torrent download station by combining Private Internet Access (PIA), OpenVPN and transmission through docker-compose on a Raspberry Pi 3b+"
categories: ["tech"]
date: 2019-06-30
keywords:
- linux
- raspberry pi 3b+
- bridge
- docker compose
draft: true
---

Now that I have a [Raspberry Pi Access Point/Router setup](https://snikt.net/blog/2019/06/22/building-an-lte-access-point-with-a-raspberry-pi/) with some memory to spare, I wanted to use it for some network-related tasks. Sometimes I want to work on client assignments (penetration-tests) from home, if I do that I am using my company VPN so that all traffic is routed thorugh their public IP address (which is white-listed by the client). I do not want for traffic to ever leave that VPN as that would look like as if I'd be performing cyber attacks from my private home IP address. The same requirements arise for different use-cases, e.g., when downloading bittorrent files or forcing traffic through the [tor network](https://www.torproject.org/) if whistle-blowing.

To achieve a secure setup I want to combine the following:

* my existing [Raspberry Pi setup](https://snikt.net/blog/2019/06/22/building-an-lte-access-point-with-a-raspberry-pi/)
* a [Private Internet Access](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) VPN tunnel -- this hides (or should hide) my identity. You can replace that with your company or tor proxy for the other use cases.
* the software that should run through/behind the VPN. To improve reusability I will setup [docker-compose](https://docs.docker.com/compose/) on my Pi and connect a containter with a bittorrent downloader through that VPN.

# Setup Docker-Compose

Let's [install the community edition of the docker-engine](https://docs.docker.com/install/linux/docker-ce/debian/#install-using-the-repository) first (the docker version contained within the Raspbian image is too old to be usable for us):

~~~ bash
$ sudo apt-get install apt-transport-https ca-certificates curl gnupg2 software-properties-common
$ curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -
$ sudo apt update
$ sudo apt upgrade
$ sudo apt intall docker-io
~~~

Now install docker-compose on the raspberry pi:

~~~ bash
$ sudo apt install docker-compose docker.io
~~~

And finally, we can install the [Transmission Web container](https://hub.docker.com/r/linuxserver/transmission/)

# Connect the download container to the VPN

Voila! I hope you can adopt the same pattern for your use-cases.

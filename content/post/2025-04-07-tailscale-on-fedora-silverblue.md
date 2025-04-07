---
layout: post
title: "Using tailscale on Fedora Silverblue"
categories: ["Linux", "Tech"]
date: 2025-04-07
keywords:
- linux
- tailscale
- overlay network
---

I am using [Fedora Silverblue](https://fedoraproject.org/atomic-desktops/silverblue/) as one of my main desktops. Recently, I've been [moving some services to a server behind tailscale](https://snikt.net/blog/2025/04/05/building-a-little-home-server-with-linux-tailscale-protonvpn-docker-compose-and-vm-support/) but was still using its local IP address when at home at my Silverblue desktop. While doable, using an IP-address with an invalid HTTPS certificate wasn't that pretty --- so why not just access it through tailscale even within the same network, it's an overlay network overall (so it should do a direct connection between my desktop and the home-server).

But how to do this on silverblue? The documentation was lacking in this regard. This is what did it for me:

```bash
# add tailscale package to the root filesystem
$ sudo ostree remote add tailscale https://pkgs.tailscale.com/stable/fedora/tailscale.repo
$ sudo rpm-ostree install tailscale

# reboot
$ sudo reboot

# now register the device into the tailnet
$ sudo systemctl enable --now tailscaled
$ sudo tailscale up

# there will be an URL displayed, use it to add the device to the tailnet.
# after you registered it, it will automatically connect everytime
# you reboot.
```

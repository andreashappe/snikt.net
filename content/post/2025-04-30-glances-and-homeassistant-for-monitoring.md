---
layout: post
title: "Homeserver: Glances and Home Assistant for Monitoring"
categories: ["Linux", "Tech"]
date: 2025-04-30
keywords:
- linux
- server
- glances
- homeassistant
- monitoring
---

Now that I have a [minimal home server running](https://snikt.net/blog/2025/04/05/building-a-little-home-server-with-linux-tailscale-protonvpn-docker-compose-and-vm-support/), I thought it would be good idea to monitor temperature, disk usage and such. The simplest solution that I found was to use [Glances](https://nicolargo.github.io/glances/en/index.html) and use Home Assistant to store and display the data.

<!--more-->

## Glances (on the homeserver)

Thisis actually quite simple. Just install Glances on the server:

```bash
$ sudo apt install glances
```

To make the glances integration for Home Assistant work, you need to run Glances in web server mode. It seems that the default debian package is broken (and does not have all the style/javascript files needed). You can fix this, by manually installing those files:

```bash
$ sudo sh -c 'wget -O - https://github.com/nicolargo/glances/archive/refs/tags/v$(glances -V|cut -zd" " -f2|tr -d v).tar.gz | tar -xz -C /usr/lib/python3/dist-packages/glances/outputs/static/ --strip-components=4 --wildcards glances-*/glances/outputs/static/public/'
```

Now, let's add a simple systemd service to run Glances in web server mode:

```ini
```ini
[Unit]
Description=Glances
After=network.target

[Service]
ExecStart=/usr/bin/glances -w --bind 0.0.0.0
Restart=always
RemainAfterExit=no

[Install]
WantedBy=multi-user.target
```

Save this file as `/etc/systemd/system/glances.service` and enable it:

```bash
$ sudo systemctl enable glances
$ sudo systemctl start glances
```

Now you can check if Glances is running by going to `http://<your-server-ip>:61208` in your browser. You should see a web interface with all the system information.

## Home Assistant Integration

This is easy: just go to <https://www.home-assistant.io/integrations/glances/> and follow the instructions to enable the integration and point it to your configured glances server. You already did all the hard work in the previous step, so this should be easy.

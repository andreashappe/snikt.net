---
layout: post
title: "Building a little home-server with Linux, TailScale, ProtonVPN, Docker Compose and VM support"
categories: ["Linux", "Tech"]
date: 2025-04-05
keywords:
- linux
- homeserver
- tailscale
- overlay network
- proton-vpn
- docker-compose
- cockpit
---

I've been using a mini-computer as home-server for the last couple of years. Originally, I used it to share files between my computers, but over time more and more services (like RSS-readers, media-libraries, home automation, etc.) were moved on that surprisingly capable mini-server.

I've grown up using Linux (well, I was already 16 when Linux became available around here, but you get the gist) so it always felt natural to me to just just use a minimal Linux installation (debian) instead of using some NAS that supports add-on third-party software.

I never got to automating my server-setup but to be honest, doing some system administration is relaxing to me and I do not plan of setting up the system a second time, so there's no need to move everything to ansible. But I need to document my setup, in case the hardware dies on me.. and thus this initial blog post.

This will deal with the basic system setup and not detail the services running on the mini-server. This will part of another blog post in the future.
## Hardware

So, let's start with the obvious part: the used hardware. I do like to use some sort of mini-pc, as typically they are quiet and small (and thus are not an eye-sore within my flat). What hardware requirements do I have?

- Processing-wise, I want something with 4+ x86 cores. This is mostly due to me wanting to use [HomeAssistant](https://www.home-assistant.io/) to replace some of my Ikea/etc. base-stations. Sadly, using HomeAssistant in a VM [requires 2vCPUs, 32GB storage and 2GB memory](https://www.home-assistant.io/installation/linux#create-the-virtual-machine). Related to this, I prefer to have at least 8GB memory, preferably updatable so that I can plug in old laptop or desktop memory modules. I prefer x86 due to compatibility reasons, esp. when using containers.
- Storage: I would prefer to use a single system-drive (either eMMC or SSD) and at least 2 mirrored data storage drives. I prefer to use SSDs, mostly for noise reasons (they don't emit noise). Storage-wise, I would be good with 1TB of storage, so the cost for SSDs would be neglectable (and I can reuse existing drives too).
- I would prefer to use a passively cooled system, but this is rather unrealistic. So there will be fans --- which should be controllable and preferably be standard-size fans so that I can easily replace them if they fail or become louder (the fans should be the only movable part of the system).
- Network: wired-connection, at least 2.5Gbit/second. A wireless interface would be nice, but is not really required.
- Power-Supply: I prefer using usb-c power-deliver (PD), as I have more than enough usb-c chargers lying around.
- Secure Boot: having UEFI SecureBoot and MeasuredBoot would be nice as this would allow me to verify that nobody has tampered with the hardware (or drives) while I have been away (not really part of my threat model, but I like to tinker with things).
- USB: at least 2 free USB orts (zigbee stick for HomeAssistant, external USB backup hard drive)
### Current System

So what am I currently using?

| Component/Area | Current System                                                       | Improvement?                          |
| -------------- | -------------------------------------------------------------------- | ------------------------------------- |
| System         | [Latte Panda 3 Delta](https://www.lattepanda.com/lattepanda-3-delta) | -                                     |
| CPU            | Intel N5105 (4 cores), ~2021                                         | -                                     |
| RAM            | 7688m available, non-upgradable                                      | not upgradeable                       |
| Storage        | 64GB eMMC (system),<br>1x NVMe PCIe 3.0 x2                           | 2x NVMe RAID for data would be better |
| Cooling System | proprietary cooler, getting louder                                   | standard cooler                       |
| Power-Supply   | works with USB-C PD                                                  | -                                     |
| Network        | 1x 2.5 Gbit/sec, Wifi6, BT 5.2                                       | -                                     |
| USB            | 3x, but zigbee does not work if I connect an NVMe SSD over USB       | -                                     |

I am not 100% happy with this hardware (esp. the lack of a second hard-drive to do a RAID mirror) and UEFI SecureBoot is not well supported. But it works for now, I will take better care the next time I buy new toys. What would be interesting alternatives?

- [GMKtec G9](https://amzn.to/3FYPnLK): this mini-PC supports 4 NVMe SSDs for storage, while also providing a 64GB eMMC as a system drive. Speed might not be perfect (too few PCIe lanes for driving the SSDs) but that shouldn't be a problem. Uses USB-C as power supply and comes with 12 GB memory. Looks nice!
- [Aoostar R1](https://amzn.to/3GaxrgU): this mini-PC supports a NVMe system drive and 2 3.5" data drives. I don't like this too much due to noise, but might be interesting for others. Power supply over USB-C, memory can be upgraded to 16/32GB.
## Basic System Setup

For the basic system setup, I just connect a HDMI display and a USB keyboard, install a standard [minimal debian image](https://www.debian.org/CD/netinst/) and install it. I know, using a pre-configured image or doing it over a serial interface might give me more nerd-credits but I sometimes like doing manual stuff. 

For the system drive I use the slow eMMC drive, but as the system drive will not contain any real data or services, that's not problematic.

I do not install any graphical interface (not needed) and typically login over SSH as soon as the network setup is done. Make sure to enable the `SSH server support` during installation.

I will be using `meltingpot.social` as an URL for my server throughout this document. Only reason for this name was that I had the domain name already registered and lying around without really using it. As the system itself is not exposed to the public internet, you can try to access it, but you will get a connection error.
### SSH (d'oh) and TMUX

Some basic tooling that I like to install:

- `vim-nox` as the de-facto standard shell editor
- `tmux` as this allows me to start `docker` (or `docker compose`) containers interactively and then use `ctrl-b d` to "detach" from my tmux session (which keeps running in the background). The next time I want to check what the containers are doing, I SSH into the machine again and use `tmux attach`. I know that `docker compose` in background mode would automatically start all containers during system boot, but I like seeing the current state.

So do something like:
```bash
$ sudo apt install tmux vim-nox
```
### Reverse HTTPS proxy: nginx

Every time you start a service through docker, the service will be exposed through a network port, e.g, `jellyfin` might be on port `8280`, `cockpit` might be on port `9090`, gitea on some other port, etc. This is not very user-friendly.

Another problem: if you want to have secure connections, you would need to setup a HTTPS certificate for each port (with differing configurations for the respective service). This is tedious.

Instead I use a `nginx` proxy (`sudo apt install nginx`) as entry point to the system. This also allows me to configure a single HTTPS certificate for the nginx proxy which then will be used for all services. Each single service will be available through an URL, e.g. `https://meltingpot.social/jellyfin` or `https://meltingpot.social/tt-rss`.

For HTTPS certificates I am using [Let's Encrypt](https://letsencrypt.org/) as they are offering free certificates. As our mini-server will not be exposed to the public internet, we cannot do the typical domain validation --- but we can use the DNS-based protocol through using `certbot`. To do this, your DNS provider must support API access to your DNS settings. I was lucky, as I am using [CloudFlare](https://www.cloudflare.com/) which fully supports this.

Initially, you have to create the API key. With cloudflare, you can do this at [the admin panel]( https://dash.cloudflare.com/profile/api-tokens). As I have multiple domains, I made sure to only allow the API key to alter the `meltingpot.social` domain and only gave it `DNS:edit` permissions. Throughout the rest of the document I will use `CF-API-KEY` as API key, replace this with your concrete API key.

Now install and configure `certbot`:
```bash
$ echo 'CF-API-KEY' > ~/cloudflare-credentials
$ sudo apt install python3-certbot-dns-cloudflare python3-certbot-nginx
$ sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/cloudflare-credentials -d meltingpot.social -n

# now you should have your SSL certificates within /etc/letsencrypt/live

$ sudo ls /etc/letsencrypt/live/meltingpot.social
cert.pem  chain.pem  fullchain.pem  privkey.pem  README
```

certbot should auto-update the certificate before it runs out.. not sure if this will work, but I will update the document if there are problems with that.

Now, we only have to setup nginx through `/etc/nginx/sites-enabled/default`:

```config
server {                                                             
    # SSL configuration, also only listen on HTTPS (port 443)
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name meltingpot.social;

    # exchange this with the path to your certificates
    ssl_certificate /etc/letsencrypt/live/meltingpot.social/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meltingpot.social/privkey.pem;

    # setup root directory, only allow static files for now
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;        
}
```
## Storage Setup

Ah.. the storage setup. I am quite unhappy with it. The system drive is contained on the unencrypted eMMC storage while I have an encrypted NVMe drive for data.

Why am I not happy?
- There is no automatic mirroring set up, as I can only plug in a single drive. So no RAID for me. This is something that I plan to improve with the next mini-server. I do periodic manual backups with `rsync` to an encrypted USB drive, but this still feels a bit unsafe.
- No automatic mounting of the encrypted drives. The problem is how to get the encryption key/password for the data drives. I do not want to store the key directly on the unencrypted system drive, as this could easily be read. I also cannot encrypt the system drive, as then I would need to enter the password during bootup (and I have no keyboard/display connected to the server).

So basically I have an encrypted drive that I have to connect manually after each boot. Sub-optimal, but on the other hand, it's not like that you reboot every week, so it's okay.

To setup the drive, I was using good old `cryptsetup`, i.e.:

```bash
# enter a secure password
$ sudo cryptsetup luksFormat /dev/nvme0n1
$ sudo cryptsetup luksOpen /dev/nvme0n1 data
$ sudo mkfs.ext4 /dev/mapper/data
$ sudo cryptsetup luksClose data
```

After each boot, I unencrypt and mount the data volume:

```bash
# enter the password..
$ sudo cryptsetup luksOpen /dev/nvme0n1 data
$ sudo mount /dev/mapper/data /media/data
```

Also there is no UEFI SecureBoot with this device, so if the attacker has physical access to a turned-off device, they could place a key-logger or backdoor on the system partition (and watch me unlock the crypto-partition). Nothing I can do with the current hardware against this. Good thing, that my threat model does not include `evil maid` attacks.
## Network Setup

My network is connected through the wired 2.5gbit/sec connection (directly to my 5g modem/access-point as I do not have any other wired connections). When it comes to the network setup, there are actually two distinct things:

- anonymous internet connection (uplink): this protects me against a potentially malicious internet provider. I am also using [Proton Business](https://go.getproton.me/SH1Um) for my emails, so I have their VPN connection anyway.
- overlay network: this allows me to connect to the home-server through a VPN without having to expose the home-server to the internet.
### Anonymous Internet-Connection: Proton VPN

I found [Proton VPN](https://go.getproton.me/SH1Um) to be easiest to setup: just go to the [VPN wireguard section](https://account.proton.me/u/3/vpn/WireGuard), select 'Linux' as operating system and press `create`. You will automatically download a new wireguard configuration file. Rename this to `proton.conf` and upload it to `/etc/wireguard` on the miniserver.

You can now auto-start this VPN by adding it to systemd:

```bash
$ sudo systemctl enable wg-quick@proton
$ sudo systemctl start wg-quick@proton
```

And you should be done. This is not a highly-secure setup, e.g., you have no kill-switch in place: if the VPN service fails, you will not use a secure VPN connection. So don't use this for filesharing, etc.
### Overlay Network: TailScale

For the overlay network, I am using [TailScale](https://tailscale.com). This allows me to connect from anywhere to the mini-server (as long as you have installed the TailScale client, which I've done on both Linux as well as on my Android devices). In addition, this should be a peer-to-peer network, so if I am in the same network as the server, TailScale creates a direct encrypted connection and does not proxy all communication over some internet server.

If you want to self-host your VPN, you might want to look into [HeadScale](https://headscale.net/stable/). This is an OSS TailScale compatible server. With this, you could replace the TailScale server with a self-hosted HeadScale server while keeping all the TailScale VPN client software on your devices.

Install TailScale [according to the docs](https://tailscale.com/kb/1174/install-debian-bookworm), basically:

```bash
$ curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
$ curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
$ sudo apt-get update
$ sudo apt-get install tailscale
$ sudo tailscale up

# get your IP addres
$ tailscale ip -4
```

Tailscale has the nice feature that it's client IP addresses are persistent: so you can take the IP address that the last command lists and just add it to a DNS record to easily connect to your server over the tailscale network (in my case, that would be `meltingpot.social`)
## Service Infrastructure Setup

This section details the steps needed to allow for hosting Virtual Machines (for HomeAssistant) as well as docker images through `docker compose`
### Docker Compose

I like docker compose, alas debian has a rather outdated version of it installed. Update it according to [docker's documentation](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository):

```bash
# Add Docker's official GPG key:
$ sudo apt-get update
$ sudo apt-get install ca-certificates curl
$ sudo install -m 0755 -d /etc/apt/keyrings
$ sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
$ sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
$ echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
 sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
$ sudo apt-get update
$ sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# also add your user (andy in my case) to the docker group
$ sudo usermod -a -G docker andy

# start everything
systemctl enable docker
systemctl start docker
```
### Virtual Machines/Cockpit

Sadly HomeAssistants runs best within a virtual machine so we should prepare for that. I like to use [cockpit](https://cockpit-project.org/) which is a web based configuration interface for servers (also includes web-based shell, etc.). Originally used by RedHat, it is also easy to enable on debian:

```bash
$ sudo apt install cockpit, cockpit-bridge, cockpit-machines, cockpit-system
```

Now you should be able to access cockpit on port `9090`. Remember, that we wanted to use nginx to not have to remember all those ports? Lets provide access to cockpit through `https://meltingpot.social/dashboard`. I found out the hard way that you cannot use `/cockpit` to mount cockpit. This is mentioned in its man-page but it took me long to see this..

To  configure cockpit to use the sub-directory, we have to create the following configuration file in `/etc/cockpit/cockpit.conf` (please note that you have to put in your domain name in the configuration file):
```
[WebService]
Origins = https://meltingpot.social wss://meltingpot.social
ProtocolHeader = X-Forwarded-Proto
UrlRoot=/dashboard
```

We will also add this to the `nginx` configuration so that we can easily access it through `/dashboard` by adding the following to `/etc/nginx/sites-enabled/default`:

```
server {

	# existing configuration...

    location /dashboard/ {
        # Required to proxy the connection to Cockpit
        proxy_pass https://127.0.0.1:9090/dashboard/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
            
        # Required for web sockets to function
        proxy_http_version 1.1;   
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Pass ETag header from Cockpit to clients.
        # See: https://github.com/cockpit-project/cockpit/issues/5239
        gzip off;
	}
}
```

## Next Steps

And that's it for now. With this setup we have now a little home-server that uses an encrypted drive for data, is accessible from everywhere through the overlay network, uses a privacy-enhancing VPN when connecting to the outside world, and is prepared to host both Virtual Machines as well as Containers:

- [Services used on this device](https://snikt.net/blog/2025/04/09/homeserver-services-pt.-1/): gitea, audiobookshelf and tt-rss
---
layout: post
title: "Trying my hand with hacking Active Directories with responder, mitm6, ntlmrelayx and crackmapexec"
categories: ["Security"]
date: 2022-10-12
keywords:
- windows
- security
- active directory
- wireguard
- crackmapexec
- responder
- ntlmrelayx
---

So a customer of mine thought about ordering a Red Team Assessment and wanted me to go through their local network beforehands --- no need to make it too easy for the red teamers. The customer's network was a typical windows network, dated but kept up to date by two admins. Microsoft Defender was rolled out at all clients, and one some servers. A laptop with Kali Linux was connected to the local network, this was my starting point.

So the meta-data for this project were:

- root access to a kali linux laptop
- I did create a free Azure VM with wireguard to have a backup connection to the local laptop
- stealth was not required, the blue team was highly involved
- me: not too much experience with windows networks, I am rather doing app- or web-sec

Result: three to four hours later I was domain admin.

## Network Vulnerability Scan

As stealth was not mandatory, I installed [greenbone security](https://www.greenbone.net/en/) security assistant on linux:

~~~ sh
$ sudo apt install openvas
$ sudo gvm-setup
$ sudo gvm-check-setup
~~~

The initial update failed as some perimeter firewall blocked access to the greenbone community vulnerability database. As it was just an IP block, I routed the IP over the existing wireguard tunnel: problem solved. Thinking of which, in future assignments I might just route all external traffic through wireguard.

Please write down the admin password which will be output on the console

The initial setup still took more than one hour. While not being problematic at all, a problem was that the softwar did not give any reasonable feedback. It just looked as if the setup failed and I wouldn't be able to connect to localhost:9392. When looking at the htop output I saw that gasd (greenbone) and the postgresql were using almost 100% of the available CPU resources, so I just waited until that CPU storm died down and restarted the scanner.

Another problem was that the web-interface was bound to localhost and there seemed no easy one-step configuration option to switch this to 0.0.0.0. As this was a throw away setup, I just SSH port-forwarded port 9392 (over the wireguard connection) to my local desktop and accessed the scanner over this.

Started the scan, took around 24h to complete (customer hat four /24 networks). Afterwards I exported all the scans as xml and csv files for analysis. The Greenbone web interface is just too ugly.

In addition I started a slow but thorough nmap scan:

~~~ sh
$ nmap -A -p- -Pn -oA output_directory <ip-range>
~~~

This took around two days to finish.

### Results

Found a Linux and a Windows host with RCE; some configuration data was leaked, two printers printed out weird characters. Didn't look to bad.

On the other hand, the brutal scans were not detected by the blue team. This surprised me.

## Active Directory

I did the easy thing and started with [responder](https://github.com/lgandx/Responder) and impacket

~~~ sh
$ apt install responder python3-impacket impacket-scripts
~~~

Well, I wanted to, but the perimeter firewall seemed to detect impacket (downloaded through http from the apt repository) and block it. Unexpected, but what can you do? Well, change the protocol in `/etc/apt/sources.list` from `http` to `https` and install the packages.

### Passive Recon

Initially I did some passive listening (note the `eth1`, initially I used the wrong network card):

~~~ sh
$ responder -I eth1 -A
~~~

### LLMNR and stuff

LLMNR traffic was seen, so I did the obvious

~~~ sh
$ responder -I eth1 -w -d
~~~

Got some hashes as proof, but the EDR on some clients wasn't to happy and isolated some client computers from the network. Not my attacker machine, but the clients.. good choice. As stealth was not a requirement, the blue team disabled the isolation automation but kept logging (sentinel) on.

How are things looking w.r.t. with relaying tokens?

For that I enumerated the servers in the server-subnet and stored those in a file through [crackmapexec](https://github.com/Porchetta-Industries/CrackMapExec):

~~~ sh
$ apt install crackmapexec
$ crackmapexec smb <io-range> --gen-relay-list ~/targets.txt
$ sudo python3 /usr/share/doc/python3-impacket/examples/ntlmrelayx.py -tf ~/targets.txt -smb2support
~~~

Open `/etc/responder/Repsonder.conf`, set http and smb to `Off` and restart responder:

~~~ sh
$ responder -I eth1 -w -d
~~~

Lots of output. Seems like a privileged user was relayed, was able to login to some of the backend servers and hashed were output. Weirdly, I wasn't able to use psexec.py or secretsdump.py to use those hashes, some of the errors indicated that I might have some python dependency problems. Meh. Not the perfect proof for a running attack.

Also, sentinel detected those attacks.

### mitm6 seems to be sneakier

LLMNR poisoning is old (7 years by now?) so I tried the same setup with [mitm6](https://github.com/dirkjanm/mitm6). The attack uses the same basic idea, but instead of using LLMNR/NB for answers it overrides the DHCPv4 responses with DHCPv6 responses. As I saw DHCPv6 traffic in the local network, this should work too.

~~~ sh
$ sudo pip install mitm6
$ sudo python3 /usr/share/doc/python3-impacket/examples/ntlmrelayx.py -tf ~/targets.txt -smb2support
$ sudo mitm -d <ad domain name>
~~~

And success, output was similar to the responder-induced attacks (i.e., SAM dump) but it seems as if Microsoft Defender/Sentinel didn't show anything in the logs.

### crackmapexec to the rescue

Still I wasn't able to use the extracted SAM hashes, I was quite sure that this was related to the offered Kali Linux distribution. Let's just use another tool (which paradoxically also uses python3-impacket in the background) that we already have installed: crackmapexec.

~~~ sh
$ crackmapexec smb <server ip range> -u <user> -H <hash> --sam
~~~

And lo and behold.. many accounts got dumped. Seems like while the customer is using LAPS, there might be old default local administrative accounts lying around.. and all of them seem to use the same password.

As mentioned, I am not used to Active Directory assignments, this results happened after approximately two hours and I was a bit overwhelmed with all those hashes and keys. So I lost maybe a hour or so just reading through the output.

What I did then was, simplified:

~~~ sh
$ crackmapexec smb <server ip range> -u <user> -H <hash> --lsa

# got a dozen or so domain users, also the username/password of a local backup agent user

$ crackmapexec smb <server ip range> -d <domain> -u <user> -p <password> --lsa

# found something with "_adm" in it's name (domain admin)
$ crackmapexec smb <server ip range> -d <domain> -u <user> -H <hash> -M lsassy
~~~

As I had approx. a dozen passwords, three full domain admins and.. stuff. I stopped here.

## Further Notes

As you might have recognized, I am not an AD-hacker, I mostly googled stuff. The following sites were quite helpfull:

- [HackTricks](https://book.hacktricks.xyz/generic-methodologies-and-resources/pentesting-network/spoofing-llmnr-nbt-ns-mdns-dns-and-wpad-and-relay-attacks)
- [Xedex: Internal Pentest](https://xedex.gitbook.io/internalpentest/internal-pentest/active-directory/initial-attack-vectors/llmnr-nbt-ns-poisoning/smb-relay)
- [Hacking Articles: Lateral Movement](https://www.hackingarticles.in/lateral-movement-pass-the-hash-attack/)
- [The Hacker Recipes](https://www.thehacker.recipes/ad/movement/credentials/dumping/sam-and-lsa-secrets)
- [Offensive Security Cheatsheet](https://cheatsheet.haax.fr/windows-systems/exploitation/crackmapexec/)

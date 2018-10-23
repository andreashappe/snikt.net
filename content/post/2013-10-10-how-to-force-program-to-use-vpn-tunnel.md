---
layout: post
title: "Linux: How to force an application to use a given VPN tunnel"
description: "wicked_pdf allows generating PDFs from ruby on rails, for free!"
keywords: "linux, ip, pen-testing, penetration testing, bittorrent, routing"
aliases:
  - /blog/2013/10/10/how-to-force-program-to-use-vpn-tunnel
tags: ["linux", "virtualization", "security"]
date: 2013-10-20
---
Somehow I have to use VPN services throughout the day:

* when pen-testing from abroads I really need to login to my company's network first. Otherwise my provider is kinda grumpy when I'm doing fast non-cloaked scans against large companies.
* also when pen-testing I like to use some [cloaking VPNs](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) to test the client's detection capabilities
* if I would ever use bit-torrent I'd really like to make sure that the torrent program can only communicate through a private proxy (as [pia](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001)).

The easy solution would be to connect the [openvpn tunnels](http://openvpn.net) on startup and just route all the traffic through the tunnels. Alas this is way to slow for daily use -- and somehow error prone: if a tunnel dies and some pen-test is currently under progress traffic might escape into 'unsecured' public networks. The same would be true for torrents.

<!-- more -->

Just to state the obvious: all links to Private Internet Access contain my referral ID -- if you want to sign up theere and use this link I'm getting some money (hopefully).

## How to route/bind programs to the VPN interface

So let's change my openvpn client's configuration to not accept a new default route from the VPN service's DHCP server (once again, I'm using my [privateinteraccess.com](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) account):

~~~ 
client
dev tun
proto udp
remote swiss.privateinternetaccess.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
tls-client
remote-cert-tls server
auth-user-pass .pia
comp-lzo
verb 1
reneg-sec 0

# this stuff changes the routing behaviour
script-security 2
route-noexec
route-up /home/andy/route_up.sh
~~~

The route_up.sh is mostly empty: it just outputs environment variable (set by openvpn) that show my which IP address and routing addresses were forwarded to the route_up.sh script:

~~~ bash
#!/bin/sh
echo "$dev : $ifconfig_local -> $ifconfig_remote gw: $route_vpn_gateway"
exit 0
~~~

After firing up the VPN tunnel (via `openvpn openvpn.vpn`) the script outputs the following:

~~~
tun0 : 10.188.1.10 -> 10.188.1.9 gw: 10.188.1.9
~~~

and my routing table looks like I would expect it to be (my ip is 10.188.1.10, the gateway's IP is 10.188.1.9):

~~~ bash
root@MinimalBastard:/home/andy# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.0.1     0.0.0.0         UG    0      0        0 eth0
10.188.1.9      0.0.0.0         255.255.255.255 UH    0      0        0 tun0
192.168.0.0     0.0.0.0         255.255.255.0   U     0      0        0 eth0
~~~

Now we need to create a new routing table, which I will call 'custom_table'.

~~~ bash

# first create a table name
$ echo "10 custom_table" >> /etc/iproute2/rt_tables

# then add the vpn device as default route for this routing table
$ ip route add default via 10.188.1.9 dev tun0 table custom_table

# add rules that all traffic going to the gateway as well as
# all traffic comming from my local VPN is routed through the
# VPN's gateway
$ ip rule add from 10.188.1.10/32 table custom_table
$ ip rule add to 10.188.1.9/32 table custom_table

# and flush the cache to make sure that the changes were commited
$ ip route flush cache
~~~

Now is the perfect time to test what my external IP would be. To do this I use wget, which I bind to use the local VPN IP. wget connects to http://ipecho.net which will return my external IP address:

~~~ bash
root@MinimalBastard:/home/andy# wget --bind-address=10.188.1.10 http://ipecho.net/plain -O - -q; echo

-> 81.17.27.234
~~~

Which is a IP address belonging to the VPN service. Mission accomplished.

## How does it behave when VPN tunnel dies?

Lets test this too: I'll just retry the wget command after closing the VPN tunnel:

~~~ bash
root@MinimalBastard:/home/andy# wget --bind-address=10.188.1.10 http://ipecho.net/plain 
--2013-10-10 19:27:29--  http://ipecho.net/plain
Resolving ipecho.net (ipecho.net)... 146.255.36.1
Connecting to ipecho.net (ipecho.net)|146.255.36.1|:80... failed: Cannot assign requested address.
Retrying.

--2013-10-10 19:27:30--  (try: 2)  http://ipecho.net/plain
Connecting to ipecho.net (ipecho.net)|146.255.36.1|:80... failed: Cannot assign requested address.
Retrying.

--2013-10-10 19:27:32--  (try: 3)  http://ipecho.net/plain
Connecting to ipecho.net (ipecho.net)|146.255.36.1|:80... failed: Cannot assign requested address.
Retrying.
~~~

I really like this: when the VPN tunnel dies no communication will be routed through the default gateway (or leave the host at all).

## WIP: start application through the openvpn config file

We can use the environment variables to set everything up through route_up.sh:

~~~ bash
#!/bin/sh

echo "$dev : $ifconfig_local -> $ifconfig_remote gw: $route_vpn_gateway"

ip route add default via $route_vpn_gateway dev $dev table custom_table
ip rule add from $ifconfig_local/32 table custom_table
ip rule add to $route_vpn_gateway/32 table custom_table
ip route flush cache

exit 0

# PROBLEM: why is this not finishing?
#wget --bind-address=$ifconfig_local http://ipecho.net/plain -O - -q; echo 
~~~

My problem now is, that the wget command is not finishing (but the tunnel itself works if I comment out this final bit, I can use the same wget command on the command line).

This is kinda disappointing. I would really like to automatically start the pen-testing tools (or bittorrent clients) through the openvpn script -- with this setup I wouldn't have to do anything manually.

Any suggestions? If so, please add comments.. I will update this post as soon as better solutions are found. Another thing I'm looking into is retrieving the PID of the started command and automatically adding futher iptable rules that block any traffic of the program in question that wouldn't use the configured routing table.

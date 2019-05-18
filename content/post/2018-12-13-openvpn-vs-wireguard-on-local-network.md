---
title: Wireguard vs OpenVPN on a local Gigabit Network
date: 2018-12-13
tags: ["tech"]
---

[Wireguard](https://www.wireguard.com/) is recently making a splash as human-configurable low-overhead alternative to [OpenVPN](https://openvpn.net/) and IPSec. As some privacy-centric VPN providers are planning to support it (e.g., [PIA](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001)) or already have a beta running (e.g., [IVPN, as tested by Ars Technica](https://arstechnica.com/gadgets/2018/12/testing-wireguard-with-an-early-adopter-vpn-service/)) it was time for me to look into it.

# The Setup

To get a better feeling about the used technology I directly connected my laptop to my desktop (gigabit Ethernet with no switch/router in between) and setup OpenVPN with a minimalist configuration as well as with a more realistic TLS-configuration. I took some bandwidth/latency measurements with [iperf](https://iperf.fr/) and [qperf](https://access.redhat.com/solutions/2122681) and compared those to a minimal Wireguard setup.

To summarize the used hardware/software:

Component           | Notebook                     | Desktop
------------------- | ---------------------------- | -------------------------------
CPU                 | Intel i7-8550U @1.8GHz       | Intel i5-4690K @3.5GHz
Network Card        | Intel PRO/1000 e1001 3.2.6-k | Qualcom alx AR815x/AR127x
Distribution        | Ubuntu 18.10                 | Fedora 29
Linux Kernel        | 4.18.0-12-generic            | 4.19.7-300.fc29.x86_64
OpenVPN             | 2.4.6 with OpenSSL 1.1.1     | 2.4.6 with OpenSSL 1.1.1 FIPS
Wireguard           | 20181119-wg1                 | 0.0.20181119-1
IP-Address (direct) | 192.168.66.2                 | 192.168.66.1

The performance baseline:

~~~ shell
~ ➤ qperf --use_bits_per_sec 192.168.66.1 tcp_lat
tcp_lat:
    latency  =  102 us
~ ➤ qperf --use_bits_per_sec 192.168.66.1 tcp_bw
tcp_bw:
    bw  =  840 Mb/sec
~~~

# Minimal OpenVPN Configuration (shared secret)

This is a setup based upon [the OpenVPN documentation](roughly based upon https://openvpn.net/community-resources/static-key-mini-howto/): the two computers are connected with a minimal VPN configuration and a shared secret key is used (this key has to be copied between those two computers beforehand). This uses a 2048 bit key, no TLS and BF-CBC as cipher (blowfish). The shared secret (stored in the file `static.key`) was created with the command `$ OpenVPN --genkey --secret static.key` and afterwards copied with scp.

The server configuration was thus:

~~~ text
dev tun
ifconfig 10.8.0.1 10.8.0.2
secret static.key
~~~

and the client configuration was:

~~~ text
remote 192.168.66.1
dev tun
ifconfig 10.8.0.2 10.8.0.1
secret static.key
~~~

The different clients then were started using the `openvpn` command line tool:

~~~ shell
$ sudo openvpn openvpn-1-client.conf                                                                  
Wed Dec 12 18:46:57 2018 disabling NCP mode (--ncp-disable) because not in P2MP client or server mode
Wed Dec 12 18:46:57 2018 OpenVPN 2.4.6 x86_64-pc-linux-gnu [SSL (OpenSSL)] [LZO] [LZ4] [EPOLL] [PKCS11] [MH/PKTINFO] [AEAD] built on Sep  3 2018
Wed Dec 12 18:46:57 2018 library versions: OpenSSL 1.1.1  11 Sep 2018, LZO 2.10
Wed Dec 12 18:46:57 2018 WARNING: INSECURE cipher with block size less than 128 bit (64 bit).  This allows attacks like SWEET32.  Mitigate by using a --cipher with a larger block size (e.g. AES-256-CBC).
Wed Dec 12 18:46:57 2018 WARNING: INSECURE cipher with block size less than 128 bit (64 bit).  This allows attacks like SWEET32.  Mitigate by using a --cipher with a larger block size (e.g. AES-256-CBC).
Wed Dec 12 18:46:57 2018 TUN/TAP device tun0 opened
Wed Dec 12 18:46:57 2018 do_ifconfig, tt->did_ifconfig_ipv6_setup=0
Wed Dec 12 18:46:57 2018 /sbin/ip link set dev tun0 up mtu 1500
Wed Dec 12 18:46:57 2018 /sbin/ip addr add dev tun0 local 10.8.0.2 peer 10.8.0.1
Wed Dec 12 18:46:57 2018 TCP/UDP: Preserving recently used remote address: [AF_INET]192.168.66.1:1194
Wed Dec 12 18:46:57 2018 UDP link local (bound): [AF_INET][undef]:1194
Wed Dec 12 18:46:57 2018 UDP link remote: [AF_INET]192.168.66.1:1194
Wed Dec 12 18:47:04 2018 Peer Connection Initiated with [AF_INET]192.168.66.1:1194
Wed Dec 12 18:47:04 2018 WARNING: this configuration may cache passwords in memory -- use the auth-nocache option to prevent this
Wed Dec 12 18:47:04 2018 Initialization Sequence Completed
~~~

And with that we were able to measure the bandwidth and the performance. Please notice that it took around seven seconds to get the tunnel established.

# OpenVPN with TLS and AES-GCM

The next step was to create a realistic public-/private-key based OpenVPN setup. Compared to the minimalist setup there were the following differences:

* OpenVPN uses a data and a control channel. The control channel can be configured using the `tls-cipher` directive and a `chacha20-poly1305` cipher was used for better comparison with Wireguard (which uses the same cipher). For the data channel neither Fedora nor Ubuntu provided `chacha20-poly1305` so `AES-256-GCM` was configured using the `cipher` configuration option. AES-GCM should perform very fast as OpenSSL would be using the Intel hardware support for this cipher/block-mode.
* a 4096 bit DH parameter was created using `openssl dhparam -out dh4096.pem 4096`

## easy-rsa (public/private key setup)

Sadly for the public-/private-key setup we need some sort of CA (certificate issuer). I've taken the easy way out and used [easy-rsa](https://help.ubuntu.com/lts/serverguide/openvpn.html.en).

To not blow up the volume of this article, I'll just post my used commands (on the Ubuntu machine):

~~~ shell
$ sudo apt-get install easy-rsa
$ cd ~
$ mkdir easy-rsa
$ cd easy-rsa
$ cp -r /usr/share/easy-rsa/* .
$ mv vars.example vars
$ ./easyrsa init-pki
$ ./easyrsa build-ca
$ ./easyrsa build-server-full server
$ ./easyrsa build-client-full client
~~~

Then the relevant files were copied to client and server. For the server-side we need `ca.crt`, `dh4096.pem`, `server.key`, `server.crt`. For the client we need `ca.crt`, `client.key` and `client.crt`.

## Configuration

The generated keys/certificates were thus configured on the server side:

~~~ text
dev tun
ifconfig 10.8.0.1 10.8.0.2

tls-server
tls-cipher TLS-ECDHE-RSA-WITH-CHACHA20-POLY1305-SHA256
cipher AES-256-GCM

cert server.crt
key server.key
dh dh4096.pem
ca ca.crt
~~~

On the client side I used the following configuration:

~~~ bash
remote 192.168.66.1
dev tun
ifconfig 10.8.0.2 10.8.0.1

tls-client
tls-cipher TLS-ECDHE-RSA-WITH-CHACHA20-POLY1305-SHA256
cipher AES-256-GCM

ca ca.crt
cert client.crt
key client.key
~~~

With this we were able to connect client and server and take some measurements:

~~~ bash
~ ➤ sudo openvpn openvpn-2-client.conf                                                                  
Wed Dec 12 19:20:52 2018 WARNING: Ignoring option 'dh' in tls-client mode, please only include this in your server configuration
Wed Dec 12 19:20:52 2018 disabling NCP mode (--ncp-disable) because not in P2MP client or server mode
Wed Dec 12 19:20:52 2018 OpenVPN 2.4.6 x86_64-pc-linux-gnu [SSL (OpenSSL)] [LZO] [LZ4] [EPOLL] [PKCS11] [MH/PKTINFO] [AEAD] built on Sep  3 2018
Wed Dec 12 19:20:52 2018 library versions: OpenSSL 1.1.1  11 Sep 2018, LZO 2.10
Wed Dec 12 19:20:52 2018 WARNING: No server certificate verification method has been enabled.  See http://openvpn.net/howto.html#mitm for more info.
Enter Private Key Password: **********
Wed Dec 12 19:20:55 2018 WARNING: this configuration may cache passwords in memory -- use the auth-nocache option to prevent this
Wed Dec 12 19:20:55 2018 TUN/TAP device tun0 opened
Wed Dec 12 19:20:55 2018 do_ifconfig, tt->did_ifconfig_ipv6_setup=0
Wed Dec 12 19:20:55 2018 /sbin/ip link set dev tun0 up mtu 1500
Wed Dec 12 19:20:55 2018 /sbin/ip addr add dev tun0 local 10.8.0.2 peer 10.8.0.1
Wed Dec 12 19:20:55 2018 TCP/UDP: Preserving recently used remote address: [AF_INET]192.168.66.1:1194
Wed Dec 12 19:20:55 2018 UDP link local (bound): [AF_INET][undef]:1194
Wed Dec 12 19:20:55 2018 UDP link remote: [AF_INET]192.168.66.1:1194
Wed Dec 12 19:20:55 2018 [server] Peer Connection Initiated with [AF_INET]192.168.66.1:1194
Wed Dec 12 19:20:57 2018 Initialization Sequence Completed
~~~

# Wireguard

Wireguard is configured using both the linux `ip` as well as the Wireguard `wg` binary. To create the setup two private-/public-keypairs as well as a shared preshared key were created. The public key is a short BASE64-encoded value (e..g, `1ykxqzUAXcNK0VnzUf/4kf9Frt/CU5bc2h1m6uPf6yc=` while the pre-shared key is contained in a normal text file).

Wireguard itself used `Chacha20-Poly1305`. This is a software algorithm with almost no hardware acceleration support. While the lack of hardware support hurts on x86_64 platforms the algorithm's good software performance is one of the reasons that Alphabet is using this on ARM-Platforms (i.e., Android) which until recently were lacking (AES-)GCM hardware support.

## Key generation

I created a private/public-keypair on both clients (just outputting this for one side, execute this on both clients):

~~~ bash
$ wg genkey > private.key
$ wg pubkey > public.key < private.key
~~~

Also I've created the preshared key (and copied that from one client to the other client):

~~~ bash
$ wg genpsk > psk.key
~~~

## Configuration

As mentioned before, `wireguard` can be configured using just the command line, this was done on client 1:

~~~ bash
~ ➤ sudo ip link add wg0 type wireguard
~ ➤ sudo ip addr add 192.168.3.1/24 dev wg0
~ ➤ sudo wg set wg0 private-key private.key
~ ➤ sudo ip link set wg0 up
~~~

Now we an output the resulting configuration, please note the public key as well as the listening port:

~~~ bash
~ ➤ sudo wg
interface: wg0
  public key: fad/yUlE3CQEHFIZbL5Zfkue0zCA+A1aBnps28CrOXc=
  private key: (hidden)
  listening port: 60355
~~~

We do the same on client 2:

~~~ bash
 ✔ sudo ip link add wg0 type wireguard
 ✔ sudo ip addr add 192.168.3.2/24 dev wg0
 ✔ sudo wg set wg0 private-key private.key
 ✔ sudo ip link set wg0 up
 ✔ sudo wg
interface: wg0
  public key: 1ykxqzUAXcNK0VnzUf/4kf9Frt/CU5bc2h1m6uPf6yc=
  private key: (hidden)
  listening port: 40368
~~~

Now we need to tell client 1 the network endpoint and public key of client 2 (and vice versa). For client one this means:

~~~ bash
$ sudo wg set wg0 peer 1ykxqzUAXcNK0VnzUf/4kf9Frt/CU5bc2h1m6uPf6yc= preshared-key psk.key allowed-ips 192.168.3.2/32 endpoint 192.168.66.1:40368
~~~

And for client 2:

~~~ bash
 ✔ sudo wg set wg0 peer fad/yUlE3CQEHFIZbL5Zfkue0zCA+A1aBnps28CrOXc= preshared-key psk.key allowed-ips 192.168.3.1/32 endpoint 192.168.66.2:60355
~~~

What let to some problems for me was that the public key is supplied directly as BASE64-encoded value while the pre-shared key is provided through a file. More RTFM for me.

I cannot really tell how fast the VPN tunnel was established as it was almost instant, maybe faster than half a second.

And with that I was able to gain some performance numbers.

# Results

And now, for the performance numbers:

Setup    | startup-time | iperf (Bandwidth) | qperf tcp_bw (Bandwidth) | qperf tcp_lat (Latency)
---------|--------------|-------------------|--------------------------|--------------------------------
direct, no VPN | well, none | | 840 Mb/sec | 102us
OpenVPN minimal, shared secret, no TLS | 7s | 428 Mbits/sec | 337 Mb/sec | 144us
OpenVPN TLS, AES-256GCM | 5s | 882 MBits/sec | 842 MB/sec | 105us
Wireguard | < 1sec | 898 MBit/sec | 893 MB/sec | 317us

I was highly surprised by the bad performance achieved by the minimal OpenVPN configuration. Another surprise was that Wireguard was able to beat OpenSSL's performance even with it's software-based crypto construction (sadly I was not able to capture CPU utilization so maybe the performance was achieved by spending more CPU cycles. But I wouldn't really care about that TBH). One thing that saddened me was Wireguards worse latency when compared to OpenVPN with hardware AES-GCM support but this was offset by the way-easier public/private-key configuration as well as the almost instant tunnel establishment time (this would be come handy when using mobile/roaming clients).

As soon as [Private Internet Access](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) offers wireguard support I will test its performance (against OpenVPN) over a wireless (802.11b) as well as through a mobile (LTE) network.

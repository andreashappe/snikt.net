---
layout: post
title: "Building a secure torrent download station by combining Private Internet Access (PIA), OpenVPN and transmission through docker"
categories: ["tech"]
date: 2019-08-05
keywords:
- linux
- bridge
- docker compose
- openvpn
- private internet access
- bittorrent
- transmission
---

Sometimes I want to work on client assignments (penetration-tests) from home, if I do that I am using my company VPN so that all traffic is routed thorugh their public IP address (which is white-listed by the client). I do not want for traffic to ever leave that VPN as that would look like as if I'd be performing cyber attacks from my private home IP address. The same requirements arise for different use-cases, e.g., when downloading bittorrent files or forcing traffic through the [tor network](https://www.torproject.org/) if whistle-blowing.

To achieve a secure setup I want to combine the following:

* a [Private Internet Access](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) VPN tunnel -- this hides (or should hide) my identity. You can replace that with your company or tor proxy for the other use cases.
* the software that should run through/behind the VPN. To improve reusability I will use docker images for those.

This setup should be fail-secure: if the VPN tunnel gets disconnected, the bittorrent download container will loose network connectivity. This is good. What you wouldn't want is the container to automatically use my "normal" network connection --- this would use my public IP address and throught that might leak my identity.

I did some searching around and found [dperson's docker images](2019-06-30-secure-downloads-with-raspberry-pi-openvpn-pia-docker-and-transmission-web.md) which nicely provide all needed functionality. Sadly the inital setup did not work as smooth as I assumed, so I wrote my setup procedure up.

# Setup OpenVPN image

The openvpn-client docker image does support [using an user-supplied configuration file](https://github.com/dperson/openvpn-client/issues/141), so I went with that. For testing purposes I've created /tmp/vpn and adapted an PIA openvpn config file to use file-based authentication (change `auth-user-pass` to `auth-user-pass login.conf` in the PIA configuration file). this file must be named `vpn.conf` and be placed within the /tmp/vpn directory (on the host):

~~~
client
dev tun
proto udp
remote de-frankfurt.privateinternetaccess.com 1197
resolv-retry infinite
nobind
persist-key
persist-tun
cipher aes-256-cbc
auth sha256
tls-client
remote-cert-tls server

auth-user-pass login.conf
compress
verb 1
reneg-sec 0
<crl-verify>
-----BEGIN X509 CRL-----
MIIDWDCCAUAwDQYJKoZIhvcNAQENBQAwgegxCzAJBgNVBAYTAlVTMQswCQYDVQQI
EwJDQTETMBEGA1UEBxMKTG9zQW5nZWxlczEgMB4GA1UEChMXUHJpdmF0ZSBJbnRl
cm5ldCBBY2Nlc3MxIDAeBgNVBAsTF1ByaXZhdGUgSW50ZXJuZXQgQWNjZXNzMSAw
HgYDVQQDExdQcml2YXRlIEludGVybmV0IEFjY2VzczEgMB4GA1UEKRMXUHJpdmF0
ZSBJbnRlcm5ldCBBY2Nlc3MxLzAtBgkqhkiG9w0BCQEWIHNlY3VyZUBwcml2YXRl
aW50ZXJuZXRhY2Nlc3MuY29tFw0xNjA3MDgxOTAwNDZaFw0zNjA3MDMxOTAwNDZa
MCYwEQIBARcMMTYwNzA4MTkwMDQ2MBECAQYXDDE2MDcwODE5MDA0NjANBgkqhkiG
9w0BAQ0FAAOCAgEAppFfEpGsasjB1QgJcosGpzbf2kfRhM84o2TlqY1ua+Gi5TMd
KydA3LJcNTjlI9a0TYAJfeRX5IkpoglSUuHuJgXhP3nEvX10mjXDpcu/YvM8TdE5
JV2+EGqZ80kFtBeOq94WcpiVKFTR4fO+VkOK9zwspFfb1cNs9rHvgJ1QMkRUF8Pp
LN6AkntHY0+6DnigtSaKqldqjKTDTv2OeH3nPoh80SGrt0oCOmYKfWTJGpggMGKv
IdvU3vH9+EuILZKKIskt+1dwdfA5Bkz1GLmiQG7+9ZZBQUjBG9Dos4hfX/rwJ3eU
8oUIm4WoTz9rb71SOEuUUjP5NPy9HNx2vx+cVvLsTF4ZDZaUztW9o9JmIURDtbey
qxuHN3prlPWB6aj73IIm2dsDQvs3XXwRIxs8NwLbJ6CyEuvEOVCskdM8rdADWx1J
0lRNlOJ0Z8ieLLEmYAA834VN1SboB6wJIAPxQU3rcBhXqO9y8aa2oRMg8NxZ5gr+
PnKVMqag1x0IxbIgLxtkXQvxXxQHEMSODzvcOfK/nBRBsqTj30P+R87sU8titOox
NeRnBDRNhdEy/QGAqGh62ShPpQUCJdnKRiRTjnil9hMQHevoSuFKeEMO30FQL7BZ
yo37GFU+q1WPCplVZgCP9hC8Rn5K2+f6KLFo5bhtowSmu+GY1yZtg+RTtsA=
-----END X509 CRL-----
</crl-verify>

<ca>
-----BEGIN CERTIFICATE-----
MIIHqzCCBZOgAwIBAgIJAJ0u+vODZJntMA0GCSqGSIb3DQEBDQUAMIHoMQswCQYD
VQQGEwJVUzELMAkGA1UECBMCQ0ExEzARBgNVBAcTCkxvc0FuZ2VsZXMxIDAeBgNV
BAoTF1ByaXZhdGUgSW50ZXJuZXQgQWNjZXNzMSAwHgYDVQQLExdQcml2YXRlIElu
dGVybmV0IEFjY2VzczEgMB4GA1UEAxMXUHJpdmF0ZSBJbnRlcm5ldCBBY2Nlc3Mx
IDAeBgNVBCkTF1ByaXZhdGUgSW50ZXJuZXQgQWNjZXNzMS8wLQYJKoZIhvcNAQkB
FiBzZWN1cmVAcHJpdmF0ZWludGVybmV0YWNjZXNzLmNvbTAeFw0xNDA0MTcxNzQw
MzNaFw0zNDA0MTIxNzQwMzNaMIHoMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0Ex
EzARBgNVBAcTCkxvc0FuZ2VsZXMxIDAeBgNVBAoTF1ByaXZhdGUgSW50ZXJuZXQg
QWNjZXNzMSAwHgYDVQQLExdQcml2YXRlIEludGVybmV0IEFjY2VzczEgMB4GA1UE
AxMXUHJpdmF0ZSBJbnRlcm5ldCBBY2Nlc3MxIDAeBgNVBCkTF1ByaXZhdGUgSW50
ZXJuZXQgQWNjZXNzMS8wLQYJKoZIhvcNAQkBFiBzZWN1cmVAcHJpdmF0ZWludGVy
bmV0YWNjZXNzLmNvbTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBALVk
hjumaqBbL8aSgj6xbX1QPTfTd1qHsAZd2B97m8Vw31c/2yQgZNf5qZY0+jOIHULN
De4R9TIvyBEbvnAg/OkPw8n/+ScgYOeH876VUXzjLDBnDb8DLr/+w9oVsuDeFJ9K
V2UFM1OYX0SnkHnrYAN2QLF98ESK4NCSU01h5zkcgmQ+qKSfA9Ny0/UpsKPBFqsQ
25NvjDWFhCpeqCHKUJ4Be27CDbSl7lAkBuHMPHJs8f8xPgAbHRXZOxVCpayZ2SND
fCwsnGWpWFoMGvdMbygngCn6jA/W1VSFOlRlfLuuGe7QFfDwA0jaLCxuWt/BgZyl
p7tAzYKR8lnWmtUCPm4+BtjyVDYtDCiGBD9Z4P13RFWvJHw5aapx/5W/CuvVyI7p
Kwvc2IT+KPxCUhH1XI8ca5RN3C9NoPJJf6qpg4g0rJH3aaWkoMRrYvQ+5PXXYUzj
tRHImghRGd/ydERYoAZXuGSbPkm9Y/p2X8unLcW+F0xpJD98+ZI+tzSsI99Zs5wi
jSUGYr9/j18KHFTMQ8n+1jauc5bCCegN27dPeKXNSZ5riXFL2XX6BkY68y58UaNz
meGMiUL9BOV1iV+PMb7B7PYs7oFLjAhh0EdyvfHkrh/ZV9BEhtFa7yXp8XR0J6vz
1YV9R6DYJmLjOEbhU8N0gc3tZm4Qz39lIIG6w3FDAgMBAAGjggFUMIIBUDAdBgNV
HQ4EFgQUrsRtyWJftjpdRM0+925Y6Cl08SUwggEfBgNVHSMEggEWMIIBEoAUrsRt
yWJftjpdRM0+925Y6Cl08SWhge6kgeswgegxCzAJBgNVBAYTAlVTMQswCQYDVQQI
EwJDQTETMBEGA1UEBxMKTG9zQW5nZWxlczEgMB4GA1UEChMXUHJpdmF0ZSBJbnRl
cm5ldCBBY2Nlc3MxIDAeBgNVBAsTF1ByaXZhdGUgSW50ZXJuZXQgQWNjZXNzMSAw
HgYDVQQDExdQcml2YXRlIEludGVybmV0IEFjY2VzczEgMB4GA1UEKRMXUHJpdmF0
ZSBJbnRlcm5ldCBBY2Nlc3MxLzAtBgkqhkiG9w0BCQEWIHNlY3VyZUBwcml2YXRl
aW50ZXJuZXRhY2Nlc3MuY29tggkAnS7684Nkme0wDAYDVR0TBAUwAwEB/zANBgkq
hkiG9w0BAQ0FAAOCAgEAJsfhsPk3r8kLXLxY+v+vHzbr4ufNtqnL9/1Uuf8NrsCt
pXAoyZ0YqfbkWx3NHTZ7OE9ZRhdMP/RqHQE1p4N4Sa1nZKhTKasV6KhHDqSCt/dv
Em89xWm2MVA7nyzQxVlHa9AkcBaemcXEiyT19XdpiXOP4Vhs+J1R5m8zQOxZlV1G
tF9vsXmJqWZpOVPmZ8f35BCsYPvv4yMewnrtAC8PFEK/bOPeYcKN50bol22QYaZu
LfpkHfNiFTnfMh8sl/ablPyNY7DUNiP5DRcMdIwmfGQxR5WEQoHL3yPJ42LkB5zs
6jIm26DGNXfwura/mi105+ENH1CaROtRYwkiHb08U6qLXXJz80mWJkT90nr8Asj3
5xN2cUppg74nG3YVav/38P48T56hG1NHbYF5uOCske19F6wi9maUoto/3vEr0rnX
JUp2KODmKdvBI7co245lHBABWikk8VfejQSlCtDBXn644ZMtAdoxKNfR2WTFVEwJ
iyd1Fzx0yujuiXDROLhISLQDRjVVAvawrAtLZWYK31bY7KlezPlQnl/D9Asxe85l
8jO5+0LdJ6VyOs/Hd4w52alDW/MFySDZSfQHMTIc30hLBJ8OnCEIvluVQQ2UQvoW
+no177N9L2Y+M9TcTA62ZyMXShHQGeh20rb4kK8f+iFX8NxtdHVSkxMEFSfDDyQ=
-----END CERTIFICATE-----
</ca>

disable-occ
~~~

The username and password are stored in /tmp/vpn/login.conf. The file has a very simplistic format: the first line contains the username, the second line contains the corresponding password:

~~~
username
password
~~~

There is another important hint: on Fedora SELinux is in use [and prevents using the host files as docker volumes](
http://www.projectatomic.io/blog/2015/06/using-volumes-with-docker-can-cause-problems-with-selinux/). To fix this, we need to apply the right label to the VPN directory:

~~~ bash
sudo chcon -Rt svirt_sandbox_file_t /tmp/vpn
~~~

Now we can start up the OpenVPN-client container:

~~~ bash
$ sudo docker run -it --cap-add=NET_ADMIN --device /dev/net/tun --name vpn \
            --dns 8.8.8.8 -v /tmp/vpn:/vpn -d dperson/openvpn-client -f ""
~~~

We pass in the vpn-diretory and use a containter option (`-f ""`) to configure it's firewall to block all traffic if the VPN is not opened (to prevent stray communications from happening).

# Test the VPN tunnel through a minimal image

You should never trust your configuration without testing it.. so let's fire up an alpine linux container, connect it to the internet through the VPN and retrieve our external IP-Adress (which should be different to our Host computer's external IP address):

~~~ bash
$ sudo docker run -it --name shell --net=container:vpn --rm alpine /bin/ash
/ # wget http://whatismyip.akamai.com/
Connecting to whatismyip.akamai.com (2.20.189.18:80)
/ # cat index.html 
185.220.70.151/ # 
~~~

# Use transmission-web images (and an nginx to allow for web access to the container)

Now we can start-up additional images for transmission and a web-server for controlling it. We will use the vpn-network configured through the openvpn-client image:

~~~ bash
$ sudo docker run -it --name bit --net=container:vpn -d dperson/transmission
$ sudo docker run -it --name web -p 80:80 -p 443:443 --link vpn:bit \                        
            -d dperson/nginx -w "http://bit:9091/transmission;/transmission"
~~~

Now you should be able to access the transmission web interface through http://localhost/transmission or https://localhost/transmission. There is an HTTP BASIC AUTH based authentication, use admin as username and admin as password.

And that's it.. steps for the future include moving this setup onto my Raspberry Pi and/or migrating it to Docker-Compose.

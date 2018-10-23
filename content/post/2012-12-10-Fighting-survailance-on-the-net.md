---
layout: post
title: "Avoiding Internet/Network Surveillance"
date: 2012-12-10
comments: true
aliases:
  - /blog/2012/12/10/fighting-survailance-on-the-net
tags: ["linux", "security"]
description: "How to encrypt most of your communication data on the internet"
keywords: "Linux, encryption, security, https anywhere, surveillance, surveillance, tunnel, tunneling, vpn, openvpn, socks5, anonymity, network-manager, private internet access"
---
Last week's [World Conference on International Telecommunications (WCIT)](http://www.itu.int/en/wcit-12/Pages/overview.aspx) brought internet surveillance into [public](http://wcitleaks.org/news/) [news](http://www.wired.co.uk/news/archive/2012-11/23/guide-to-itu-wcit): one outcome of the conference was standardization of [DPI technology](https://www.cdt.org/blogs/cdt/2811adoption-traffic-sniffing-standard-fans-wcit-flames). This infrastructure standard will make it easier for governments to implement large-scale surveillance and/or filtering. Funny thing is that governments are already having those capabilities, they only want to standardize it. The public outrage came too late.

So let's protect you from governments at home or abroad, the RIAA, MPAA, random eavesdroppers and anyone else that want to listen in on your secrets while you're surfing the Internet. The initial steps are easy and cheap (or free), so there's no reason let your security down.<!-- more --> They might not be perfect but making the government's job more expensive seems to be a good road to take.

What's the attack scenario? When you access some service, i.e. a web or mail server, your communication passes through multiple computers. For example when surfing from a coffee shop your communication will pass through the coffee shop's wireless access point, some modem/router, a couple of computers on their network provider's side, the (possible foreign) country's national internet exchange, the target server's country's national exchange and finally the server's network provider's computers before it reaches the server. The same communication chain will happen when the server answers to your request. Each computer on (or even near) this chain can filter and monitor all your transfered information, if it's unencrypted an attacker can gather your private data, user-names and passwords.

This post focuses on securing parts or of this communication path. Securing your computer or server-side security is outside its scope.

There are various layers of securing your communication path. I've selected three of them that are easy to deploy. All examples are using Linux as this seems to be the only sensible choice when valuing your privacy, but most of the techniques can easily be deployed on OS X or [Windows](http://www.makeuseof.com/tag/how-to-tunnel-traffic-with-ssh/) too.

## HTTPS Everywhere

Many websites are available through HTTP and HTTPS, the latter employs encryption to secure communication between your computer and the server. As offering HTTPS imposes a high cost (performance- and money-wise) on the server company, most companies to not advertise usage of this secure protocol -- for example Facebook is currently switching to mandatory HTTPS after offering opt-in for a couple of months.

[HTTPS Everywhere](https://www.eff.org/https-everywhere) is a browser plugin for Firefox and Google Chrome that automatically chooses HTTPS over HTTP for sites that do support HTTPS. This provides strong end-to-end privacy -- there's a secure line between your computer und the web server, i.e. no computer within the network path can extract private information.

Instant secure browsing for free!

## Tunneling through Open SSH with Socks5

Most UNIX users have encountered SSH as means of accessing remote UNIX systems. Recent versions (since around 2004 or earlier) of the SSH server support a SOCKS5 proxy mode: this means that any client supporting SOCKS5 can use an Open SSH server to tunnel it's traffic through the SSH server. Your communication is first securely transported to the SSH Server, from there you are communicating with the target server in public.

This means that the communication between the OpenSSH Server and the final server is not secured by using the tunnel. But remember the initial communication chain: when using a SSH Server you're at least countering eavesdroppers at the coffee shop, their network provider, when abroad: countries that might want to listen on your traffic. That might come handy in [China](http://www.greatfirewallofchina.org/). Or in the [United States](http://rt.com/usa/news/surveillance-spying-e-mail-citizens-178/). You can also use this technique with a foreign SSH server to make it harder to track your communication by your local government. In addition no-one in the communication chain prior to the SSH server can identify the name of the web server you're talking to -- so an observer cannot tell that you're accessing a porn site.

In addition SSH accounts are cheap (or even free) as you're getting as soon as you're renting a UNIX (virtual) Server. Many universities are giving them out for free. You could even [rent a Amazon EC2 instance and setup OpenSSH on it](https://help.ubuntu.com/community/EC2StartersGuide). Performance is lower than with real VPNs but there's nil setup costs so I'd call this a cheap ad-hoc network.

How to set this up? I expect you to have a SSH account with a login, I'm using "user@sshserver" for this example. First start up the SOCKS5 tunnel:

~~~ bash
$ ssh -f -N -D 127.0.0.1:8080 user@sshserver
~~~

Now you can configure Firefox to use this tunnel (you find this dialog through Edit -> Preferences -> Advanced -> "Configure how Firefox connects to the internet" Settings

![](/assets/2012-vpn/firefox-settings.png)

Additional caveat: by default some Firefox traffic will not be utilizing your SOCKS5 Proxy, but you can easily change Firefox to do this by entering the special "about:config" URL and changing the value of "socks_remote_dns" from false to true.

![](/assets/2012-vpn/aboutconfig.png)

There are some tricks that allow non-SOCKS5 programs to still use this tunnel: [tsocks](http://tsocks.sourceforge.net) and [redsocks](http://darkk.net.ru/redsocks/) come to mind but those are not really written for an casual user so I'll deal with them in a latter blog post.

## Secure and Anonymize your Data with a VPN tunnel

HTTPS Everywhere encrypts traffic to a specific website, SSH Tunnels allow partial encryption for application supporting SOCKS5. As last solution we will deploy a full blown OpenVPN Tunnel to secure the whole computer communication. Be aware that this, like the SSH setup, only encrypts the traffic between your computer and the OpenVPN server -- the traffic between the OpenVPN Server and the final web server is still be vulnerable so better use HTTPS Everywhere to achieve end-to-end encryption.

There are various ways of getting an OpenVPN account: you can [setup one yourself](http://holgr.com/blog/2009/06/setting-up-openvpn-on-amazons-ec2/), your University might offer one for free or you can rent one. See this [list of privacy-heeding OpenVPN providers](https://torrentfreak.com/which-vpn-providers-really-take-anonymity-seriously-111007/) -- this might be a good way of anonymzing your BitTorrent traffic. I'm using [Private Internet Access](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) mostly because they support all my Systems (iPad, Android Phone, Linux/Mac/Windows-PCs), are cheap (~$40/year) and  claim to delete all their log files every 24 hours (Note: if you're clicking on the Private Internet Link I'll be entered as referrer and would gain some benefits from that, thank you). I want to show it's configuration with [network-manager](http://projects.gnome.org/NetworkManager/) as this seems to be the de-facto standard for dynamic network configuration within Desktop Linuxes.

First of all [create your account](https://www.privateinternetaccess.com/pages/buy-vpn/SNIKT001) and collect your user-name, password and a [ZIP archive containing the CA.crt file](https://www.privateinternetaccess.com/openvpn/openvpn-ip.zip). When using Ubuntu/Debian you can install the needed software packages by:

~~~ bash
$ sudo apt-get install network-manager-openvpn-gnome
~~~

Reboot your system afterwards. Now you can configure the VPN in your network settings:

![](/assets/2012-vpn/network-settings.jpg "Entering network-manager settings")

Press the '+' Button and add a new VPN connection of type OpenVPN. You can copy my VPN settings and keep the default IPv4 Settings, don't forget to select your downloaded CA.crt file.

![](/assets/2012-vpn/settings-2.png)

Private Internet Access has multiple servers in different countries, I'm using swiss.privatinternetsecurity.com as this the fasted one for me (as I'm in Austria/Europe). Feel free to test the different servers, you'll just have to change the Server host name in the configuration. 

Now you can enable the tunnel by clicking on it's name in the network manager VPN section:

![](/assets/2012-vpn/start-it.jpg)

Freedom! I hope this helps you. At least it should give you some tools to make oppressive regimes's/company's job harder.

### Appendix: Speed/Performance Test

I'm testing the speed difference from my local computer (in Vienna, Austria -- behind a 30mbit cable modem connection) when accessing a [local national news site](http://news.orf.at). To do this I'm utilizing the Apache ab command ("ab -n 10000 -c 12 http://news.orf.at"), the results (all times in ms):

{::options parse_block_html="true" /}

<div class="table table-bordered table-condensed table-striped">

| Tunnel | Min | Mean | S.D. | Median | Max | 75% <= | 95% <= | 99% <= |
|:---- | :---- | :--- | :--- | 
| none/direct connection| 237 | 568 | 112 | 550 | 1097 | 607 | 799 | 951 |
| SSH using proxychains<br/>with a german server | 324 | 1607 | 209 | 1571 | 5011 | 1686 | 1949 | 2167 |
| PIA (swiss server) | 1117 | 2594 | 608 | 2454 | 6716 | 2907 | 3802 | 4611 |

</div>

<p>So the price for safety is tripple the latency (when using SSH), when adding anonymity this is doubled again..</p>

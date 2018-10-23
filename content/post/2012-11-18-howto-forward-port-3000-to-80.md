---
layout: post
title: "Linux: How to forward port 3000 to port 80"
date: 2012-11-18
aliases:
  - /blog/2012/11/18/howto-fordward-port-3000-to-80
comments: true
tags: ["linux", "rails", "iptables", "network"]
description: "Howto forward port 3000 to port 80 under Linux."
keywords: "postgresql, postgres, owner, linux, change ownership, change owner"
---
Another small tip: to locally forward port 80 to port 3000 use the following Linux iptables command:

~~~ bash
$ sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
~~~

You can use this command to allow customers to connect to your locally run Ruby on Rails setup (as long as you have some port forwarding set up on your local router). I am using this to develop facebook open graph apps as the application URL (that is configured within facebook's app controll page) cannot include a custom port (like 3000).

---
layout: post
title: "OSCP: Check!"
date: 2016-02-07
aliases:
  - /blog/2015/11/13/oscp-check
categories: ["life", "security"]
---

I have just received my
[OSCP](https://www.offensive-security.com/information-security-certifications/oscp-offensive-security-certified-professional/)
exam success notification. This is a penetration-testing certification by
[Offensive Security](https://www.offensive-security.com) with focus on
hands-on-training.<!-- more --> You get an eBook and a week's worth of video
lectures with guided exercises; access to a virtual lab with approximately 55
machines that you should gain full control over and will finish with an 24 hour
exam in which you are supposed to root five target machines. All this should be
documented and submitted at last 24 hours after your exam is over -- my
documentation had 264 pages.

Full-disclosure: I am doing professional penetration tests for three years,
have ~17 years of IT-admin/software-development background and am fluent in a
couple of programming languages. The guided exercise and lab took me 31 work
days (with 8h+ per day), documentation two or three more. I conquered all systems in the lab and finished the exam after 13 hours with all systems taken over.

The certification was energy and time consuming but fun. System were ranging
from old (Windows XP, Linux 2.something) to new-ish (Windows 8.1, Windows
Server 2008R2). During the course you will have to develop one or two exploits
of your own, so skills in C, Python or Ruby will help. The only slightly
negative thing is that Offensive Security does not teach you, but rather gives
you the tools and environment to teach yourself. Makes the certification more
valuable in my opinion. In contrast to the real world you that there is a
vulnerability within the target system; this helps to stay focused for hours.
The certification shows that you have a will to persist, a high pain threshold
and are able to learn by yourself.

Some hints for the lab itself:

* Never forget to try simple credentials like "admin:admin",
  "hostname:hostname" or default credentials. This took me way to long to
figure out.
* Enumeration is key. When using nmap don't forget the "-p-" switch. Do
  UDP and SNMP scans!
* If nothing works, revert the machine.
* Don't forget to have fun! There's one
  machine (edbmachine, might be .219) which is replaced every month -- I made
  the error of ignoring that machine for too long and missed the opportunity
for more fun.
* get a learning buddy. Discuss your ideas but don't cross the line and cheat

---
layout: "post"
tags: ["security", "review"]
title: "Review: Penetration Testing with BackBox"
keywords: "pen-test penetration testing BackBox Linux security review"
aliases:
  - /blog/2014/04/25/review-penetration-testing-with-backbox
date: 2014-09-09
---

Full-disclosure: I was asked by [PacktPublishing](https://www.packtpub.com/) to provide a review of [Penetration Testing with BackBox](http://bit.ly/1fF2N6z) by Stefan Umit Uygur. They offered me a free copy of the ebook; otherwise I have not been compensated by any means for this review.

The book aims to be an introduction to penetration-testing for experienced Unix/Linux users or administrators (seems like there are Linux users that aren't administrators by now). After reading the book I believe that the assumed use-case is an administrator that wants to gain some insight into the tools that might be used against his server. Other parts of the books (hash cracking, tools) might allure aspirating script kiddies.

<!-- more -->

## The good

The book is methodical: it starts by listing available tools and giving a short description of their intended use. This is perfect for a newcomer that doesn't even know which tools are out there and should be a good starting point for custom inquiries. The book flow is structured very logically: it starts with information gathering (via nmap/OpenVAS), progresses into exploitation (sqlmap with a sprinkling of metasploit), mentions some advanced techniques (sslstrip, hash cracking) and finishes with going through magictree (documentation/productivity tool).

One highlight is a "simulated" penetration test that mimics a "real" one-server penetration test. I would prefer more "hands-on" pen-test examples throughout the book. Otherwise it might run into the problem that it is not to different to existing online walkthroughs and tutorials. In my opinion its main difference to those tutorials is, that it is printed out, written in a very comprehensive way and provides an good initial overview of the tool landscape. If you already have experience with pen-testing tools, you could skip the book though.

## Things out-of-scope

The book's scope is on investigating one single server -- this does not reflect on-site penetration tests I've been seeing. Systems are fairly safe, but you can find small foot-holds within the different systems in the network (this includes VoIP-systems, printers, network hardware -- not just computers or servers). Through combination of those small findings slowly you gain a stronger hold upon single systems and (maybe) can compromise the whole computer network. This approach is often called "tactical penetration testing" and has IMHO a better success rate.

Another thing that I find lacking is application-level penetration testing. Most of the book focuses upon information gathering and performing a security assessment: finding out which software in which (possible) vulnerable version is installed and listing possible exploits (the sqlmap chapter is an exception to this). Manually checking applications (i.e. web applications) for flaws is not covered -- this is one area in which I have gotten very good results (security does not always have the highest significance, developers are worn out and tired -- bugs will happen). As the audience for the book are system administrators and not developers this seems to be out-of-scope for the book, but a chapter detailing the [OWASP Top 10](https://www.owasp.org/index.php/Top_10_2013-Introduction) would have helped.

Client-side attacks ("watering hole attacks") were out-of-scope too.

## Verdict

I would recommend this book to Linux users that want to sniff some penetration-testing air and don't know where to start or which tools even exist. I do fear that the target audience might also be upcoming script kiddies as the book mostly focuses upon tools and not techniques. While being a good start additional documentation will be mandatory for someone wanting to get into professional penetration testing -- "tactical approaches", application-level testing and "client-side attacks" are way to common and successful to be not in one's arsenal.

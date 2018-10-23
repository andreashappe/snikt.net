---
layout: post
tags: ["productivity"]
aliases:
  - /blog/2012/05/01/how-i-operate
title: The Lazy Engineer
description: "How I operate"
keywords: "Meditation, coffee, kindle, readitlater, pocket, productivity"
date: "2012-10-28"

---

Recently I've switched my working day to a more enjoyable pace -- and noticed that my productivity rose too. Too many friends claimed that I'm just plain lazily so this post tries to clarify my mode of operation.

The basic idea is to reduce procrastination and improve my attention span through voluntary self-censorship.

<!-- more -->

Some caveat beforehands: I am working as self-employed independent software contractor, thus my work has some unique properties:

 * it's highly location independent: I can work from (almost) whereever it pleases me
 * there's not concrete timeplan: most working times derive from impending deadlines
 * my hourly rate is high enough to allow me some 'slack' worktime
 * research is an integral part of my work

## Main Idea

The main idea is a simple "when at work, work". I'm trying to plan my day around one or two 2-3h work sessions. The rest of my work day is spent in informal R&D sessions. The main goal is to boost my productivity through this sessions that all mandatory work can still be done through the short 'normal' work sessions.

My first idea was to reduce interruptions within my work sessions. My main interruption sources are IM notifications and unmotivated browsing through news sites. The former is easy to fix (just uninstall your chat client), the latter is a little bit harder.

My solution was to block "unwanted" sites at the router level. I am using a custom Tomatoe-based router which allows me to block sites for all computers within my network through it's web gui. You can do this in three different ways:

1. enable "Access Restrictions" and state web sites that should be blocked
2. use the DNS server on the router to redirect DNS requests for unwanted sites to 127.0.0.1
3. fix the routing tables and let requests for unwanted sites wander around endlessly

Way 2 and 3 are needed as Access Restrictions only work with HTTP sites -- as soon as you are using HTTPS the router cannot block anything anymore. Way number 1 would be the most elegant as it would allow you to only block sites during your working hours.

![](/assets/tomatoe_ssl.png)

I've blocked the typical social networking sites like twitter and facebook. If somebody messages me my Android Phone will notice me sooner or later anyways. The other blocked sites mostly fall into the broad news sites category. The selection criteria is easy: as long as you're not feeling like a small-country-dictator, you're doing it wrong!

How do I get my news nowadays? {"I schedule a daily visit to a coffee shop."} As coffee shops tend to have multiple different news papers my information diet gets a bit diverse through that -- after reading ["The Information Diet"](http://www.amazon.de/The-Information-Diet-Conscious-Consumption/dp/1449304680/ref=sr_1_1?ie=UTF8&qid=1335994055&sr=8-1) this actually sounds like a good idea.

Isn't this to expensive and time-intensive? Surprisingly no. Visiting the coffee shop consumes less time than constantly checking news sites, thus I eary more money in my work-time. Also a small espresso costs approximately as much as a daily newspaper that I'd have to buy otherwise.

This also pushes me to get away from my desk and wander to the coffee shop -- movement is never bad

## Decouple research from work

Remember the daily research sessions?

My work news processing workflow is rather efficient: start with reading news through [Google Reader](http://www.google.com/reader). All noteworthy articles get marked and transfered to [Read It Later (now Pocket)](http://www.getpocket.com). Later on I can either use my iPad or my Kindle to read those articles (I'm employing Calibre to convert my Reading List into a Kindle-compatible document).

This allows me to decouple my research session from my office. My mind works better when I am away from my desk: on-desk I'm to immensed into my current tasks to step back and visualize the big picture or concentrate on R&D.

In winter I tend to combine visiting the coffee shop and the research session, in summer I just walk to the next park and read the stuff while lying in the sun. The "short" walk from my office to the coffeeshop to the park and back is around two and a half miles.. perfect time to schedule phone conferences or reflect on stuff.

## Create a clutter-free Environment

I try to keep my Desktop as clutter free as possible. Begone are most IM notifiers, Gmail notifiers, facebook popups etc. as I am using my phone as the one unified communication center -- which I can easily put on-hold through enabling the airplane mode.

My desktop:

![](/assets/desktop.png)

This is a slighly customized Xubuntu/Linux Desktop utilizing avant-window-navigator as dock. On the top left is an an application menu -- so that I can check which applications are actually installed on my computer and ont he top right is a clock and notification center (both configured to auto-hide).

---
layout: post
title: "Switching a Xiaomi Mi Mix 2s to LinageOS (Android 9)"
categories: ["tech"]
date: 2019-06-11
---

Recently I upgraded from my "old" [Motorola/Lenovo G6 plus](https://amzn.to/2MBZOIL) to a [Xiaomi Mi Mix 2s](https://amzn.to/2IAkP1c).

## Why the new phone?

Main reasons for that upgrade were:

* The old phone started to look like a banana. Seriously, I carry my phone in my back pockets and after a year that.. let to a more-than-slightly bent phone. This might have let to another problem: random vibra-call activation. Originally I thought that I was just imagining them, but recently my phone started to vibrate while it was in my hand --- while no notification or interaction at all was happening.
* Both the USB-C as well as the audio jack were already broken; cables tended to loose connection.. it was annoying to find out that the phone wasn't charged up after a night because the connection was not stable.
* Size: the phone was just too big to carry around comfortably.
* Recently Lenovo's software upgrade policy turned to the worse: while the phone was recently upgraded to Android 9, 6 months went by without any of the monthly Android security upgrades. As those included fixes for critical remote exploitable vulnerabilities, not having access to upgrades was a no-go for me (I do work in security after all).
* Mandatory apps; there were both Google's (Keep, etc.) as well as Lenovo's mandatory apps (LinkedIn, Outlook, etc.) installed on the old phone; as an user you are not able to remove them. This disturbed my sense of minimalism.
* No notification LED: this seems small, but a notification LED is something that I highly value. Periodically activating my phone just to check for new notifications is playing havoc with my concentration, so this feature is very dear to me.

So I looked out for an [Android One](https://www.android.com/one/) or [LinageOS](https://linageos.org) phone, that was smaller than my current one and offered dual-SIM functionality (as I want to keep my old private phone number --- this one is used by Signal/WhatApp and I'd like to avoid notifying all my contacts).

The candidate seemed to be a [BQ Aquarius X2 Pro](https://www.bq.com/de/aquaris-x2-pro). Alas, this phone had an expected delivery time of two to three months. That was a no-go. So I finally settled on a Xiaomi Mi Mix 2s (which sells for around 300 Euros here in Austria) and replaced the original ROM/Operating System with an Open-Source Android ROM ([LinageOS](https://lineageos.org/), formerly known as CyanogenMod).

## How to perform the LinageOS upgrade

The [installation steps](https://wiki.lineageos.org/devices/polaris/install) were quite easy but a bit time-consuming:

1. Register a new [Xiaomi Forum Account](https://en.miui.com/forum.php). Do that now cause otherwise you will need to do that during unlocking.. and that let me to a Chinese site on which I randomly clicked on links.
2. On the phone, go into the settings dialog and register the phone with the newly registered Xiaomi Account.
3. Register your phone number as recovery phone number within your Xiaomi Account, otherwise the unlock operation will not work.
4. Request the unlock through the [Xiaomi Unlock Page](https://en.miui.com/unlock/). You will need to enter your Xiaomi Account and then are forced to wait for a time-period until you are allowed to unlock (this was 72 hours for me). It seems as there was a bypass for this a couple of months ago but sadly this has been fixed by Xiaomi by now. Note that if you register the phone with another account, the timeout period will start again.
5. After 72hours, you are able to download a Windows binary/application which will perform the unlock. I tried to achieve this within a Windows VM (where I passed the Android Phone USB device through to) but this didn't work consistently.

Now you can follow the [LinageOS](https://wiki.lineageos.org/devices/polaris/install) and [TWRP](https://dl.twrp.me/polaris/) installation instructions to first flash the recovery, and then the LinageOS system ROM. Be more intelligent then me and use the right TWRP image (: I tried to flash the TWRP image of the Mi Mix 2 instead of the Mi Mix 2s. Rest assured, this just leads to your phone rebooting itself multiple times and then a revert to the old factory image --- so even in this case of (my) stupidity no physical harm was done to the phone hardware.

As a final step I installed [Open Gapps](https://opengapps.org/) for a minimal Google Android Application set. Originally I wanted to go with the Aroma Variant which allows to replace the ASOP/LinageOS provided applications with they Google counterpart on a one-on-one basis. Sadly the installation package was unstable so I went with the "nano" variant which is a minimal application set. In this case, all needed Google applications can directly be downloaded through the Google app store. This leads to some redundant packages (LinageOS Email vs Gmail, Messaging vs Signal, Gallery vs. Google Photos and Browser vs. Firefox) but I can live with that --- or rather, I'll look how to remove the unneeded ASOP/LinageOS applications in the future.

In other news, I forgot to backup my WhatsApp and Signal conversations before moving to the new phone --- I lost all my old chat history and images, a pity but I try to reframe this as spring cleaning.

## So how does the new phone compare to the old one?

What differences do I see between my G6 plus with Android 9 and the Mi Mix 2s with it's LinageOS Android 9 flavor?

* The hardware is gorgeous. Screen size and resolution are the same while the phone's height is 15mm smaller: win! The screen is beautiful but oversaturated --- it seems that I can fix that within LinageOS' settings but I have to look into that.
* Performance-wise the new phone is amazing: the combination of a fast processor and six gigabytes of RAM (seriously) is fast.
* Daily software upgrades provided by LinageOS. I also gained access to some (otherwise) Google Pixel-only software packages such as [Digital Wellbeing](https://play.google.com/store/apps/details?id=com.google.android.apps.wellbeing&hl=de_AT).
* The placement of the fingerprint sensor is actually worse. On the G6 plus is was "behind" the front wake-up/home button --- so I used it implicitly when I turned on my phone. On the Mi Mix 2s it's situated on the back of the phone and I tend to not use it as it is hard to reach. Detection quality of the sensor might be worse too.
* Image quality is different, I am not sure if it is actually better or worse. I wanted to get a new DSLR anyways (;
* I am using [SoundCore Libery Air](https://amzn.to/2F0Gui7) wireless Bluetooth in-ear headphones. Actually, that was not so much of a free choice, as the audio jack on my old phone just stopped working and I cannot live without music. Good thing, I got them as the new phone doesn't even offer an audio jack (an USB_C converter was included with the phone though). Audio quality feels a bit worse, maybe this is related to the used Bluetooth Codec (the Libery Airs only support the AAC profile and maybe this is not automatically used --- need to look into that).

Having said that, I am actually very happy with this upgrade.

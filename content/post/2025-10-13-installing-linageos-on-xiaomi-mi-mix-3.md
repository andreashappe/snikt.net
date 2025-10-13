---
layout: post
title: "Installing LineageOS on Xiaomi Mi Mix 3"
categories: ["Tech"]
date: 2025-10-13
keywords:
- android
- lineageos
- xiaomi
---
I am using an (now 5 years old) [Xiaomi Mi Mix 3](https://wiki.lineageos.org/devices/perseus/) as a backup phone for travelling. Given its age, the phone is no longer receiving official updates from Xiaomi, which poses security risks and limits access to new features.

To address this, I installed LineageOS, a popular custom ROM that provides regular updates and enhanced privacy features a couple of years back. Recently, I've updated the phone to the latest support version (LinageOS 22.2) and ran into some problems, which's solutions I want to share here.

Basic steps to update my installation were straight-forward:

1. Overall, follow the official [LineageOS installation guide](https://wiki.lineageos.org/devices/perseus/install).
2. As I was not able to determine the current firmware versions on the phone, I performed the recommended [firmware update](https://wiki.lineageos.org/devices/perseus/fw_update/) first.
3. During installation, I also installed the suggested [Mind-the-GApps](https://wiki.lineageos.org/gapps/) support package, which provides Google services and apps. While the installation manual mentioned different versions of Mind-the-GApps (`normal` and `minimal`), I was not able to see these different flavours on the download page. The `normal` download package was quite minimal though (no gmail app, etc. installed).

I did run into a problem when trying to boot into the `fastboot` mode of the phone. While the expected logo did show up for a brief moment, afterwards the phone displayed `press key to shutdown` in very small fonts on the top-left corner of the screen.

I found a small shell script on [xdaforums](https://xdaforums.com/t/guide-xiaomi-how-to-fix-press-any-key-to-shutdown-while-in-fastboot-linux.4732089/) that solved the problem for me. As I do not want to execute random scripts from the internet as root, I want to share the relevant part (that just setups an USB quirk, this will be gone after a reboot of the Linux system):

```bash
$ echo "18d1:d00d:k" | sudo tee /sys/module/usbcore/parameters/quirks
```

With that, the installation went smooth and the phone is now running LineageOS 22.2.
---
layout: post
title: "Firejail: Chroot on Speed"
date: 2016-02-25
aliases:
  - /blog/2016/02/25/firejail-or-chroot-on-speed
categories: ["security", "linux", "tech"]
---

[Firejail](https://firejail.wordpress.com/) describes itself as _a SUID program that reduces the risk of security breaches by restricing the running environment of running programs_. We'll just call it chroot or jail (for the BSDers out there).<!-- more -->

## So, it's SUID?

First things first: it's SUID, so if there's an error within the firejail binary
an attacker can gain root rights. This comes with the territory. How large is
Firejail and how many dependencies does it have? It's written in C and:

~~~ bash
 ~  sudo dnf install Downloads/firejail-0.9.38-1.x86_64.rpm 
================================================================================
 Package          Arch           Version             Repository            Size
================================================================================
Installing:
 firejail         x86_64         0.9.38-1            @commandline         165 k

Transaction Summary
================================================================================
Install  1 Package

Total size: 165 k
Installed size: 417 k
~~~

Looks okay to me.

## What's the simplest use-case?

Let's just create a couple of sensitive files within a test user's home directory
and create the approximate process count:

~~~ bash
[test@JustReadTheInstructions ~]$ echo "too many secrets" > secret.txt
[test@JustReadTheInstructions ~]$ echo "trustno1" > secret2.tx

[test@JustReadTheInstructions ~]$ ls -a
.   .bash_history  .bash_profile  .mozilla    secret.txt    .zshrc
..  .bash_logout   .bashrc        secret2.tx  .xauthN4FQkH

[test@JustReadTheInstructions ~]$ ps aux | wc -l
261
~~~

Okay, so there are some dotfiles, two private files and approximately 261
processes running on my desktop. Let's start firejail with a bash (just calling
firejail would achieve the same):

~~~ bash
[test@JustReadTheInstructions ~]$ firejail
Reading profile /etc/firejail/generic.profile
Reading profile /etc/firejail/disable-mgmt.inc
Reading profile /etc/firejail/disable-secret.inc
Reading profile /etc/firejail/disable-common.inc

** Note: you can use --noprofile to disable generic.profile **

Parent pid 15671, child pid 15672

Child process initialized

[test@JustReadTheInstructions ~]$ ls -a
.   .bash_history  .bash_profile  .mozilla    secret.txt    .zshrc
..  .bash_logout   .bashrc	  secret2.tx  .xauthN4FQkH

[test@JustReadTheInstructions ~]$ cat secret.txt 
too many secrets

[test@JustReadTheInstructions ~]$ ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
65534        1  0.0  0.0   9848  1728 pts/0    S    22:04   0:00 firejail
test         2  0.0  0.0 119768  3496 pts/0    S    22:04   0:00 /bin/bash
test         8  0.0  0.0 158352  3984 pts/0    R+   22:04   0:00 ps aux

[test@JustReadTheInstructions ~]$ ping 8.8.8.8
bash: /usr/bin/ping: Operation not permitted

[test@JustReadTheInstructions ~]$ curl https://snikt.net > output.html
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 31182  100 31182    0     0  49815      0 --:--:-- --:--:-- --:--:-- 49811

[test@JustReadTheInstructions ~]$ ls -a
.   .bash_history  .bash_profile  .mozilla     .pki	   secret.txt	 .zshrc
..  .bash_logout   .bashrc	  output.html  secret2.tx  .xauthN4FQkH
~~~

Okay, what happened?

1. We see firejail's output -- some profiles have been loaded. More about that later on.
2. I am still within my home directory and can access my files.
3. But I cannot see any processes anymore
4. Weird: I cannot use /usr/bin/ping? Why? It has been disabled through a profile, we'll see more about this later on
5. But network still works, as seen with curl.

## Let's protect my homedirectory

Let's protect some files. There's the `--private` that creates an empty homedirectory
for firejail, let's try it:

~~~ bash
[test@JustReadTheInstructions ~]$ firejail --private bash
Reading profile /etc/firejail/generic.profile
Reading profile /etc/firejail/disable-mgmt.inc
Reading profile /etc/firejail/disable-secret.inc
Reading profile /etc/firejail/disable-common.inc

** Note: you can use --noprofile to disable generic.profile **

Parent pid 15716, child pid 15717

Child process initialized
[test@JustReadTheInstructions ~]$ pwd
/home/test

[test@JustReadTheInstructions ~]$ ls -a
.  ..  .bashrc

[test@JustReadTheInstructions ~]$ mount
bash: /usr/bin/mount: Permission denied
~~~

So it looks like I'm still within `/home/test/` but it is empty. I cannot call
mount (oh those pesky profiles). Let's check this from outside the jail:

~~~ bash
 ~  sudo cat /proc/15717/mounts | grep home
/dev/mapper/fedora-home /home ext4 rw,seclabel,relatime,data=ordered 0 0
/dev/mapper/fedora-home /run/firejail/mnt/orig-home ext4 rw,seclabel,relatime,data=ordered 0 0
tmpfs /home tmpfs rw,seclabel,nosuid,nodev,mode=755 0 0
/dev/mapper/fedora-home /home/test ext4 rw,seclabel,relatime,data=ordered 0 0
tmpfs /run/firejail/mnt/orig-home tmpfs rw,seclabel,nosuid,nodev,mode=755 0 0
tmpfs /home tmpfs rw,seclabel,nosuid,nodev,mode=755 0 0
tmpfs /home/test/.bashrc tmpfs ro,seclabel,mode=755 0 0
~~~

Ah, so firejail creates a temporary memory-based filesystem and mounts this
over my home directory. Nice.

But sometimes you'll want persistence. For that you can pass a directory to
the `--private` switch:

~~~ bash
[test@JustReadTheInstructions ~]$ mkdir a b

[test@JustReadTheInstructions ~]$ firejail --private=a bash
Reading profile /etc/firejail/generic.profile
Reading profile /etc/firejail/disable-mgmt.inc
Reading profile /etc/firejail/disable-secret.inc
Reading profile /etc/firejail/disable-common.inc

** Note: you can use --noprofile to disable generic.profile **

Parent pid 16336, child pid 16337

Child process initialized
[test@JustReadTheInstructions ~]$ ls

[test@JustReadTheInstructions ~]$ pwd
/home/test

[test@JustReadTheInstructions ~]$ touch some_file.txt

[test@JustReadTheInstructions ~]$ exit
exit

parent is shutting down, bye...
[test@JustReadTheInstructions ~]$ ls -ahl /home/test/a
total 16K
drwxrwxr-x. 2 test test 4.0K Feb 25 22:13 .
drwx------. 6 test test 4.0K Feb 25 22:13 ..
-rw-------. 1 test test   28 Feb 25 22:13 .bash_history
-rw-r--r--. 1 test test  231 Feb 25 22:13 .bashrc
-rw-rw-r--. 1 test test    0 Feb 25 22:13 some_file.txt
~~~

This is nice. Within the jail it looks like as if I'm still within `/home/test`.
We create a new file `some_file.txt` which finally appears within the directory
passed as parameter for `--private`.

That sounds interesting for on-the-fly changeroots for programs.

## Why is it called firejail?

Well because maybe it was intended to be used with Firefox? It integrates nicely
with GUI programs. For example, to start firefox in a more "anonymous mode", just
run:

~~~ bash
 ~  firejail --private firefox           
Reading profile /etc/firejail/firefox.profile
Reading profile /etc/firejail/disable-mgmt.inc
Reading profile /etc/firejail/disable-secret.inc
Reading profile /etc/firejail/disable-common.inc
Reading profile /etc/firejail/disable-devel.inc
Reading profile /etc/firejail/whitelist-common.inc
Parent pid 17173, child pid 17174
***
*** Warning: cannot whitelist Downloads directory
*** 	Any file saved will be lost when the sandbox is closed.
*** 	Please create a proper Downloads directory for your application.
***
Blacklist violations are logged to syslog

Child process initialized

parent is shutting down, bye...

(firefox is started!)
~~~

See how it automatically loaded the firefox profile (through matching the binary's name)?
The nice thing is, that I cannot access my home-directory through firefox anymore and all my changes will be thrown away after I close firefox.

But I can also create real separated profiles, think `firejail --private=profile-work firefox` and `firejail --private=profile-fun`.

## How to call firejail automatically?

Okay, firejail looks interesting. But what if I always forget to call `firejail program`?

Firejail got you covered! Look at the following output:

~~~ bash
 ~  ln -s /usr/bin/firejail ./bin/firefox

 ~  ./bin/firefox 

Redirecting symlink to /usr/bin/firefox

Reading profile /etc/firejail/firefox.profile
Reading profile /etc/firejail/disable-mgmt.inc
Reading profile /etc/firejail/disable-secret.inc
Reading profile /etc/firejail/disable-common.inc
Reading profile /etc/firejail/disable-devel.inc
Reading profile /etc/firejail/whitelist-common.inc
Parent pid 17066, child pid 17067
Blacklist violations are logged to syslog

Child process initialized

(now firefox runs)
~~~

What is firejail doing and why is firefox started? Well..

1. We created a symlink called firefox that links to /usr/bin/firejail
2. When we call the newly created firefox symlink, firejail is started
3. It then checks, that is was named firefox..
4. then searches for a Firefox binary within $PATH
5. and thus finally executes Firefox. Whee.

## Fun with the network

Yay, we can also limit networking with firejail. The easiest way is to disable
networking altogether within the jail through adding `--net=none`:

~~~ bash

 ~  firejail --private --net=none firefox

Reading profile /etc/firejail/firefox.profile
Reading profile /etc/firejail/disable-mgmt.inc
Reading profile /etc/firejail/disable-secret.inc
Reading profile /etc/firejail/disable-common.inc
Reading profile /etc/firejail/disable-devel.inc
Reading profile /etc/firejail/whitelist-common.inc
Parent pid 17743, child pid 17745
***
*** Warning: cannot whitelist Downloads directory
*** 	Any file saved will be lost when the sandbox is closed.
*** 	Please create a proper Downloads directory for your application.
***
Blacklist violations are logged to syslog

Child process initialized
~~~

This creates a very, very, very sad Firefox without any network connection.

I tried to make only a wireless or VPN interface available within my chroot/jail,
but sadly this failed. Will try further [as this would solve an old VPN problem of mine](https://snikt.net/blog/2013/10/10/how-to-force-program-to-use-vpn-tunnel/).

## What are those profiles?

So what are those mentioned profiles? Well, they are situated within `/etc/firejail`:

~~~
 ~  ls /etc/firejail
audacious.profile           google-chrome.profile           rtorrent.profile
bitlbee.profile             google-chrome-stable.profile    seamonkey-bin.profile
chromium-browser.profile    google-chrome-unstable.profile  seamonkey.profile
chromium.profile            hexchat.profile                 server.profile
clementine.profile          icecat.profile                  skype.profile
conkeror.profile            icedove.profile                 spotify.profile
deadbeef.profile            iceweasel.profile               steam.profile
deluge.profile              kmail.profile                   telegram.profile
disable-common.inc          login.users                     thunderbird.profile
disable-devel.inc           mathematica.profile             totem.profile
disable-mgmt.inc            Mathematica.profile             transmission-gtk.profile
disable-secret.inc          midori.profile                  transmission-qt.profile
dropbox.profile             mupen64plus.profile             uget-gtk.profile
empathy.profile             nolocal.net                     unbound.profile
evince.profile              opera-beta.profile              vlc.profile
fbreader.profile            opera.profile                   webserver.net
filezilla.profile           parole.profile                  weechat-curses.profile
firefox.profile             pidgin.profile                  weechat.profile
generic.profile             qbittorrent.profile             whitelist-common.inc
gnome-mplayer.profile       quassel.profile                 wine.profile
google-chrome-beta.profile  rhythmbox.profile               xchat.profile
~~~

Let's look at one:

~~~ bash
# Spotify profile
include /etc/firejail/disable-mgmt.inc
include /etc/firejail/disable-secret.inc
include /etc/firejail/disable-common.inc
include /etc/firejail/disable-devel.inc

# Whitelist the folders needed by Spotify - This is more restrictive 
# than a blacklist though, but this is all spotify requires for 
# streaming audio
whitelist ${HOME}/.config/spotify
whitelist ${HOME}/.local/share/spotify
whitelist ${HOME}/.cache/spotify
include /etc/firejail/whitelist-common.inc

caps.drop all
seccomp
protocol unix,inet,inet6,netlink
netfilter
noroot
~~~

So what is all this stuff doing? `include` includes other configuration files, i.e. the file that prevented the `ping` call earlier. `whitelist` is a bit confusing: what it does is, that it mounts a new temporary home directory (as seen before with `--private`) and then mounts the whitelisted directory within the homedirectory. So effectly changes to the whitelisted directories get persisted while all changes outside of whitelisted directories get thrown away on shutdown. For more information about profiles it's easiest to `man firejail-profile`.

But why is this nice? Quite easy: I do not trust most of the propietary binary
programs that are runnign on my system. Noone has ever audited that code or has
even the chance of auditing it. So I can start Spotify or Steam within a simple
chroot -- without even having the effort chroot creation or the effort of keeping
the Linux-System within the chroot up to date.

If you look at `/etc/firejail` I'm not the only one using firejail that way. Existing
profiles include:

* [steam](https://www.steampowered.com)
* [spotify](https://www.spotify.com)
* Skype
* Opera
* Google Chrome (which I need for netflix)

So overall I really like this tool. It still needs to be reviewed for security
bugs and I have to get the networking part running on my system..

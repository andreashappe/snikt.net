---
layout: post
title: "Homeserver: Creating local Proton Drive/Mail Backups"
categories: ["Linux", "Tech"]
date: 2025-04-27
keywords:
- linux
- server
- proton
- proton mail
- proton drive
---

Why am I doing this? I am using Proton Drive and Proton Mail for my private data. I want to have a local backup of my Proton Drive and Proton Mail data. This is a short guide on how to do this.

<!--more-->

## Proton Drive

### Basic Setup

- you have to use [rclone beta](https://beta.rclone.org/) for unofficial proton-drive support, direct link: https://beta.rclone.org/rclone-beta-latest-linux-amd64.zip
- [configuration instructions for proton login](https://rclone.org/protondrive/) -> you need to enter username, password and MFA code. I do not like this, but it is what it is.
- You can now call the clone process through `rclone sync protondrive: ./protodrive`. I run into rate-limits, but it seems to be able to cope

```bash
#!/bin/bash
/media/data/proton-backups/rclone-beta/rclone --config /media/data/proton-backups/rclone.conf sync proton:// /media/data/proton-backups/proton-backup --backup-dir=/media/data/proton-backups/incrementals/`date +%Y%m%d.%I%M%S`
```

### Systemd Integration

```
[Unit]
Description=Backup Proton Drive
ConditionPathIsMountPoint=/media/data
ConditionPathExists=/media/data/proton-backups/rclone.conf

[Service]
Type=oneshot
User=andy
ExecStart=/media/data/proton-backups/perform-backup.sh
```

```
[Unit]
Description=Proton Drive Backup Timer

[Timer]
OnCalendar=*-*-* 4:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

- howto enable the timer?
- howto check logs and status?

## Proton Mail

### Basic Setup

- needs GUI packages for install, but works on the cli
- https://gist.github.com/ibaiul/60d603845df931483a05d96c5b433981
- but I am using tmux

```bash
$ wget https://proton.me/download/bridge/protonmail-bridge_3.19.0-1_amd64.deb
$ sudo dpkg -i protonmail-bridge_3.19.0-1_amd64.deb
$ sudo apt install pass tmux
```

Protonmail-bridge script:

```
#!/bin/bash

case "$1" in
  start)
    # will start the bridge in a detached tmux session named 'protonmail-bridge'
    tmux new-session -d -s protonmail-bridge 'protonmail-bridge -c'
    echo "Service started."
    ;;
  status)
    # ignore this block unless you understand how screen works and that only lists the current user's screens
    result=$(tmux list-sessions | grep protonmail-bridge)
    if [ $? == 0 ]; then
      echo "Protonmail bridge service is ON."
    else
      echo "Protonmail bridge service is OFF."
    fi
    ;;
  stop)
    # Will quit a screen called "protonmail" and therefore terminate the running protonmail-bridge process
    tmux kill-session -t protonmail-bridge
    echo "Service stopped."
    ;;
  *)
    echo "Unknown command: $1"
    exit 1
  ;;
esac
```

- run the script with `./protonmail-bridge.sh start` to start the bridge
- run the script with `./protonmail-bridge.sh status` to check the status of the bridge
- run the script with `./protonmail-bridge.sh stop` to stop the bridge

### Systemd Integration


```
[Unit]
Description=Service to run the Protonmail bridge client
After=network.target
ConditionPathIsMountPoint=/media/data
ConditionPathExists=/media/data/proton-backups/start-protonmail-bridge.sh

[Service]
Type=oneshot
User=andy
ExecStart=/media/data/proton-backups/start-protonmail-bridge.sh start
ExecStop=/media/data/proton-backups/start-protonmail-bridge.sh stop
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

### Offline Imap

```
[Unit]
Description=Backup Proton Mail
ConditionPathIsMountPoint=/media/data
ConditionPathExists=/media/data/proton-backups/
Requires=protonmail-bridge.service
After=protonmail-bridge.service

[Service]
Type=oneshot
User=andy
ExecStart=/usr/bin/offlineimap
```

Move the offlineimap invocation into a cron job (that depends upon the proton-mail-bridge)

```
[general]
# List of accounts to be synced, separated by a comma.
accounts = main

[Account main]
# Identifier for the local repository; e.g. the maildir to be synced via IMAP.
localrepository = main-local
# Identifier for the remote repository; i.e. the actual IMAP, usually non-local.
remoterepository = main-remote

[Repository main-local]
# OfflineIMAP supports Maildir, GmailMaildir, and IMAP for local repositories.
type = Maildir
# Where should the mail be placed?
localfolders = /media/data/proton-backups/mail

[Repository main-remote]
# Remote repos can be IMAP or Gmail, the latter being a preconfigured IMAP.
# SSL and STARTTLS are enabled by default.
type = IMAP
remotehost = 127.0.0.1
remoteport = 1143
remoteuser = andreas@offensive.one
remotepass = GPRV9kYf2lmmzR8c4WXhmw
# Necessary for SSL connections, if using offlineimap version > 6.5.4
sslcacertfile = /etc/ssl/certs/ca-certificates.crt
starttls = yes
ssl = no
readonly = true
```

add a timer for backup scripts

```
[Unit]
Description=Proton Mail Backup Timer

[Timer]
OnCalendar=*-*-* 4:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

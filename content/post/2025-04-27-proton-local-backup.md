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
By now, I am using Proton Drive for cloud data storage and Proton Mail as my primary mail service. While I trust Proton with my data, I do not want to rely on them completely. As I have [a small server](https://snikt.net/blog/2025/04/05/building-a-little-home-server-with-linux-tailscale-protonvpn-docker-compose-and-vm-support/) standing around at home, it's kinda obvious to use it for automatically performing backups of my cloud data.

I try to use [systemd](https://systemd.io/) services and timers for this, as this makes monitoring and logging quite easy.

This blog post mostly serves as a reminder for me, but maybe it helps someone else as well.

<!--more-->

Our backup drive will be mounted at `/media/data`. All locally stored data (including configuration files) will be saved at `/media/data/proton-backups`.

## Basic Systemd Information

[systemd](https://systemd.io) is the de-facto standard for managing services on Linux. For our use-case we will use services and timers. A service is a unit of work that systemd can manage, while a timer is a unit that can trigger a service at specific times.

A service can either be a long-running process or a `oneshot` process. We will use oneshot processes for our backups, as they are not long-running processes. A oneshot process will run once and then exit. This is useful for backup scripts, as we do not want them to run continuously.

A nice benefit of using systemd units is that you can use the `ConditionPathExists` and `ConditionPathIsMountPoint` options to check if a specific path exists or is mounted. This is useful for checking if the backup drive is mounted before running the backup script. In addition, you can use the `After` option to specify that a service should only run after another service has finished. This is useful for ensuring that the Proton Mail bridge is running before running the mail backup script.

A timer can be triggered at specific times, or at specific intervals. It typically calls one of our oneshot services.

Using systemd also makes checking the status of the services and timers easy. You can use `systemctl status <service>` to check the status of a service, and `systemctl list-timers` to check the status of all timers. You can also use `journalctl -u <service>` to check the logs of a specific service.

## Proton Drive

We want to perform a backup of our Proton Drive every day at 4:00 AM. While there is no official Proton Drive client for Linux, we can use [rclone](https://rclone.org/) to perform the backup.

### Basic Setup of Rclone

You have to use the [rclone beta](https://beta.rclone.org/) for unofficial proton-drive support. If you want to download it, there is a [direct link to the lastest version](https://beta.rclone.org/rclone-beta-latest-linux-amd64.zip).

Before using it, we need to setup it by calling `rclone config`. This will create a configuration file in `~/.config/rclone/rclone.conf`. You can also specify a different location for the config file by using the `--config` option. See the [configuration instructions for proton login](https://rclone.org/protondrive/). You need to enter username, password and MFA code --- I do not like this, but it is what it is.

You can now call the clone process through `rclone sync protondrive: /media/data/proton-backups/prton-backup/`. I run into rate-limits, but it seems to be able to cope

Let's make this easier to automate by creating a script that will perform the backup. The script will be stored at `/media/data/proton-backups/perform-backup.sh`:

```bash
#!/bin/bash
/media/data/proton-backups/rclone-beta/rclone --config /media/data/proton-backups/rclone.conf sync proton:// /media/data/proton-backups/proton-backup --backup-dir=/media/data/proton-backups/incrementals/`date +%Y%m%d.%I%M%S`
```

Don't forget to make the script executable by running `chmod +x /media/data/proton-backups/perform-backup.sh`.

### Systemd Integration for Rclone

Let's start by creating a systemd service that will run the backup script. The service will be stored at `/etc/systemd/system/proton-drive-backup.service`:

```ini
[Unit]
Description=Backup Proton Drive
ConditionPathIsMountPoint=/media/data
ConditionPathExists=/media/data/proton-backups/rclone.conf

[Service]
Type=oneshot
User=andy
ExecStart=/media/data/proton-backups/perform-backup.sh
```

It should be pretty straightforward to understand. We check if the backup drive is mounted and if the rclone config file exists. If both conditions are met, we run the backup script.

You can start the service by running `systemctl start proton-drive-backup.service`. You can check the status of the service by running `systemctl status proton-drive-backup.service`. You can also check the logs of the service by running `journalctl -u proton-drive-backup.service`.

And finally let's add a timer that will run the backup script every day at 4:00 AM. The timer will be stored at `/etc/systemd/system/proton-drive-backup.timer`:

```ini
[Unit]
Description=Proton Drive Backup Timer

[Timer]
OnCalendar=*-*-* 4:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

You can enable the timer by running `systemctl enable --now proton-drive-backup.timer`. You can check the status of the timer by running `systemctl list-timers --all`. You can also check the logs of the timer by running `journalctl -u proton-drive-backup.timer`.

And that's it.

## Proton Mail

Proton Mail is a bit more complicated, as we need to use the Proton Mail Bridge to access our Proton Mail account via IMAP. The Proton Mail Bridge is a local application that runs on your computer and acts as a bridge between your Proton Mail account and your email client. It allows you to use any email client that supports IMAP and SMTP to access your Proton Mail account.

We will then use [offlineimap](https://github.com/OfflineIMAP/offlineimap) to perform the backup by syncing the Proton Mailbridge IMAP account with a local maildir.

### Basic Setup of Proton Mail Bridge

Let's start by installing the Proton Mail Bridge. You can download the latest version from the [Proton Mail Bridge website](https://proton.me/bridge). We will also need to install the `pass` and `tmux` packages, as we will use them to manage the Proton Mail Bridge process.

Most of this is based upon [this github gist](https://gist.github.com/ibaiul/60d603845df931483a05d96c5b433981) but was adapted by me to use tmux and systemd timers.

```bash
wget https://proton.me/download/bridge/protonmail-bridge_3.19.0-1_amd64.deb
sudo dpkg -i protonmail-bridge_3.19.0-1_amd64.deb
sudo apt install pass tmux
```

Now start protonmail-bridge and login to your Proton Mail account. You will need to enter your username, password, and MFA code. Note the IMAP and SMTP credentials that are displayed in the Proton Mail Bridge application. You will need them later to configure offlineimap.

To automatically start the Proton Mail Bridge, we will create a script that will start the bridge in a detached tmux session. The script will be stored at `/media/data/proton-backups/start-protonmail-bridge.sh`:

```bash
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

Don't forget to make the script executable by running `chmod +x /media/data/proton-backups/start-protonmail-bridge.sh`.

You can start the script by running `./start-protonmail-bridge.sh start`. You can check the status of the script by running `./start-protonmail-bridge.sh status`. You can stop the script by running `./start-protonmail-bridge.sh stop`.

This feels like a systemd service, doesn't it? Well, we will create a systemd service that will run the script. The service will be stored at `/etc/systemd/system/protonmail-bridge.service`:

### Systemd Integration for Proton Mail Bridge

As we already have a script that can start and stop the Proton Mail Bridge, we can create a systemd service that will run the script. The service will be stored at `/etc/systemd/system/protonmail-bridge.service`:

```ini
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

You can enable this service by running `systemctl enable --now protonmail-bridge.service`. You can check the status of the service by running `systemctl status protonmail-bridge.service`. You can also check the logs of the service by running `journalctl -u protonmail-bridge.service`.

### Offline Imap

Now we can use offlineimap to perform the backup. Offlineimap is a command-line tool that allows you to sync your email accounts with a local maildir. It supports IMAP and Gmail, and it can be used to sync your Proton Mail account with a local maildir.

Let's create a configuration file for offlineimap. The configuration file will be stored at `~/.offlineimaprc` (should move this into the backup directory maybe):

```ini
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
remotepass = password-that-was-generated-by-protonmail-bridge
# Necessary for SSL connections, if using offlineimap version > 6.5.4
sslcacertfile = /etc/ssl/certs/ca-certificates.crt
starttls = yes
ssl = no
readonly = true
```

### Systemd Integration for offlineimap

Finally, we can create a systemd service that will run offlineimap. The service will be stored at `/etc/systemd/system/protonmail-backup.service`:

```ini
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

We are using the `Requires` and `After` options to ensure that the Proton Mail Bridge is running before running the offlineimap service. This is important, as offlineimap needs to connect to the Proton Mail Bridge to access your Proton Mail account.

And finally, let's add a timer that will run the offlineimap service every day at 4:00 AM. The timer will be stored at `/etc/systemd/system/protonmail-backup.timer`:

```ini
[Unit]
Description=Proton Mail Backup Timer

[Timer]
OnCalendar=*-*-* 4:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

And that's it. You can enable the timer by running `systemctl enable --now protonmail-backup.timer`. You can check the status of the timer by running `systemctl list-timers --all`. You can also check the logs of the timer by running `journalctl -u protonmail-backup.timer`.

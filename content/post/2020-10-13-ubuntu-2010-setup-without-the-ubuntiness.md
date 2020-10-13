---
layout: post
title: "Create a new Ubuntu 20.10 Desktop without too much Ubuntiness."
categories: ["tech", "linux"]
date: 2020-10-13
keywords:
- linux
- ubuntu
- desktop
- setup
---

After I've bought a [new and fast 1TB SSD](https://amzn.to/34Tqc6X), it's time to setup my aging Desktop again. Last time I went with [Fedora Core](https://getfedora.org), this time I will try to reduce some of the ubuntu-iness of a [Ubuntu 20.10 Desktop](http://cdimage.ubuntu.com/daily-live/current/) for that. After preliminary tests Ubuntu seems to be more resource efficient than [Fedora Silverblue](https://silverblue.fedoraproject.org/) and I should be able to remove most of Ubuntu's problematic packages. Given that my Notebook still runs Fedora Core, I'm also keeping in touch with both the Ubuntu/Debian as well as with the Redhat/Fedora world through that.

I am using a fairly basic setup: a small ESP (UEFI boot) partition and one large ext4 partition for / as well as /home. For encryption I am currently going with [fscrypt](https://wiki.archlinux.org/index.php/Fscrypt) and per-directory encryption. This allows me to use different pass-phrases for different Projects. My prior setup was using full-disk encryption through [dm_crpyt](https://wiki.archlinux.org/index.php/dm-crypt) (as does my laptop), but the performance impact seemed a tad excessive given that this is my Desktop at home where my threat model states "game over" as soon as an attacker gains physical access anyway. Still, I would feel better if I could get some integrity protection (such as [dm-verity](https://www.kynetics.com/docs/2018/introduction-to-dm-verity-on-android/)) into place. Why ext4? Mostly because Ubuntu doesn't support F2FS and I didn't want to try btrfs with my Desktop filesystem.

This post is one of my document-stuff-for-myself posts, hopefully I won't need it in the near future..

## Remove a bit of Ubuntu-iness

There are some Ubuntu software decisions that I do not really like: I prefer the vanilla GNOME Desktop to Ubuntu's version. And the whole "force users to use snap"-thing never bode well with me, so replace snapd with flatpak.

### Switch to a more-vanilla GNOME Setup

So lets start by removing some of the customized Ubuntu themes and replacing it with a standard gnome desktop:

~~~ bash
$ sudo apt remove --purge snapd ubuntu-desktop ubuntu-minimal
$ sudo apt install gnome vim-gtk3
$ sudo /sbin/reboot # into gnome by chosing "gnome" in the login dialog
$ apt remove --purge ubuntu-session ubuntu-settings ubuntu-report gnome-shell-extension-ubuntu-dock yaru-theme-gnome-shell yaru-theme-gtk yaru-theme-icon yaru-theme-sound
~~~

### Replace Ubuntu snap with flatpak

While it is getting better, the Not-Invented-Here syndrom is still strong in Ubuntu. Let's remove it's custom desktop container technology (snap) and replace it with flatpak which is supported by more distributions:

~~~ bash
$ apt remove --purge snapd
$ apt install gnome-software-plugin-flatpak
~~~
## Basic System Setup Steps

And add common tools while removing some unneeded features..

### Setup encrypted ~/Documents

Time to set up per-directory encryption (I am using it to transparently encrypt my Document-Folder) through fscrypt:

~~~ bash
$ sudo apt install fscrypt libpam-fscrypt
$ sudo fscrypt setup
$ sudo tune2fs -O encrypt /dev/nvme0n1p2
# I've chosen the login-password based option for encrypting Documents
$ fscrypt encrypt ~/Documents
~~~

### Add some basic System Tools

Those are tools that I'm gonna need sooner or later anyways:

~~~ bash
$ sudo apt install curl git firejail openssh-server cryptsetup
~~~

### Remove some System Tools

There are some system tools that I am not using, let's remove them:

~~~ bash
$ sudo apt remove --purge whoopsie rsyslog realmd sssd-common apport-gtk ufw
~~~

This forces my system to use sytemd-journald for logging, disables kernel dumping (and reporting) and removes a couple of single-sign on options that I am not using anyways. Also I'd rather user iptables/nftables directly and not ufw.

## Improve the Shell Setup

I spent a lot of time on the command line, so setup zsh with some extensions and also install some nifty utilities. The zsh-antigen package in Ubuntu is broken, so install this zsh package manager manually:

~~~ bash
$ sudo apt install tmux htop dstat vim-nox neovim zsh
# zsh-antigen package in ubuntu is broken, install it by hand
$ wget -q -O ~/.antigen.zsh git.io/antigen
$ sudo chsh -s /usr/bin/zsh
~~~

And add a simple ~/.zshrc configuration file:

~~~ text
# load antigen
source $HOME/.antigen.zsh

export ZSH_TMUX_AUTOSTART=true

# load the oh-my-zsh library
antigen use oh-my-zsh

# bundles from default repo
antigen bundle git
antigen bundle zsh-users/zsh-autosuggestions
antigen bundle zsh-users/zsh-completions
antigen bundle zsh-users/zsh-syntax-highlighting
antigen bundle mollifier/anyframe
antigen bundle ssh-agent
antigen bundle tmux

antigen theme robbyrussell

# tell antigen that you're done
antigen apply

# configure anyframe
bindkey '^xb' anyframe-widget-cdr
bindkey '^x^b' anyframe-widget-checkout-git-branch

bindkey '^xr' anyframe-widget-execute-history
bindkey '^x^r' anyframe-widget-execute-history

bindkey '^xi' anyframe-widget-put-history
bindkey '^x^i' anyframe-widget-put-history

bindkey '^xg' anyframe-widget-cd-ghq-repository
bindkey '^x^g' anyframe-widget-cd-ghq-repository

bindkey '^xk' anyframe-widget-kill
bindkey '^x^k' anyframe-widget-kill

bindkey '^xe' anyframe-widget-insert-git-branch
bindkey '^x^e' anyframe-widget-insert-git-branch

autoload -Uz chpwd_recent_dirs cdr add-zsh-hook
add-zsh-hook chpwd chpwd_recent_dirs

# use a color scheme file if one is in one's home directory
test -r "~/.dir_colors" && eval $(dircolors ~/.dir_colors)
~~~

I am using vim, so lets add some config files that I keep reusing:

~~~ bash
# setup vim
$ git clone https://github.com/andreashappe/config-vim.git .vimrc
$ git clone https://github.com/k-takata/minpac.git ~/.vim/pack/minpac/opt/minpac
# open vim and call :PackUpdate
~~~

## Setup mandatory Firefox Add-Ons

There are some privacy improving add-ons that should be deemed mandatory. In addition add the bitwarden password manager..

* [ublock origin](https://addons.mozilla.org/de/firefox/addon/ublock-origin)
* [privacy badger](https://addons.mozilla.org/de/firefox/addon/privacy-badger17)
* [bitwarden](https://addons.mozilla.org/de/firefox/addon/bitwarden-password-manager)
* [https everywhere](https://addons.mozilla.org/de/firefox/addon/https-everywhere/)

## Add Additional Stuff and Cleanup the Rest

There are some (partially proprietary) tools that I'd like on my system:

~~~ bash
$ sudo apt install steam texlive-latex-recommended
~~~

In addition I am adding some additional repositories and tools:

* [spotify](https://www.spotify.com/us/download/linux/): use the "Debian/Ubuntu" instructions
* [signal](https://signal.org/de/download/)

I really like using debfoster (although it's deprecated). It shows which tools have not been selected manually and can be uninstalled (in addition it can uninstall all dependencies that are not needed any more when using the P command).

~~~ bash
$ sudo apt install debfoster
$ sudo apt remove gnome # remove the meta package
$ sudo debfoster
~~~

For me, it was easy to remove some stuff:

* gnome-games with all gnome games: I have installed steam..
* rhythmbox: I have installed spotify
* brasero: no cd/dvd burner anymore
* gnome-getting-started-guide
* simple-scan: no scanner
* most printer drivers: no dead-tree printer at my home

## What's next?

Maybe a bit gnome-shell configuration..

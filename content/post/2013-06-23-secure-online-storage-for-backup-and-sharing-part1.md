---
layout: post
tags : ["security", "linux"]
title: Secure Online Data Backup using Duplicity
aliases:
  - /blog/2013/06/23/secure-online-storage-for-backup-and-sharing-part1
description: "Encrypted incremental backup to clouds/ssh hosts using duplicity"
keywords: "cloud online backup duplicity secure encryption"
date: 2013-06-27
---
*This is part two of a series about encrypted file storage/archive systems. My plan is to try out [duplicity](http://www.snikt.net/blog/2013/06/23/secure-online-storage-for-backup-and-sharing-part1/), [git using transparent encryption](http://www.snikt.net/blog/2013/07/01/git-with-transparent-encryption/), [s3-based storage systems](http://www.snikt.net/blog/2013/06/27/doing-stuff-with-s3/), [git-annex](http://git-annex.branchable.com/) and [encfs+sshfs](http://blog.gauner.org/blog/2008/09/12/secure-remote-storage-with-fuse-and-encfssshfs/) as alternatives to [Dropbox](http://www.dropbox.com)/[Wuala](http://www.lacie.com/us/more/?id=10097)/[Spideroak](http://www.spideroak.com). The conclusion will be a blog post containing a comparison a.k.a. "executive summary" of my findings. Stay tuned.*

**[Duplicity](http://duplicity.nongnu.org)** is a command-line tool similar to [rsync](http://rsync.samba.org): you give it two locations and it synchronizes the first location to the second. Duplicity adds additional features over rsync, especially interesting for me are incremental encrypted backups to remote locations. This form of storage would prevent any hoster of gaining any information about my stored data or its metadata (like filenames, etc.).

Duplicity supports multiple storage backends, the most interesting for me were Amazon S3 and SSH/SFTP. All my examples will use the SFTP backend as I tend to have SSH servers laying around.
<!-- more -->

# Using Duplicity

The best way of evaluating a tool, is using it:

## Setup (on Debian/Ubuntu)

First of all, install the needed software packages

~~~ bash
 $ apt-get install duplicity python-paramiko gnupg
~~~
(`python-paramiko` was needed on Ubuntu 13.04 as the Ubuntu package seems to have broken dependencies).

Use SSH key-based authentication scheme for communicating with the backup storage server (which will be named `backupserver` in my examples):

~~~ bash
 # create a new SSH keypair if you don't have any
 $ ssh-keygen

 # copy the SSH public key to the remote backup server
 $ ssh-copy-id andy@backupserver
~~~

The created backup files will be signed and encrypted with a GPG key, so if you don't have one, create one:

~~~ bash
 $ gpg --gen-key

 # list your key (and note the keyid, next to sec)
 $ gpg --list-secret-keys
~~~

You can use an existing key (that you are using for email communication) or create a wholy new one which does not have any linkage to your email address. Just make sure that you use a large enough key size.

## Do the Backup

With all that information we can now create the initial backup (I'm using `12345678` as my key id):

~~~ bash
 $ duplicity --encrypt-key "12345678" --sign-key "12345678" stuff-to-backup scp://andy@backupserver//home/andy/remote-backup"
~~~

This will backup the directory "`stuff-to-backup`" onto the storage server in a directory at "`/home/andy/remote-backup`". The inital backup will take longer as all data is transfered, subsequent backups will only be created as differential backup (ie. only changed data is transfered).

## Query Backup Information

Sometimes you want to check the contents of your remote backups, to do this you can do:

~~~ bash
 $ duplicity list-current-files scp://andy@backupserver//home/andy/remote-backup
 GnuPG passphrase: 
 Copying duplicity-full-signatures.20130622T174711Z.sigtar.gpg to local cache.
 Copying duplicity-full.20130622T174711Z.manifest.gpg to local cache.
 Last full backup date: Sat Jun 22 19:47:11 2013
 Sat Jun 22 19:46:35 2013 .
 Mon Feb  4 20:38:32 2013 some-file
 ...
~~~

## Restore Files

Time to get our files back:

~~~ bash
 # restore the whole backup
 $ duplicity scp://andy@backupserver//home/andy/remote-backup /tmp/restore

 # only restore some files (or directories)
 $ duplicity scp://andy@backupserver//home/andy/remote-backup --file-to-restore some_filename /tmp/some_file

~~~

You can use the `-t` parameter to restore older versions of files, i.e. `-t 3D` restores the backup as it was three days ago.

## Maintainence for your Backup

Backups will grow over time and your online storage might be limited. Thus you might need periodic maintenance for keeping your online storage needs low:

~~~ bash
 # remove all backups older than three months.
 $ duplicity remove-older-than 3M --force scp://andy@backupserver/home/andy/remote-backup
~~~

Duplicity does incremental backups: the remove commands will make sure that no backup set that is needed for restoring some later backup will be removed.

# Common Key Management Operations

All backups will be signed and encrypted with your private GPG key. You will loose all data if you loose this key, so better keep care of it!

Let's export the key into a textfile (see [this page](http://linux.koolsolutions.com/2009/04/01/gpgpgp-part-5-backing-up-restoring-revoking-and-deleting-your-gpgpgp-keys-in-debian/) for further information). Keep those file in a secure place:

~~~ bash
 # backup all keys
 $ gpg --export-secret-keys -ao secret-keys.txt
 $ gpg --export -ao keys.txt
 $ gpg --export-ownertrust > ownertrust.txt

 # to restore keys on a differnet computer
 $ gpg --import secret-keys.txt
 $ gpg --import keys.txt
 $ gpg --import-ownertrust ownertrust.txt
~~~

# Summary

If you know rsync duplicity is very easy to use. It's easy operation and setup makes it perfect for creating secure backups on the fly, but it is not well suited for synchronizing team data (as there is no conflict management, the later update overwrites conflicting states).

If this is to command line-y for you, there's also [Deja-Dup](https://live.gnome.org/DejaDup/Screenshots), a graphical user interface for duplicity.

---
layout: post
title: "Linux: How to encrypt your data on hard drives, USB sticks, etc."
date: 2012-12-02
comments: true
aliases:
  - /blog/2012/12/02/howto-encrypt-harddrive
tags: ["linux", "security", "encryption"]
description: "How to transparently encrypt hard drives/USB sticks/etc."
keywords: "Linux, encryption, security, ecryptfs, dmcrypt, LUKS, cryptsetup, hard drive, SSD, usb, usb stick"
---

Imagine your Laptop (or Desktop Computer) being stolen. How long will it take and how much will it cost you to get back on track? Hardware will be easy: the cost for a new premium desktop is around $1000, for a new Laptop around $2000. Your data "should" be always be back-uped somewhere anyways.

But this neglects a hidden cost: some thief has all your data, including all your online identities, photos, source for software projects and private notes/pictures that you do not want to be published. How much would you value your online reputation, would you change all your online account passwords and connected applications on theft? How much time and effort would this cost you -- and could you do it fast enough before the attacker might utilize that data against you?

I'm employing transparent encryption to mitigate against this scenario. As long as sensitive data only hits my hard drive/SSDs encrypted nothing can be extracted by a thieve. This is done in a very lazy fashion: no additional password entry is used for integrated hard drives (i.e. /home), one password is used per external drive.<!-- more --> By now I'm also encrypting the data on my Desktop PC: there was a break-in in my house block last month -- and I'm liable for approx. $ 100k if the software I'm working on is stolen.

This will not protect you if the attacker can force the password out of you. This could be your government that can force you to do this by law, social pressure (imagine being charged with kiddie porn) or just the pure old threat of violence. So stay safe.

## The Encryption Options

I'm using Linux on almost all of my computers so that's what I'm focusing on. Encryption-wise there are a couple of crypto algorithms, but I'm not dwelling to much on that: the 'standard' [AES](http://en.wikipedia.org/wiki/Advanced_Encryption_Standard) algorithm should be good enough for us, it's also very good supported by hardware: most newer processors have [special instructions reducing the encryption overhead](http://en.wikipedia.org/wiki/AES_instruction_set).

To utilize the encryption algorithm it must somehow used by the operating system to transparently en- and decrypt all user file interactions. In Linux land there 
are three largely deployed ways of interacting with encrypted file systems:

[ecryptfs](http://ecryptfs.org)

* file-based, ie. files are encrypted and stored within an existing directory. This means that you can easily add this on an existing system without having to repartition anything
* allows only for some files/directories to be encrypted
* works on a per-file basis, so attacker can access information about file-meta data. An encrypted hard drive full of 600-700MB files could allow an attacker to state that the user might have a couple of downloaded movies on it.

[cryptsetup](http://code.google.com/p/cryptsetup/)

* command line interface for creating a virtual hard drive
* no additional information is stored with the encrypted data, user needs to remember all crypto parameters (used algorithm, etc.). The used drive (for the encrypted data) will look like garbage, the user might have means of plausible deniability through that.
* you cannot change the password easily -- actually you would have to decrypt and encrypt everything on the crypto drive/volume

[cryptsetup/LUKS](http://code.google.com/p/cryptsetup/)

* same as cryptsetup, but meta-information is stored within the crypto drive
* more user-friendly (as mismatched crypto parameters can be found), but attackers can state that there is an encrypted partition
* allows multiple keys per crypto volume/drive: this means that you can change the password used for en/decryption without having to decrypt and encrypt all stored data.

I've chosen to use a combination of cryptsetup and cryptsetup/LUKS based crypto volumes in my daily life. While eCryptfs has many advantages it is a more complicated scheme: in safety and security contexts I really value simplicity. Also with my setup I know that everything within my home directory is encrypted: I do not have to think further if a file will be encrypted or not.

## Automatic transparent encrypted /home/andy using cryptsetup/LUKS

The basic setup is a dedicated drive/volume/partition for my home directory which will be encrypted using cryptsetup/LUKS. I'm using libpam-mount to automatically provide access to this volume when I log in my user. I'm choosing LUKS for safety reasons, with this setup I'm easily able to change my encryption password. Also I'm utilizing a shortcut: my login password will be just based on as encryption password, so those two must match.

I'm encrypting andy's home directory, the partition used for the encrypted data will be the empty /dev/sdb5 partition. I'm using [ext4](http://en.wikipedia.org/wiki/Ext4) as file system, this has rather more to do with the reliability that the whole ext-family of file systems has shown for the last years than with concrete performance or security reasons.

Let's start with some preliminary steps:

~~~ bash
# install needed software
$ apt-get install libpam-mount cryptsetup

# create a new user: you cannot work on a user's home
# directory while being logged in as that user

$ adduser tmp
# logout as andy, login as tmp

# backup andy's home directory
$ rsync -av /home/andy /home/andy-backup

# setup cryptdrive -- use the same password as your login-password
$ cryptsetup luksFormat /dev/sdb5

WARNING!
========
This will overwrite data on /dev/sdb5 irrevocably.

Are you sure? (Type uppercase yes): YES
Enter LUKS passphrase: 
Verify passphrase: 

# create a file system within the encrypted volume
$ cryptsetup luksOpen /dev/sdb5 home
Enter passphrase for /dev/sdb5:

$ mkfs.ext4 /dev/mapper/home

mke2fs 1.42.5 (29-Jul-2012)
Filesystem label=
OS type: Linux
Block size=4096 (log=2)
[...]
Allocating group tables: done
Writing inode tables: done
Creating journal (32768 blocks): done
Writing superblocks and file system accounting information: done

# mount the encrypted file system and move the backuped data onto it
$ mount /dev/mapper/home /mnt
$ rsync -av /home/tmp /mnt/andy
$ umount /mnt
$ cryptsetup luksClose /dev/sdb5
~~~

Now we have an encrypted partition and only need to integrate it at login-time. To achieve this libpam-mount will pass on your login-password as decrypt password to cryptsetup/LUKS.

So, to the libpam-mount configuration in /etc/security/pam_mount.conf.xml:

~~~ xml
<?xml version="1.0" encoding="utf-8" ?>
<!DOCTYPE pam_mount SYSTEM "pam_mount.conf.xml.dtd">
<pam_mount>
  <debug enable="0" />
  <mntoptions allow="*" />
  <mntoptions require="nosuid,nodev" />
  <logout wait="0" hup="0" term="0" kill="0" />

  <volume user="andy" fstype="crypt" path="/dev/sdb5" mountpoint="/home/andy" options="noatime,discard,commit=60" />

  <mkmountpoint enable="1" remove="true" />
</pam_mount>
~~~

The important part here is the "volume" part. The line is quite easy to parse: when user "andy" logs in mount the file system located at "/dev/sdb5" to provide the home directory ("/home/andy") for this user. The passed options will be utilized when mounting the filesytem within the encrypted volume.

That's it. Try it by logging in as user andy. You can check if the encrypted volume was mounted correctly by using the "mount" command, it should include something like:

~~~ bash
/dev/mapper/_dev_sdb5 on /home/andy type ext4 (rw,noatime,discard,commit=60)
/dev/sdb5 on /home/andy type crypt (rw,noatime,discard,commit=60)
~~~

Do not forget to remove the temporary user as well as the backup copy of the user's home directory after you've finished everything. 

## Encrypting an "archive" USB drive

I'm using a large 3TB external USB 3.0 hard drive as local 'backup' storage as well as for data haven for large media files (RAW Photos, Videos, etc.). I've chosen to use cryptsetup without LUKS for this for obscurity reasons: to every casual observer this drive should appear to be having an empty 2.4TB partition. This also means that a casual user might overwrite the data by formating the seemingly empty partition.

Setup is quite easy, just use cryptsetup to establish the mapping from the underlying encrypted data to a virtual hard drive.

I'm using "/dev/sdc2" as encrypted hard drive partition in my examples

To create a new (empty) encrypted drive under /mnt:

~~~ bash
$ sudo cryptsetup create backup /dev/sdc2
$ sudo mkfs.ext4 /dev/mapper/backup
$ sudo mount /dev/mapper/backup /mnt

# after you copied all data on the drive unmount it and
# remove the mapping

$ sudo umount /mnt
$ sudo cryptsetup remove backup
~~~

If you want to use the drive just redo the cryptsetup-sequence.

~~~ bash
$ cryptsetup create backup /dev/sdc2
$ mount /dev/mapper/backup /mnt
# do stuff with the drive
$ umount /mnt
$ cryptsetup remove backup
~~~

The reason to do this manually is the 'obscurity-factor': if the system would pop up a dialog "You have connected an encrypted hard drive, do you want to decrypt it" there wouldn't be much obscurity, would it? This is the approach we'll be approaching for USB sticks in the next section:

## How to encrypt USB sticks

Are you using USB sticks to exchange data? How have you secured them in case somebody steals one of those or you just forget one at your favorite coffee shop. How do you dispose of seemingly defective USB Sticks? Do you destroy the memory cells on it or just throw it away into the garbage bin?

I'm normally creating two partitions on my USB sticks: one for exchanging data with 'other' operating systems/users that cannot access encrypted data and one partition using cryptosetup/LUKS to encrypt all data upon it. Modern Linux Desktops detect the encrypted volume and just ask for the password when such a stick is accessed by the user.

Let's stay away from the command line and open "gnome-disks" (which would be in the gnome-disk-utility package if you haven't installed it). There we can select the USB Stick, delete the original partition and add two new partitions. First of all, lets view the empty USB Stick:

![The empty USB stick](/assets/dmcrypt/Disks_001.png)

Let's start with a FAT partition for data exchange with other people (almost every operating system can read FAT).

![Creating a partition for non-Linux Systems](/assets/dmcrypt/Disks_002.png)

Now for the cryptographically secure partition! This one will be of type "Encrypted, compatible with Linux systems (LUKS+ext4)". This is the same scheme as used when encrypting our build-in hard drive.

![Creating a encrypted partition](/assets/dmcrypt/Disks_003.png)

After we've created the partition we can access it through nautilus (the default gnome filemanager). Enter the password (do not store it permanently) and you can now access the encrypted part of the USB stick as any normal partition:

![Mounting the encrypted parition with nautilus](/assets/dmcrypt/nautilus.png)

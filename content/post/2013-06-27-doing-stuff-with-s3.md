---
layout: post
tags : ["security"]
title: Encrypted S3 storage filesystems
description: "Trying to use two s3-based storage methods that provide transparent encryption and compression"
aliases:
  - /blog/2013/06/27/doing-stuff-with-s3
keywords: "cloud data secure encryption s3ql s3backer amazon s3"
date: 2013-06-27
---

*This is part two of a series about encrypted file storage/archive systems. My plan is to try out [duplicity](http://www.snikt.net/blog/2013/06/23/secure-online-storage-for-backup-and-sharing-part1/), [git using transparent encryption](http://www.snikt.net/blog/2013/07/01/git-with-transparent-encryption/), [s3-based storage systems](http://www.snikt.net/blog/2013/06/27/doing-stuff-with-s3/), [git-annex](http://git-annex.branchable.com/) and [encfs+sshfs](http://blog.gauner.org/blog/2008/09/12/secure-remote-storage-with-fuse-and-encfssshfs/) as alternatives to [Dropbox](http://www.dropbox.com)/[Wuala](http://www.lacie.com/us/more/?id=10097)/[Spideroak](http://www.spideroak.com). The conclusion will be a blog post containing a comparison a.k.a. "executive summary" of my findings. Stay tuned.*

This post tries some filesystems that directly access S3. I'll focus on Amazon's S3 offering, but there should be many alternatives, i.e. [OpenStack](http://www.openstack.org). Amazon S3 has the advantage of *unlimited* storage (even if infinite storage would come with infinite costs..). S3 itself has become a de-facto standard for providing object-based file storage.

<!-- more -->

## [s3ql](https://code.google.com/p/s3ql/)

The first contestant is s3ql. It offers compression (bzip2, gzip or lzma) and aes-256 encryption combined with a sha256 HMAC for providing secrecy and protection from data manipulation. Somehow even data de-duplication (the same block will only be stored once) was added to the mix. It should also provide good performance through asynchronous network operations and a local cache.

s3ql was declared stable in May 2011 after 93 beta-tester found no show-stopping bugs.

### Using s3ql

Let's start with creating (formatting) a new s3ql volume. I assume that an Amazon S3 bucket was already created, in my case I named it *lonelydropbox*.

~~~ bash
 $ mkfs.s3ql --force s3://lonelydropbox
 Enter backend login: 
 Enter backend password: 
 Before using S3QL, make sure to read the user's guide, especially
 the 'Important Rules to Avoid Loosing Data' section.
 Purging existing file system data..
 Please note that the new file system may appear inconsistent
 for a while until the removals have propagated through the backend.
 Enter encryption password: 
 Confirm encryption password: 
 Generating random encryption key...
 Creating metadata tables...
 Dumping metadata...
 ..objects..
 ..blocks..
 ..inodes..
 ..inode_blocks..
 ..symlink_targets..
 ..names..
 ..contents..
 ..ext_attributes..
 Compressing and uploading metadata...
 Wrote 0.00 MiB of compressed metadata.
~~~

This will ask for your Amazon s3 security credentials as well as an password with which data will be encrypted locally before transmission to S3. As each operation asks those the developers have added the possibility to store all three of those into `~/.s3ql/authinfo2`.

Your S3 bucket now includes the [metadata of an empty filesystem](http://www.snikt.net/assets/2013-s3-clients/after_mkfs.png).

~~~
[s3]
storage-url: s3://lonelydropbox
backend-login: xxxx
backend-password: yyyy
fs-passphrase: zzzz
~~~

Plain-text credentials and passwords. Yummy. At least s3ql automatically checks the access permissions of this file and quits if those seem to be too low. In all honesty I believe that there are few alternatives to this plain-text storage but still, having this sensitive information around in plain-text makes me uneasy.

Now let's mount our new volume:

~~~ bash
 $ mount.s3ql s3://lonelydropbox /mnt/
 Using 8 upload threads.
 Using cached metadata.
 File system damaged or not unmounted cleanly, run fsck!
~~~

Alas my user wasn't in the `fuse` group so this operation does not work (missing permissions). "No problem, I'm adding my user to `/etc/groups` and re-login to my desktop system". Time to remount the filesystem. Crap. Seems like that I should have somehow unmounted the s3ql filesystem and now mounting quits with an errors message, telling me to fsck.

It's always good to know that there's a filesystem checker already available, let's use it:

~~~ bash
 $ fsck.s3ql s3://lonelydropbox
 Starting fsck of s3://lonelydropbox
 Using cached metadata.
 Remote metadata is outdated.
 Checking DB integrity...
 Creating temporary extra indices...
 Checking lost+found...
 Checking cached objects...
 Checking names (refcounts)...
 Checking contents (names)...
 Checking contents (inodes)...
 Checking contents (parent inodes)...
 Checking objects (reference counts)...
 Checking objects (backend)...
 Checking objects (sizes)...
 Checking blocks (referenced objects)...
 Checking blocks (refcounts)...
 Checking inode-block mapping (blocks)...
 Checking inode-block mapping (inodes)...
 Checking inodes (refcounts)...
 Checking inodes (sizes)...
 Checking extended attributes (names)...
 Checking extended attributes (inodes)...
 Checking symlinks (inodes)...
 Checking directory reachability...
 Checking unix conventions...
 Checking referential integrity...
 Dropping temporary indices...
 Backing up old metadata...
 Dumping metadata...
 ..objects..
 ..blocks..
 ..inodes..
 ..inode_blocks..
 ..symlink_targets..
 ..names..
 ..contents..
 ..ext_attributes..
 Compressing and uploading metadata...
 Wrote 0.00 MiB of compressed metadata.
 Completed fsck of s3://lonedropbox
~~~

Returns some information, completes and afterward I'm able to mount the volume with `mount.s3ql`.

Let's do some performance testing with iozone3 (limited to 100mb files):

~~~
 # first test on my local sdd
     KB  reclen   write rewrite    read    reread    read   write    read  rewrite     read   fwrite frewrite   fread  freread
 102400       4 1368474 2354841  6220731  7355806 5687658 2248134 4881099  2938562  5876207  2295708  2241096 4755235  6341793

 # comparison with the S3 back-end
 102400       4   22279   24575  5276190  6487591 6140597   23453 5170622    23987  4456617    24043    24220 5366910
~~~
So the caching works rather well. Let's time some simple file copy operations (with a 45mb file)

~~~
 $ cp somefile.pdf /mnt
    ->  0.01s user 0.07s system 10% cpu 0.728 total
 $ time umount.s3ql /mnt
    ->  0.06s user 0.03s system 0% cpu 4:15.46 total
~~~

So unmounting works like a normal block based filesystem (with caching). There's only [a problem](http://www.rath.org/s3ql-docs/umount.html): `umount` or `fusermount -u` return immediately. This means if your system is not waiting for your mount.s3ql process to finish, data might be in limbo between the local cache and the clouds.

Actually I've hit the problem due to a shaky network connection. During one unmount operation my crappy wireless router assigned me a new IP address. This let to mount.s3ql waiting indefinitely. After I've killed the s3ql process (worst case for sure) I had to fsck the filesystem (good that I've already known the command).

The last file was detected of being only partially transferred and it's fragments were moved to the `lost+found` directory of the s3ql filesystem. Kudos for perfectly according to the ext2/3/4 known behaviour! Alas while the file in the `lost+found` directory was named correctly, it's length was 0 bytes.

This is [how the S3 bucket looked at the end of the day](http://www.snikt.net/assets/2013-s3-clients/filled.png).

The developer's homepage also notes some security problems: it seems that Amazon's SSL/TLS certificate is not checked. This would allow for a MITM attack.

Also s3ql does not support parallel access. So I cannot use it for sharing data with another computer at the same time.

### Use cases for S3QL

So when would I use s3ql? The first use-case that comes in mind is a virtual single-computer single-user unlimited storage system. This would come in handy for backups (and most of s3ql's supplied tools are nice for the backup use case: immutable directories, cow copies, fast tree copies). The disappointing thing is, that after my copy/network fail I would rather copy all files onto the volume and delete the originals after I've made sure that the whole data was transferred to the cloud. Easy `mv` it ain't. Also I would have to make sure that my Linux system's init process would give s3ql enough time to finish it's operation in case of a reboot -- it would be nice, if the local cache would be utilized for some sort of disconnected operation, but I understand that this includes lots of complex questions.

I'm not too fond of the plain-text password `authinfo2` file. Also encryption with a simple password might be a bit tedious: there's no way of changing the password for existing files. Some scheme utilizing an user password that then in turn is used to decrypt a longer random storage password would seem better suited.

The real big advantage of s3ql seems to be it's community. The website looks well-maintained, the developers are talking openly about features and problems (SSL/TLS MITM comes to mind). This alone would make S3QL a project to keep watching.

## [s3backer](https://code.google.com/p/s3backer/)

Another interesting project is s3backer: it creates a virtual block device which is stored on a S3 volume. The block device's data can be transparently compressed and encrypted. The block device can then be formatted with a traditional filesystem and mounted in the system.

This flexibility might be s3backer's main problem: I don't believe that traditional filesystem are optimized for the high-latency S3 regime. In addition desktop filesystems are not designed for parallel access from multiple computers: this disallows using the same s3backer block device from two computers at the same time.

Actually someone could put a cluster filesystem like [GFS2](https://en.wikipedia.org/wiki/GFS2) or [OCFS2](https://en.wikipedia.org/wiki/OCFS2) upon a s3backer block device. Through this setup using it from multiple computers at the same time would be possible, but I believe this wouldn't be an easy setup anymore.

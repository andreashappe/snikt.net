---
layout: post
tags : ["security", "linux"]
title: Git with transparent encryption
description: "Using encryption to make git handle un-trusted remote storage server"
aliases:
  - /blog/2013/07/04/git-with-transparent-encryption
keywords: "cloud data secure encryption git sparkleshare git-secure git-encrypt"
date: 2013-10-10
---

*This is part three of a series about encrypted file storage/archive systems. My plan is to try out [duplicity](http://www.snikt.net/blog/2013/06/23/secure-online-storage-for-backup-and-sharing-part1/), [git using transparent encryption](http://www.snikt.net/blog/2013/07/01/git-with-transparent-encryption/), [s3-based storage systems](http://www.snikt.net/blog/2013/06/27/doing-stuff-with-s3/), [git-annex](http://git-annex.branchable.com/) and [encfs+sshfs](http://blog.gauner.org/blog/2008/09/12/secure-remote-storage-with-fuse-and-encfssshfs/) as alternatives to [Dropbox](http://www.dropbox.com)/[Wuala](http://www.lacie.com/us/more/?id=10097)/[Spideroak](http://www.spideroak.com). The conclusion will be a blog post containing a comparison a.k.a. "executive summary" of my findings. Stay tuned.*

**git** was originally written by Linus Torvalds as SCM tool for the Linux Kernel. It's decentralized approach fits well into online OSS projects, it slowly got the decentralized OSS of choice for many. Various dedicated hosted storage services as [github](http://www.github.org) or [bitbucket](http://www.bitbucket.com) arose. In this post I'll look into using git as replacement for Dropbox for data sharing. As Dropbox has a devastating security history (link needed) I'll look into ways of transparently encrypting remote git repositories.

<!-- more -->

## Unencrypted Git

If you're a software developer you might already know git's basic operations. If not look at [this introduction](). Git is a decentralized version control system: this makes it inherently multi-user. In addition remote servers are mostly treaded as dumb storage dumps without active logic which would fit perfectly our needs.

But what for non tech-savvy users? Fortunately there's [SparkleShare](http://sparkleshare.org/). This user interface works like Dropbox but with a git back-end. I really like that it is using a git repository, through that it doesn't matter if you trust SparkleShare's quality: in the end all data is stored within a trusted (safety-wise) git repository. SparkleShare uses an external notification server for notifying the different clients about changed files, really paranoid should [create their own notification servers](https://github.com/hbons/SparkleShare/wiki/Notification-service).

Server-wise there are plenty of hosed storage providers like github or bitbucket. Self-hosted solutions range from basic setups over SSH to full-blown github clones like gitlab (including access control, etc.). An advanced feature that I've come to love is server-side editing through a HTML editor (similar functionality is provided by githab/bitbucket/gitlab).

Data transfer can be utilized through various protocols, most commonly SSH or HTTPS are used. This provides for secure transport but alas server-side storage is unencrypted.

## Adding encryption through SparkleShare

SparkleShare provides easy server-side encryption by just adding "-crypto" to a repository's name. To create a new repository and access it through SSH do the following on the server (I assume that you've copied you SSH public keys to the storage server):

~~~ bash
 $ git init --bare /home/andy/test-repo-crypto   # (on server)
~~~

and check it out through SparkleShare:

![](/assets/sparkleshare.png)

After entering the repository data Sparkleshare asks for an encryption password. To test it, we're gonna check out the repository through 'normal' git and output one of the stored files:

~~~ bash
$ git clone test-repo output

$ cat output/SparkleShare.txt 
U2FsdGVkX1/g1ZJ2jXz5msJrrz6FGD/t6icxGgs+3OkNVVfwyiaulQDNdM04aVL9
D8FbBf4HjkWPb39r93Nqx9taip1YqLMwoefaP2zt/sg1aXlBSYmf3/91KTdojQGh
U2uiY9d1AxxOHrdBdqX/XixSLX3fWnD1XB2h+xFPiRn2QQUu6Marxdn7V3vKz86+
B1bzelE2ZbG+jsPQFCbQSVS9MGqjY49hEletcejYhwezVKkZHCHfqlVBAqHKzNtK
CR1KQzxowklpkrcAcAiTbkVmQ1eyl/+LUoPJKD9wu0TVY9+LPrITtVJt8ATCE9Fr
zuL8tajXCHDJ4ocVdYZY+nx5IKLSaHiStO7GxFyJRldN/cAq/QxDGyc7FM7QjOiG
C/aZ83in23dR1BBvRaXBcgkfp6IFK3Prbkkj60U4DNCwZ3IYvY+No4LU9FdJxDIc
VAlVQWLPurhXmrcVh71+eNHVwe5YAlclmIxfcW2a0zKgPccr3viD+BklHr2RgJTo
Ku402fShx7qhx1Ez2kk0LUcTbsV5WQeKRCnPC5Dx+L36Whr6ABYtd5QIt/ZpZGmF
Jbfq5RJ8GpKSbp2NMlTFnv6hd7nt3N1bcLF7c2tLVb6/wAFL7Wgh/VR1UxxkpovL
~~~

Encryption looks good (but see that the filename was not encrypted). But how was it done?

~~~ bash
[~/SparkleShare/test-repo]$ cat .git/config
[core]
        ...
[remote "origin"]
        url = ssh://andy@localhost/home/andy/test-repo-crypto
[filter "crypto"]
        smudge = openssl enc -d -aes-256-cbc -base64 -S 51b3c5c7cc7ee66b -pass file:.git/password
        clean  = openssl enc -e -aes-256-cbc -base64 -S 51b3c5c7cc7ee66b -pass file:.git/password
[~/SparkleShare/test-repo]$ cat .git/password
Thepassword
[~/SparkleShare/test-repo/.git/info/attributes
filter=crypto
~~~

Data is passed to the `smudge`/`clean` filter before check-ins/check-outs (this is achieved through the filter statement in `.git/info/attributes`). This filter in turn use the Password from .git/password to encrypt the user data. What's bad about it? First of all there's no key change mechanism: you cannot easily change the encryption password for the repository. Second the password is saved on each SparkleShare client as plain-text and can easily be read by everyone. At least this uses CBC as block cipher, this is a secure default. Fourth and biggest problem is that the filename is not encrypted at all. This means that an attacker can easily see what files you have stored.

## on the command line: git-encrypt / git-crypt

There are various projects that use git's filter in a similar fashion to SparkleShare. The two that I found most frequently were [git-encrypt](https://github.com/shadowhand/git-encrypt) and [git-crypt](https://github.com/AGWA/git-crypt).

Let's start with git-encrypt: this tool has all the problems of SparkleShare. In addition it uses ECB as cipher mode. This means that the resulting encrypted files are not as useless (without the secret key) as you might hope you would be. Especially for bitmap images [this might mean that the encryption is mostly meaningless](https://en.wikipedia.org/wiki/Block_cipher_modes_of_operation#Electronic_codebook_.28ECB.29). You can change the default through the configuration file but I prefer tools with better defaults.

In steps git-crypt. This uses CTR mode as block cipher (with an IV derived from the SHA1 mac of the source file). This produces secure encrypted files ([as well as works with git](http://article.gmane.org/gmane.comp.version-control.git/113221)) and should also be parallelizeable on a multi-core/CPU system. The filename is still unencrypted through, also the password can be found in plain-text on the Client's computer. You cannot easily exchange the encryption password.

## on the command line: encrypting with GPG

I also found an [article that utilized public-key encryption through gpg](http://mamu.backmeister.name/praxis-tipps/sparkleshare-verschlusselung-der-daten-mit-gpg/) for encryption.

This means that the `.git/config` entries would look like:

~~~
[filter „crypto“]
    smudge = gpg -d -q –batch –no-tty -r MYKEYID
    clean = gpg -ea -q –batch -no-tty -r MYKEYID
~~~

With this the secret password (to the gpg key) is not stored in plain text. Encryption does not depend upon knowledge of the password, for decryption it must be passed on to gpg (through gpg-agent for example). Alas this should be slower than using plain symmetric encryption (as with openSSL) and the filenames are still stored unencrypted.

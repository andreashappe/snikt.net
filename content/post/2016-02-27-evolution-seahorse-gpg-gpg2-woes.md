---
layout: post
title: "GnuPG/PGP and Evolution/Seahorse Private Key Woes"
date: 2016-12-01
aliases:
  - /blog/2016/02/27/evolutino-seahorse-gpg-gpg2-woes
categories: ["security", "linux", "tech"]
---

I have a quite simple setup: [Fedora 23](https://getfedora.org/workstation/) on
my Desktop, [Ubuntu 16.04](http://cdimage.ubuntu.com/daily-live/current/) on my
Notebook and a
[YubiKey](https://www.yubico.com/products/yubikey-hardware/yubikey4/) thrown
into the mix.

I do have my normal GnuPG key
[DD436203](https://pgp.mit.edu/pks/lookup?op=vindex&search=0x648B35DADD436203)
that I'm using. There's also an old and revoked key 3F5D00B6 with which I was
testing my YubiKey with (note to myself: don't use an YubiKey-crested private
key as you cannot backup it). My main key offers an ElGamal 2048bit subkey --
which does not work with the Yubikey (as that only supports 2048bit RSA). So I
've added a new subkey on my laptop.

When I came home to my desktop, Evolution greeted my with the following message
when reading newly encrypted emails: `Could not parse PGP/MIME message: Failed
to decrypt MIME part: Secret key not found`. Hm. Makes sense as the new subkey
wasn't known yet. Seahorse (the gnome "Passwords and Keys" program) did only
show the reverted YubiKey test key, so I went to the command line:

~~~ bash
 ~  gpg --list-secret-keys 
/home/andy/.gnupg/secring.gpg
-----------------------------
sec>  2048R/3F5D00B6 2015-11-09 [expires: 2016-05-07]
      Card serial no. = 0006 03814296
uid                  Andreas Happe (YubiKey) <andreas.happe@ait.ac.at>
ssb>  2048R/C9E7254E 2015-11-09
ssb>  2048R/D2B195E7 2015-11-09

sec   2048R/DD436203 2013-06-22 [expires: 2016-07-19]
uid                  Andreas Happe <andreashappe@snikt.net>
ssb   2048R/36CD18B1 2013-06-22
ssb   4096R/F9AF261D 2013-09-20
ssb   4096g/EC42532F 2014-09-26
ssb   2048g/6589B364 2015-07-10
ssb   2048g/B903902B 2016-01-21
~~~

Makes sense. The newly created RSA subkey isn't known yet. Why this isn't shown
with Seahorse --- not so logical. So I want to import the key through "File ->
Import" within Seahorse. No dice, as "Import failed: already in secret
keyring". Still the key is not shown. Weird. Let's do it on the command line:

~~~ bash
~  gpg --delete-secret-and-public-keys andreashappe@snikt.net --yes 
gpg (GnuPG) 1.4.20; Copyright (C) 2015 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.


sec  2048R/DD436203 2013-06-22 Andreas Happe <andreashappe@snikt.net>

Delete this key from the keyring? (y/N) y
This is a secret key! - really delete? (y/N) y

pub  2048R/DD436203 2013-06-22 Andreas Happe <andreashappe@snikt.net>

Delete this key from the keyring? (y/N) y
~~~

Now I'm sweating. Maybe I've (another!) dead key. Import the new key:

~~~ bash
 ~  gpg --import changed_key.asc 
gpg: key DD436203: secret key imported
gpg: key DD436203: public key "Andreas Happe <ah@coretec.at>" imported
gpg: Total number processed: 1
gpg:               imported: 1  (RSA: 1)
gpg:       secret keys read: 1
gpg:   secret keys imported: 1
~~~

Now I'm feeling better. But meh. Seahorse still doesn't show the new key. WTF.
Let's remove it and import it through Seahore.

Hm. Key get's imported without an error. But still is not shown within
Seahorse. At least it is shown with `gpg` (please note the new 2048/R RSA
subkey at the end):

~~~ bash
 ~  gpg --list-secret-keys 
/home/andy/.gnupg/secring.gpg
-----------------------------
sec>  2048R/3F5D00B6 2015-11-09 [expires: 2016-05-07]
      Card serial no. = 0006 03814296
uid                  Andreas Happe (YubiKey) <andreas.happe@ait.ac.at>
ssb>  2048R/C9E7254E 2015-11-09
ssb>  2048R/D2B195E7 2015-11-09

sec   2048R/DD436203 2013-06-22 [expires: 2016-07-19]
uid                  Andreas Happe <andreashappe@snikt.net>
uid                  Andreas Happe <andreas.happe@ait.ac.at>
uid                  Andreas Happe <ah@coretec.at>
ssb   2048R/36CD18B1 2013-06-22
ssb   4096R/F9AF261D 2013-09-20
ssb   4096g/EC42532F 2014-09-26
ssb   2048g/6589B364 2015-07-10
ssb   2048g/B903902B 2016-01-21
ssb   2048R/F34FF579 2016-02-07
~~~

So what went wrong? Well it seems there's GPG and GPG2 (or more accurate
GPG2.1). And [both have different key
stores](https://superuser.com/questions/655246/are-gnupg-1-and-gnupg-2-compatible-with-each-other).
Let's look at the output of GPG2:

~~~ bash
~  gpg2 --list-secret-keys 
~~~

No keys? Okay, let's add the new key containing the RSA subkey:

~~~ bash
 ~  gpg2 --import changed_key.asc 
gpg: key DD436203: public key "Andreas Happe <ah@coretec.at>" imported
gpg: key DD436203: secret key imported
gpg: Total number processed: 8
gpg:               imported: 1
gpg:       secret keys read: 8
gpg:   secret keys imported: 7
gpg: marginals needed: 3  completes needed: 1  trust model: PGP
gpg: depth: 0  valid:   1  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 1u
gpg: next trustdb check due at 2016-07-19
~~~

Oh. The key appears within Seahorse. And I can read encrypted emails again.
Hooray. It seems as if Seahorse would import the new key into it's GPG1
keychain, while still trying to access the GPG2 keychain for listing it's keys.
That makes no sense at all.

At least it works now. But end-user usable this ain't.

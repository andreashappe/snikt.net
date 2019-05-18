---
layout: post
title: Amazing (Physical) Access Control with HID RFID cards
tags: ["security", "linux"]
date: 2019-01-04
---

So my company moved to a new building which uses [HID RFID cards](https://en.wikipedia.org/wiki/HID_Global) for access control. These cards are typically white with some sort of numeric code printed on one side of them. I have not included an image of my card due to (later) obvious reasons..


## Setting up my Proxmark3 RDV4 reader

Some time ago I joined the [Kickstarter for an updated version of the Proxmark3 RFID reader/writer](https://www.kickstarter.com/projects/1408815241/proxmark3-rdv-40?lang=de) and immediately broke it during the initial flash update. After I was able to [unbreak the reader](https://github.com/RfidResearchGroup/proxmark3/issues/35) (hint: kill network-manager and modem-manager before trying to flash the new image) this seems to be a good time to test those pesky access cards. Also a huge Thank you! to the Proxmark support team for helping me.

## So, what's stored on a HID RFID card?

Now with a working reader let's start by gathering data from my RFID card. To do this, I lay my RFID card on the reader initially search for low-frequency cards.

~~~ bash
proxmark3 ➤ sudo client/proxmark3 /dev/ttyACM1                       git:master
[sudo] password for ah: 


██████╗ ███╗   ███╗ ████╗     ...iceman fork
██╔══██╗████╗ ████║   ══█║      ...dedicated to RDV40
██████╔╝██╔████╔██║ ████╔╝
██╔═══╝ ██║╚██╔╝██║   ══█║    iceman@icesql.net
██║     ██║ ╚═╝ ██║ ████╔╝  https://github.com/iceman1001/proxmark3
╚═╝     ╚═╝     ╚═╝ ╚═══╝ pre v4.0

Keep iceman fork alive with a donation!           https://paypal.me/iceman1001/
MONERO: 43mNJLpgBVaTvyZmX9ajcohpvVkaRy1kbZPm8tqAb7itZgfuYecgkRF36rXrKFUkwEGeZedPsASRxgv4HPBHvJwyJdyvQuP


[=] UART Setting serial baudrate 460800

Proxmark3 RFID instrument
          

 [ CLIENT ]          
 client: iceman build for RDV40 with flashmem; smartcard;  
          
 [ ARM ]
 bootrom: iceman/master/1deaab5f 2018-10-22 10:19:16
      os: iceman/master/e3f4ef49 2019-01-04 09:41:46

 [ FPGA ]
 LF image built for 2s30vq100 on 2018/ 9/ 8 at 13:57:51
 HF image built for 2s30vq100 on 2018/ 9/ 3 at 21:40:23          

 [ Hardware ]           
  --= uC: AT91SAM7S512 Rev B          
  --= Embedded Processor: ARM7TDMI          
  --= Nonvolatile Program Memory Size: 512K bytes, Used: 242477 bytes (46%) Free: 281811 bytes (54%)          
  --= Second Nonvolatile Program Memory Size: None          
  --= Internal SRAM Size: 64K bytes          
  --= Architecture Identifier: AT91SAM7Sxx Series          
  --= Nonvolatile Program Memory Type: Embedded Flash Memory          

          
pm3 --> lf search
NOTE: some demods output possible binary
  if it finds something that looks like a tag          
False Positives ARE possible
          

Checking for known tags:
          
HID Prox TAG ID: ZZZZZZZZZZ (YYYY) - Format Len: 26bit - FC: XXX - Card: YYYY
~~~ 

Please note, that I have exchanged the Faculty Code (XXX), Card Number (YYYY) and TAG ID (ZZZZZZZZZZ) --- with that information you would be able to enter our office.. not that it seems hard to brute force anyway. The Tag ID can also be calculated from the Faculty Code and Card Number. This makes it double stupid that the card number is printed on the backside of the card (and thus can be easily be photographed/noted).

## Try to emulate the card and open the door

Now that we have the Card ID we can use the Proxmark to simulate our card..

~~~ bash
pm3 --> lf hid sim ZZZZZZZZZZ
Emulating tag with ID ZZZZZZZZZZ
Press pm3-button to abort simulation    
~~~

And with that, our office and building doors open.. fun time and amazing security!

---
title: "A full-powered shoebox-sized Desktop"
date: 2012-10-28
aliases:
  - /blog/2012/10/28/an-almost-perfect-linux-itx-setup
comments: true
categories: ["tech", "linux", "hardware"]
description: "Building a mini-ITX high-performance desktop that would fit into a shoebox"
keywords: "linux, mini-itx, desktop, core i5, cooler, silverstone sg-05, silverstone evolution, asrock z77, Intel Z77"
---

After three or four years  it became time to replce my Desktop Computer with newer technology. I've got a first generation Intel Core i7-920 Octo-core processor: it still packs more than enough power but sadly gets too hot and thus the cooling system got too loud for my taste.

So time for a new Desktop! I decided to go the miniITX route. The main idea was to pack as much power-efficient technology in an as-small-as-possible case. This post describes my hardware experiences..

<!-- more -->
By now I'm mostly doing Ruby on Rails and Python development, both ofthem do not really need lots of cpu processing power. I am still a casual gamer (Starcraft 2, Diablo 3, soon [Project Eternity](http://eternity.obsidian.net/)) so a dedicated graphics card might is mandatory. My current rig includes a Geforce 9800 GTX, so the new one should beat that performance-wise.

After some research I came up with the following components:

 Category | Selected Component | Any reason at all?
----- | ----- | ---
 Case | [SilverStone Sugo-SG05](https://amzn.to/2VPqwC4) | Small and cool
 Processor | [Intel i5-3570K](https://amzn.to/2YEagAy) | Power usage and Intel's ongoing Linux support
 Mainboard | [ASRock Z77E Mini-ITX](https://amzn.to/2WbrB6p) | lots of features within small space
 Memory | [Kingston 2*8 GB HyperX Red](https://amzn.to/2QbgZyX) | Fits beneath the CPU cooler and XMI support
 System Storage | [Transcend mSATA 64GB](https://amzn.to/2VzTuk8) | small and fast
 Data Storage | [OCZ Vertex 2 240GB SSD](https://amzn.to/2VzN04Z) | already had this one
 Data Storage | [Samsung 830, 256GB SSD](https://amzn.to/2VzN04Z) | good performance combined with low power usage
 Graphics Card | nVidia GeForce 9800GTX | already had this one
 Cooling Solution | Stock Intel Cooler | Instead of the planned Silverstone passive cooler
 Optical Drive | none | still thinking about using a second SSD instead of an optical drive

## No plan survives enemy contact

Then I've got all the components and found out some new stuff.

The main problem is the mainboard - cpu cooler - graphics card - memory combination. I wanted to go with a passive SilverStone CPU cooler, this introduces a rather large heat sink to the equation. Before ordering the components I found out that my first choice of Kingston Predator memory modules would clash with the cooler: the height of the memory modules would be 5mm to large to fit under the heat sink -- so I switched to cheaper Kingston HyperX red modules.

![](/assets/itx-desktop/problem_with_cooler.jpg) I've read [reviews of the case and cooler combination](http://www.silentpcreview.com/Silverstone_SG05_SG06) before I ordered the components. Alas I ordered another motherboard. In contrast to the reviewed Zotac motherboard I've ordered an ASRock one. While the motherboard is good the placement of the CPU socket in relationship to the graphic card port (PCI express port) is suboptimal. Normally the chipset is situated between those two so there's ample space for cpu coolers. Not so on this board: when mounting the heat sink it is situated directly above the pci express port and blocks it for usage with any graphics card. So I had to switch from passive cooling to the stock Intel CPU cooler for now.

### Optional mSATA card and Optical Drive

On further inspection I found a mSATA port on the backside of the mainboard. Storage sizes really got small recently. Needless to say that I've gone out and bought a 64Gbyte Transcend mSATA SSD for my Linux system drive.
My storage configuration itself is sub-optimal. The mSATA board only supports SATAII instead of the SATA 6G that the mSATA card would support (which is not really as much of an issue as this limits the SATA throughput to a merely 300MByte/sec). Ironically I'm using my old OCZ Vertex 2 SSD which only supports SATA2 on a normal SATA 6G port on the front side of the motherboard.

<br/>

![](/assets/itx-desktop/evolution_of_storage.jpg) <br/>Storage got smaller, from left to right: 3.5" hard drive (1TB), 2.5" SSD (240GB), mSATA SSD (64GB).<br/><br/><br/>

Overall the case supports multiple storage options:

* mSATA card
* 2.5" drive
* 3.5" drive
* slim-line DVD drive

Currently my Linux system boots from the mSATA card, its home directory is situated on my old 240GB OCZ Vertex 2 SSD drive. I have removed the 3.5" drive cage as it partially blocks the air flow. Instead of using an optical drive I will install an additional 2.5" SSD drive (Samsung Series 830 256GB) for booting windows into the space originally designed for the optical drive.

### Power Supply and Cable Management

The case offers space for a total of three drives and one PCI express card. I really don't understand why the integrated 450W power supply offers a total of eight power connectors. It also offers no cable management system so the unused cables further clutter the already sparse free space within the case. At leat the power supply fan is quiet.

I searched for alternative SFX power supplies, preferably one from [be.quiet](http://www.bequiet.com") as I've only had good experience with this company. The only power supply sporting a modular cable management system is ironically offered by SilverStone and would set me back further 100 Euros -- which is too much for just loosing some cables.

### Wireless Card

The mainboard offers a 802.11abgn wireless card but somehow the concrete manufactorer or type isn't mentioned anywhere on its homepage. So i feared the worst regarding Linux driver support. Fortunaltly the wireless chipset is a Realtek RTL8191SEvB which is supported by the rtlwifi driver. This means that the driver is very feature complete supporting wireless monitoring mode and packet injection: this comes handy if you want to do some penetration testing.

The supplied wireless antenna works like a charm: I've never experienced better reception with any mobile phone, tablet or notebook computer in my flat. I even detect wireless networks from the end of my street (in approx. 50m distance, with various walls between me and the distant wireless network).

The network card is connected through a normal mini PCI Express socket with the motherboard: this allows you to exchange it with any standard notebook half-size network card.

### Graphics Card

I planned on using the integrated Intel HD 4000 graphics card until I found a silent or passivly cooled graphics card with good Linux driver support. By now I've found out that the integrated DVI connector on the motherboard only supports a maximum resolution of 1920x1200 which doesn't fit my beautiful Samsung 27" monitor (which would support 2560x1440 natively). The solution would be to use the DisplayPort connector but alas no connection cable was supplied.

Until I get the DP cable delivered I'm using my old NVidia GeForce 9800GTX graphics card which (with its 21cm) perfectly fits into the 22cm maximum length limit of the case. Alas it's kinda noisy and uses lots of power.

![](/assets/itx-desktop/graphics_card.jpg)

I'm looking into a passivly cooled GeForce or AMD/ATI Radeon 7850 card. This should cut the power usage in half while improving the overall graphics performance. In addition this should allow me to outsource some computational tasks from the CPU to the graphics card.

## The Future

So far I have a very powerful and small Desktop system with slightly disappointing accoustic characteristics. Instead of two fans (power + case fan) there's now a total of four fans (power, case, CPU, graphics card) within the system, the CPU and graphics card fan are especially noisy.

![](/assets/itx-desktop/under_desktop.jpg)

I'm currently looking into replacing the stock Intel CPU fan with a passive CPU cooler (maybe the Samuel 17 will work, otherwise I might be able to refit a passive cooler from a 1HE server) and in graphics card alternatives. I already wanted to replace my old 300W graphics card with a modern one, this should cut power usage (and thus generated temprature) into half or a third while maintaining the same performance.

As soon as the second SSD (for booting Windows) arrives I can start with the final software setup. I'm looking forward into optimizing Linux for SSD usage as well as trying to create an aesthetical pleasing and fast UEFI multi-boot system.

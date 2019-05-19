---
layout: "post"
title: Migrating to Middleman
date: 2014-09-09
aliases:
  - /blog/2014/09/09/migrating-to-middleman
categories: ["linux", "rails", "tech"]
---

My blog has a history of migrations. It started as wordpress, then was converted
Octopress. After [Octopress](http://octopress.org/) was missing update-love and [jekyll](http://jekyllrb.com/) started to be
actively maintained again it switched over to [jekyll](http://jekyllrb.com/). And now, it finally is
based upon [Middleman](http://middlemanapp.com/).

Sorry for any inconvinient bugs or layout errors that will happen during the
migration.

<!-- more -->

Why have I switched to middleman?

* as I'm a RoR devleoper it seems better suited for me. Jekyll always seemed
  to be the choice for "web designer that need to add some dynamic content"
  while middleman seems to incorporate the "web developer that needs some
  blog"-attitude
* nice integration with bundler
* existing plugins for deployment. This replaced a lot of custom cruft that
  I had to initially write for myself when I was using jekyll

While in there I've switched from bootstrap to [bourbon](http://bourbon.io/)/[neat](http://neat.bourbon.io/)/[bitters](http://bitters.bourbon.io/). Let's see
how this works out. Wouldn't mind the framework to be called Islay though.

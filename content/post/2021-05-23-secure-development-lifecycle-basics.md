---
layout: post
title: "Secure Software Development Lifecycle Basics"
categories: ["Security", "AppSec"]
date: 2021-05-23
keywords:
- Security
- Development
- secure software development lifecycle
- SDLC
---
Recently I had a couple of customers that needed some guidance about secure software development. I assume that this happens because I am a developer gone pen-tester so I've seen both side of the "problem". Of course, suggestions differ between software stacks and the overall customer professionalism level, but there is a common starting ground that should be suitable for any professional software project. Without those, anything more advanced would be built upon shaky grounds. Please note, that those are just the starting ground and should not be a limiting set for further improvements.

So it seemed like a good idea to write some of those down..

Those ideas are mostly language agnostic and should be feasible for most companies or even single developers (except the code review.. that would be a little bit weird for a single person).

Why are there no concrete coding/source-code guidelines in there? They would make sense but there's a huge risk of [bike-shedding](https://en.wikipedia.org/wiki/Law_of_triviality). And that's something I'd like to avoid.

## source code management

Source code is the most vital output of a development team so it feels like a good place to start. To start with an easy one: there must be a single source of truth. If there is a question about which source code was part of a release, the source code repository can be queried and it's answer is definite.

Now that we have this single source of truth, we must make sure that it is secure:

- access control must be in place: only authenticated and authorized people must be able to access or alter the source code
- the source code repository must be regularly backup-ed (including cold-storage/off-site backups). This makes sure that if disaster strikes (e.g., the building hosting the source code server burns down) normal coding operations can continue.

I think by now we can assume that [git](https://en.wikipedia.org/wiki/Git) will be used for source code versioning. If that's the case, the following should also be taken care of:

- enable git commit signing: when this is enabled and configured, a developer always signs his changes/commits. This prevents a malicious attacker from changing the source code repository's history (and thus introduce malware into the source code)
- use at least two git branches, e.g., "production" and "development". Production must always be in a state that allows for immediate deployment (installation). In addition, the production branch should be set to read-only. All changes take place in development (or a sub-branch thereof). To get changed from development to production, a merge-request/pull-request must happen. Those should not be accepted automatically but a (short) code review by the maintainer(s) should take place before the code is accepted. Of course, if there's only a single developer this seldom makes sense.

Infrastructure-wise this could be a [github](https://github.com), [gitlab](https://gitlab.com) or [bitbucket](https://bitbucket.com) account. Or you go the self-hosted route with [gitlab](https://gitlab.com) or [gitea](https://gitea.io).

## Infrastructure-as-code

System configuration should be done automatically through dedicated deployment tools or through scripts. This has the benefit that all those configuration scripts can be checked-in into the source code repository as code. This allows versioning and documents the expected configuration state.

The buzzword for this is "infrastructure-as-code". The chosen technology is not as important as getting into the habit of doing it. Feel free to use [capistrano](https://capistranorb.com/), [puppet](https://puppet.com/), [chef](https://chef.io), [ansible](https://www.ansible.com), [helm](https://helm.sh/), [terraform](https://www.terraform.io/) or even simple bash/python setup scripts as long as all changes to the target system are done automatically through those.

## Threat-Model-ish

A [Thread Model](https://owasp.org/www-community/Threat_Modeling) is a formal way of analyzing tthe security requirements and controls suitable for a project. While they provide big security benefits but have some publicity problems (as they could degenerate into a massive waste of paper).

Let's start simple: each software project needs a minimal threat model. To create that, just create a very simple text-file directly in the project's corresponding source code repository. This makes sure that developers should be easily be able to look into the threat model. In addition, this includes the threat model into the source code management system with all its benefits (versioning, authentication, signed commits, etc.).

What should the text file include?

- the project name, d'oh
- short description: what are the goals of the project? what are it's non-goals?
- what do I fear? What are critical functions that must not fail? What sensitive data must be protected throughout the application?
- who might attack the software and what capabilities might they have? Defending against script-kiddies differs from defending against nation states.
- security scope: what is under our influence and what not? For example, if we assume that our application server has access to a hardened PostgreSQL database this should be written down here. If we assume that there's a reverse-proxy providing HTTPS this should be written down, etc.
- security assumptions: as developers we are always making some implicit assumptions. This is the place to write them down. For example, my application might use AES-GCM-256 for encryption as this is the current-state-of-the-art: in that case, write this down (bonus points if you add the date when this assumption was taken)

## Perform dependency-management

I hope you're not reinventing the wheel but instead are using proven software libraries and frameworks. Those are (hopefully) regularly tested and reviewed and through that you get access to high-quality functionality instead of potentially adding security bugs to your own re-implementation. There's also a backside: if you're using frameworks and libraries you also must keep them up to date and integrate all their updates in a timely manner.

To do that, you must be aware of new updates (and their security relevance) in the first place. Fortunately there are two open-source tools that help with that:

1. [OWASP dependency-check](https://owasp.org/www-project-dependency-check/) is a ttool that can be integrated into your build-environment. During software building it will check if there are security problems with your used dependencies.
2. [OWASP dependency-track](https://owasp.org/www-project-dependency-track/) works slightly differently. During your software-build you can create a so-called Software Bill-of-Material (SBOM) which includes details about all used library and framework versions. Those can be imported into dependency-track and periodically queried for security updates. In those are found, developers will be notified automatically.

Both tools scratch different itches: dependency-check is valuable directly during development while dependency-track is more suited for long-term maintenance. In doubt, use both.

## Environments

During development your software will have to be setup within different environments:

- development: those are the developers' machines where the development takes place
- staging: this is were new features are integrated and tested. Before code gets moved from development to production, it should be tested within the staging environment.
- production: if you're hosting your own software, this will be the customer-facing systems for production use

This is were all the automation (see "Infrastructure-as-code") will come in handy. Those setup scripts will allow that those different environments will be setup identically and efficiently.

Development and Staging should not use "real data" for testing but some sort of fake/synthetic data. Sadly that data is hard to come by and I have seldom seen development groups that are able to use fake data only.

## Be aware of your company's culture

Even if you prepare for everything, security errors will happen. In that case, the long-term goal should be to learn the most out of them (so that one concrete error will not resurface or happen in another development group). The best way to achieve this, is to talk about findings and errors. This is harder than it sounds, but the alternative is not feasible: if your coworkers are ashamed or afraid about talking their errors, you've already lost as a company.

What worked for me were informal get-togethers or security retrospectives.

Learn to laugh about your own mistakes. This does not mean that you won't take them seriously but that you accept that accidents will happen and you will deal with them as good as you can as well as try to learn from them. Do not crucify developers that made honest mistakes but try to offer them training or information how to improve.

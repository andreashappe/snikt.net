---
layout: post
title: "What is AppSec anyways?"
categories: ["Security", "AppSec"]
date: 2021-06-03
keywords:
- Security
- Development
- secure software development lifecycle
- SDLC
---

AppSec includes all tasks that (hopefully) introduce a secure software development life cycle to development teams. Its final goal is to improve security practices and, through that, to find, fix and preferably prevent security issues within applications. It encompasses the whole application life cycle from requirements analysis, design, implementation, verification as well as maintenance.

To contrast AppSec with a traditional penetration-test: the latter tries to find vulnerabilities within an already existing application while AppSec focuses upon preventing vulnerabilities from entering the application code in the first place. Penetration Tests are also part of AppSec but they are used rather late in the project runtime to verify the security quality of the application and as input for how the development process can be augmented to prevent similar vulnerabilities from subsequently entering the application.

## Why should I care about AppSec?

So, yeah.. that sounds great but why should I care about security during the whole development process?

1. the later vulnerabilities are found, the harder and more expensive they are to fix
2. it's far better to prevent vulnerabilities from entering code than experiencing failures within running products
3. one of the goals of AppSec is teaching existing developers. This yields long-term benefits for the development team and the quality of it's created products.

## Tasks typically performed during AppSec:

Those are tasks that are sprinkled over the application's development life cycle:

* train developers in security topics
* create [threat models](https://en.wikipedia.org/wiki/Threat_model) to identify potential risks and vulnerabilities, use those to recommend mitigations early
* source code audits and reviews
* penetration tests to periodically validate the application's security
* integrate automated scans into the development processes, maybe automate them through usage of CI/CD systems
* integrate tooling to monitor software supply chains for vulnerabilities

## What's the difference to a secure software development life cycle?

The secure Software Development Life Cycle ([SDLC](https://owasp.org/www-project-integration-standards/writeups/owasp_in_sdlc/) has gained prominence lately. What's the difference between AppSec and SDLC? To be honest, there is none.

A development team should use a SDLC, AppSec are just the activities that are taking place to get a development team there. As AppSec targets processes and developers, the activities and created automated tooling are often part of a [left-shift in security](https://www.forbes.com/sites/forbestechcouncil/2021/01/04/a-modern-shift-left-security-approach/).

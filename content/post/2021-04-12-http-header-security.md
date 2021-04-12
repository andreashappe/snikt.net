---
layout: post
title: "HTTP Header Security"
categories: ["security"]
date: 2021-04-12
keywords:
- http header
- security
- x-frame-options
- content-security-policy
- strict-transport-security
---

During a recent presentation on HTTP Header Security I was asked for a "simple" flow chart with directions which headers can be used without too many problems. The result was this:

![which http headers to use?](/assets/2021/http_header_security.png)

What was the reasoning? Initially, basic headers that unify browser behavior are set. They control behavior that is already set when using modern browsers (e.g., [Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)) or unify non-standard behavior (e.g, [X-Content-Type-Options: nosniff](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)). The basic idea behind those headers is, that web developers need to make sure that their website works with those anyway (otherwise people using modern browsers might complain) so it makes sense to take care of those situations during development.

In addition to those, [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) headers are listed to reduce a negative privacy impact.

After that, usage of HTTPS is enforced if feasible. As applications might run within seggregated internal networks (without encryption taking place) we cannot just depend on HTTPS being in-place always. But then, I just added a "are you really, really, really sure if you are not able to use HTTPS" question to make sure that people at least think about it. In addition, future use of HTTP/2 will de-facto enforce usage of HTTPS so hopefully the point will be moot in the near future.

The next big question is, if embedding our website into other websites can be prohibited (and thus [Clickjacking attacks](https://owasp.org/www-community/attacks/Clickjacking) prevented). Finally I mention the [httpOnly flag](https://owasp.org/www-community/HttpOnly) for cookies. Hopefully setting this (and therefore reducting the impact of XSS-attacks) is possible.

As a bonus, I also put [strict-CSP](https://csp.withgoogle.com/docs/strict-csp.html) onto the graph. This might not be feasible for legacy applications but it won't hurt if developers are more often exposed to it anyways.

The [draw.io](https://app.diagrams.net/) source can be found [here](/assets/2021/http_header_security.drawio).

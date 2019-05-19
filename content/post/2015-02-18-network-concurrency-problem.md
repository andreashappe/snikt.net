---
layout: post
title: Network Concurrency Problem
date: 2015-11-13
aliases:
  - /blog/2015/02/18/network-concurrency-problem
categories: ["development", "tech"]
---

A [project](https://www.github.com/archistar) I'm involved with has a traditional
distributed client-server architecture: multiple servers are interconnected,
clients connect to one more servers. In this use-case we're expecting around
four to seven servers with long-running connections between them and approx.
a dozen clients with short-lived connections to the server.

Initially I had used plain Java networking but during 2013 I've switched
over to [netty.io](https://netty.io) as a communication layer. Benefits
were more agile networking code, better concurrency, etc. At least in
theory.

The implemented algorithm (PBFT, as in [BFT](http://en.wikipedia.org/wiki/Byzantine_fault_tolerance)
might not be well suited for concurrent processing. Incoming messages
forward operations (which i might call transactions) between multiple
states. In a perfect world every 2 or 3 messages will lead to data
change. This implies that I need to lock all internal collections and
objects (to prevent race conditions). As each Client should initially have
exactly one open Transaction/Operation we'd have a collection with roughly
a dozen elements.

The generic architecture would look a bit like this:

![](/assets/2015-network-concurrency-problem/overview.jpg)

Netty.io uses the [reactor](http://en.wikipedia.org/wiki/Reactor_pattern)-pattern.
Incoming messages are de-multiplexed to message handlers. This fits our
use-case rather well and is well suited for single-processor scenarios.
As we're targeting multi-core systems this might be sub-optimal. We can
always create more worker threads but then access to mutable data must
be secured (otherwise we will run into race conditions). Currently I am
doing an "interlocked mutex" pattern and would prefer to use a higher-level
abstraction.

I am contemplating using the [Actor Model](http://en.wikipedia.org/wiki/Actor_model)
through [Akka.io](https://www.akka.io). In this computing model actors are
the basic unit of computation. They receive messages and act upon then. Our
worker threads have a close resemblance to actors. Through using a framework
that utilizes this model we should improve our message handling (each actor
has a mailbox, which might be persisted) as well as have a good base for
creating a fault-tolerant system. But alas, the whole locking and mutable
data access problem still persists within the actor.

The core of the problem is the mutable nature of our data. Can I apply some
functional programming magic and improve performance this way? Our algorithm
uses three collections, a transaction traverses through all those
collections. We can reform our worker loop into using only append-only
memory:

~~~ ruby
def worker_loop(collection1, collection2, collection3)
  data = receive_data_from_dispacher()
  transaction = retrieve_transaction_for(data)
  perform_calculations_upon_data
  worker_loop(collection1, collection2 + transaction, collection3)
end
~~~

To prevent infinitely growing collections another worker will remove
finished transactions periodically. What does this solve? I fear not
much as we still need collection locking for the maintenance worker. At
least the code might get easier to read -- but then, we're working in
Java so collections are not read-only memories and the whole passing
immutable collections-thing kinda implodes.

A colleague mentioned using [Software Transactional Memory](http://en.wikipedia.org/wiki/Software_transactional_memory)
-- on a high-level this looks like using database transaction semantics
for in-memory transaction control. Sounds fine in theory, but then with
our write-heavy use-case this will realistically degrade our performance
(as too many transactions will fail).

So maybe the way forward is to combine the Actor-Pattern with lock-free
programming to achieve higher throughput.

Not a very satisfying outcome, suggestions anyone?

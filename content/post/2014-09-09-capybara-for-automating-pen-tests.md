---
layout: post
title: Capybara for automating Pen-Tests
date: 2014-09-09
aliases:
  - /blog/2014/09/09/capybara-for-automating-pen-tests
tags: ["linux", "security", "rails"]
---

After a successful penetration test a re-test is performed. The common approach is
that the customer fixes the code and I perform the necessary steps to confirm that
that initial security breach was closed. Sometimes it takes the customer a couple
of tries to achieve that.

Most security problems (XSS, CSRF, SQLi) can easily be automated tested, but I had
problems automating server-side authentication and authorization problems. The
test would have to emulate multiple parallel user sessions. The tests mostly consists
of one session trying to access the resources of another user session.

Seems like a good match for [Capybara](https://github.com/jnicklas/capybara) and
[Poltergeist](https://github.com/teampoltergeist/poltergeist).

<!-- more -->

## Capybara and PhantomJS Setup

Capybara is a driver-agnostic website testing framework (or rather DSL) and is
mostly used for acceptence testing in Ruby on Rails. Poltergeist is a phantomjs/webkit-based
driver backend for capybara.

Let's look at a simple test patch script that performs a login at onvista.de, initally we
need to perform some setup and create a session:

~~~ ruby
require 'capybara'
require 'capybara/dsl'
require 'capybara/poltergeist'

Capybara.register_driver :poltergeist do |app|
  Capybara::Poltergeist::Driver.new(app, js_errors: false)
end

Capybara.default_driver = :poltergeist
Capybara.run_server = false
Capybara.app_host = 'http://my.onvista.de'

session = Capybara::Session.new :poltergeist
~~~

Some notes:

* you need to pass "js_errors: false", otherwise poltergeist would stop at the first
  javascript error. This is due to it's original use case as application testing aid
* [capybara-webkit](https://github.com/thoughtbot/capybara-webkit) is a viable alternative
  to phantomjs. It is more resistent to defective pages (for example it ignores javascript
  errors by default and is able to cope with rather exotic javascripts) but alas is slower
  than phantomjs

## Login to a site using Capybara

~~~ ruby
def login(session, username, password)
  session.visit "/musterdepot/"
  session.click_button "Zum Login"

  session.within("#formular") do
    session.fill_in "USERNAME", with: username
    session.fill_in "PASSWORD", with: password
    session.click_button "Login"
  end
end

# now the test begins

login(session, "some-user", "some-password")

# save a screenshot of the current browser window
session.save_screenshot("/tmp/some_screenshot.png")

# or open the page within a browser
session.save_and_open_page
~~~

## Mini::Test integraton

This would already be enough for creating a one-shot test case. But in reality
faulty web applications that have problems with server-side authentication and/or
authorization all over the place. Writing the whole test setup code over and over
again ain't the best use of time.

I've created a simple [minitest_helper gist](https://gist.github.com/andreashappe/d95d400c5e8c9a3cf02b)
that can be included from a [minitest](https://github.com/seattlerb/minitest). This
should reduce the setup code quite a bit.

A sample test suite could be:

~~~ ruby
require_relative 'test_helper'

class CapybaraMiniTest < PenTest::TestCase

  def setup
    Capybara.app_host = 'http://snikt.net'
  end

  def test_snikt
    visit('/')
    page.has_content?("Andreas Happe")
  end

  def test_multiple_sessions
    session1 = Capybara::Session.new(:poltergeist)
    session2 = Capybara::Session.new(:poltergeist)

    session1.visit("/")
    session2.visit("/")
  end
end
~~~

## Where to go from here?

Now that we have a simple minitest-based test suite we can easily extend it with
addtional functionality. Ideas in my head include:

* utilizing [pry-rescue](https://github.com/ConradIrwin/pry-rescue) to automatically
  drop into a debug console in case of errors
* try different backend drivers (for example selenium should be slower but it supports
  [almost all relevant browsers](http://docs.seleniumhq.org/about/platforms.jsp).
* write capybara helpers for common tasks
* maybe even write [Cucumber](http://cukes.info/) cukes to make test-cases readable
  for customers

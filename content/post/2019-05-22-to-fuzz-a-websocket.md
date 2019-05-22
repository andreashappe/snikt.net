---
layout: post
title: "To Fuzz a WebSocket"
categories: ["security"]
date: 2019-05-22
---

During a recent assignment the customer server was utilizing a WebSocket for some notification transport, part of my assignment was to fuzz-test the used WebSocket (and the messages transported over it).

To do this, I turned to my typical tools:

* [PortSwigger BURP](https://portswigger.net/burp) only supports display of WebSocket messages but not altering and/or automated fuzzing of websocket messages.
* [OWASP ZAP](https://www.owasp.org/index.php/OWASP_Zed_Attack_Proxy_Project) can inject and fuzz web sockets (e. g. using [FuzzDB](https://github.com/fuzzdb-project/fuzzdb) vectors), alas the tested application disconnects the websocket and thus prevents ZAP from performing the fuzzing attack.

So again I had to write a small python script. This time i used the [Kitty fuzzing framework](https://github.com/cisco-sas/kitty) and the python web socket library to create a simple WebSocket transport/target for Kitty (`WebSocketTarget`). This target reopens the web socket after each sent message, so the disconnect behavior would not limit the testing (but would decrease its performance --- I can live with that).

To perform the fuzzing I modeled a valid WebSocket JSON-based message as a Template and set up a simple ServerFuzzer with that. As I had access to the server-side logs I did not need any Monitor or Stack (which would otherwise be responsible for detecting if the tested server is still alive and would restart it if needed).

See the following code snippet, hopefully this will help you with your pen test assignments:

~~~ python
import ssl
import websocket

from kitty.model import *
from kitty.interfaces import WebInterface
from kitty.fuzzers import ServerFuzzer
from kitty.targets import ServerTarget
from kitty.controllers.base import BaseController

from websocket._exceptions import WebSocketConnectionClosedException

# ignore ssl certificate so that I can use ZAP Proxy for monitoring
def open_connection(url):
    ws = websocket.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE})
    ws.connect(url, http_proxy_host="localhost", http_proxy_port=8080)
    return ws

# simple helper target class that would drive the communication to the websocket.
# in this simplistic initial version reconnect after each sent message
class WebSocketTarget(ServerTarget):
    def __init__(self, url, name="WebSocketTarget", logger=None, expect_response=False):
        super(WebSocketTarget, self).__init__(name, logger, expect_response)
        self.url = url
        self.ws = None

    def setup(self):
        self.ws = open_connection(self.url)
        super(WebSocketTarget, self).setup()

    def pre_test(self, test_num):
        if self.ws:
            self.ws.close()
        self.ws = open_connection(self.url)
        super(WebSocketTarget, self).pre_test(test_num)

    def _send_to_target(self, payload):
        try:
            self.ws.send(payload)
        except (WebSocketConnectionClosedException, ssl.SSLError, ConnectionResetError):
            self.ws = open_connection(self.url)
            self.ws.send(payload)

    def post_test(self, test_num):
        if self.ws:
            self.ws.close()
        super(WebSocketTarget, self).post_test(test_num)

    def teardown(self):
        if self.ws:
            self.ws.close()
        super(WebSocketTarget, self).teardown()

# create a simple subscription message template
subscribe_msg = Template(name="SUBSCRIBE", fields=[
    String('{"type":"', name='type', fuzzable='false'),
    String('SUBSCRIBE', name='command'),
    String('","channels":[{"name": "', name='subscribe', fuzzable=False),
    String('MARKET_TICKET', name='ticker_name'),
    String('","instrument_codes":["', name='in_between', fuzzable=False),
    String('BTC_EUR', name='currency'),
    String('"]}]}', name='closing_brackets', fuzzable=False)
])

url = "wss://target.local/"

# start the fuzzer
target = WebSocketTarget(url)

model = GraphModel()
model.connect(subscribe_msg)

fuzzer = ServerFuzzer()
fuzzer.set_model(model)
fuzzer.set_target(target)
fuzzer.set_interface(WebInterface())
fuzzer.start()
~~~

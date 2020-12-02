---
layout: post
title: "Running OWASP Juice Shop with Root-the-Box on Google Cloud Platform"
categories: ["tech"]
date: 2020-12-02
keywords:
- linux
- juiceshop
- multijuicer
- rootthebox
- teaching
- ctf
---

So I am back at teaching web application security. This time I wanted to setup a [CTF challenge](https://en.wikipedia.org/wiki/Wargame_(hacking)) for my students. To not reinvent the wheel, or rather, to stand on the shoulders of giants I am reusing the [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) vulnerable web app in its CTF mode.

Normally I would teach at a (physical) lab which would make the setup easy: all students are situated in the same physical room, I can setup the game server on my laptop and distribute virtual machines containing the vulnerable web app over the local network. Well, that thing called COVID-19 happened so this is not an option right now.

What are my basic requirements?

- a simple game server where teams can register and keep track of their solved challenges. To further facilitate my student's learning, it would be great if some hints can be displayed within the game server.
- a separate CTF server per team/student containing the vulnerable web application.
- both of them should be hosted "in" the internet. As I do have some Google Cloud credits available, it would be perfect if I can utilize the [Google Cloud Platform](https://console.cloud.google.com) for this.
- right now, performance is not so much of an issue as I only expect around twenty concurrent students in my lab

## Basic Setup/Architecture

After some research I settled on a very simple setup:

- I will use [juice-shop-ctf](https://github.com/bkimminich/juice-shop-ctf) to generate a configuration file for the game server as well as the CTF-key for the vulnerable web applications
- [Root-the-Box](https://github.com/moloch--/RootTheBox) hosted on a GCP virtual machine as game server
- [MultiJuicer](https://github.com/iteratec/multi-juicer) on a GCP-hosted Kubernetes cluster to spawn a separate JuiceShop CTF container for each player/team.

Following the recommendation by MultiJuicer I should expect to use 5 CPU-cores as well as around 5 Gigabyte of memory for the Kubernetes cluster for my approx. 10 containers. To make sure we're on the safe side, let's double the available memory..

## Create CTF Configuration

Initially we need to generate a CTF game-server configuration file: this will contain all data needed for the game-server including the CTF key. This is a shared secret (with the CTF containers containing the vulnerable web sites) that makes sure that only "our" CTF servers are able to commit to "our" game server.

There's the handy [juice-shop-ctf](https://github.com/bkimminich/juice-shop-ctf) tool to create this configuration file. It's a node.js program that can be easily be installed using and run using npm (or even be run within the [google cloud shell](https://cloud.google.com/shell) by:

~~~ bash
andreashappe@cloudshell:~ (directed-portal-296918)$ npm install -g juice-shop-ctf-cli
npm WARN deprecated request@2.88.2: request has been deprecated, see https://github.com/request/request/issues/3142
npm WARN deprecated request-promise@4.2.6: request-promise has been deprecated because it extends the now deprecated request package, see https://github.com/request/request/issues/3142
npm WARN deprecated har-validator@5.1.5: this library is no longer supported
npm WARN deprecated request-promise-native@1.0.9: request-promise-native has been deprecated because it extends the now deprecated request package, see https://github.com/request/request/issues/3142
/usr/local/nvm/versions/node/v10.14.2/bin/juice-shop-ctf -> /usr/local/nvm/versions/node/v10.14.2/lib/node_modules/juice-shop-ctf-cli/bin/juice-shop-ctf.js
+ juice-shop-ctf-cli@8.1.2
added 170 packages from 187 contributors in 7.624s
andreashappe@cloudshell:~ (directed-portal-296918)$ juice-shop-ctf

Generate OWASP Juice Shop challenge archive for setting up CTFd, FBCTF or RootTheBox score server
? CTF framework to generate data for? (Use arrow keys)
? CTF framework to generate data for? RootTheBox
? Juice Shop URL to retrieve challenges? https://juice-shop.herokuapp.com
? Secret key <or> URL to ctf.key file? trustno1
? Insert a text hint along with each challenge? Free text hints
? Insert a hint URL along with each challenge? Paid hint URLs

Full Game Export written to /home/andreashappe/OWASP_Juice_Shop.2020-11-29.RTB.xml
~~~

In this example I have chosen the following configuration (changes):

- use Root-theBox as game-server
- use a new CTF key "trustno1" (please use a more secure one)
- give free text hints to students (within the game server)
- give optional URL hints to students (within the game server). Those are "paid" hints, i.e., if a student chooses to take one it will lower his/her points on the leader board

The command produces a XML-file, this will be imported into the Root-the-Box administrative web-interface later on.

## The Game Server: Root-the-Box

Now that we have the configuration covered, the game server is next. The game server will take the configuration file and provide players with an interface to enter their captured flags as well as be able to check the leader-board for their ranking within the CTF game.

I have chosen [Root-the-Box](https://github.com/moloch--/RootTheBox) as my game engine. In addition to the mentioned features it allows for team communication (chat, shared files), mission trees with optional challenge hints as well as some web-based hacking tools. To keep the setup simple we will deploy it to the [Google Cloud Platform](https://cloud.google.com/) itself.

Setting up the game server was pretty straight-forward: go to the Google Cloud Platform -> Computing -> Compute Engine -> VM Instances and create a new Virtual Instance (I have chosen an e2-small image running Debian 10.6). Use the web-based "SSH"-connection to setup the game-server:

``` bash
$ sudo apt install git
$ git clone git://github.com/moloch--/RootTheBox.git
$ sudo apt install docker-compose
$ sudo usermod -aG docker <username>
$ sudo su <username>
$ sudo systemctl start docker
$ cd RootTheBox/
$ docker-compose build
$ docker-compose up
```

You can close the web-based SSH connection now.

Next we need to make the game server available to the wider internet. To achieve that, go to the created virtual instance and add the network tag "game-server". Then go to Networks -> VPC Networking -> Firewall and add a new ingress/incoming rule that allows accessing the game-server:

- direction: incoming/ingress
- target/destination: game-server
- source: 0.0.0.0/0
- protocol and port: tcp:8888

With that you can access the game server through http://public-ip:8888. You can gather the public IP from GCP's virtual instance list. Go to the game server, login with user admin, password "rootthebox", and set a new admin password. Finally, go to the "Backup/Restore" menu and upload the XML Configuration file that was generated with juiceshop-ctf-cli during the last step. With that, the game-server is now set up for the players (with all the challenges and their corresponding hints).

On a side note: originally I tried to install the game-server in Heroku's free tier. The setup worked very fine but the free tier does not allow for persistent storage. This means that if the virtual machine is reset or suspended (which happens automatically when it's inactive) the whole storage is lost. When this happens, the whole setup data is lost and the admin password reset to the default value. Which is not good for a security-related game..

## Part 2: Setup multi-juicer in GCP

Now that we have the game server we need to prepare our players' gaming setup.

### Create a new Kubernetes Cluster

Let's start by creating a new Kubernetes cluster that will hold/spawn the players' containers.

To do that, go to the GCP and navigate to Computing -> Kubernetes Engine -> Cluster and click the "create new cluster" button. Chose a nearby zone and create the cluster. The default cluster consists of three e2-medium cluster nodes (each containing two vCPUs and four Gigabyte of memory). I've added two more, this should be enough to host 10 parallel containers (= teams) while costing around $4-5 per CTF-day.

To setup the CTF container connect through [Google Cloud Shell](https://cloud.google.com/shell) (click on the "connect" button next to the newly created cluster in the cluster view). In the newly connected console check that the cluster is running and deploy the infrastructure for the CTF infrastructure:

``` bash
$ kubectl cluster-info
$ git clone https://github.com/iteratec/multi-juicer.git
$ cp multi-juicer/helm/multi-juicer/values.yaml .
# adopt values.yaml (see below)
$ helm install -f values.yaml multi-juicer ./multi-juicer/helm/multi-juicer/
# retrieve the admin password
$ kubectl get secrets juice-balancer-secret -o=jsonpath='{.data.adminPassword}' | base64 --decode
```

What did I change in the values.yaml:

- change "nodeEnv" from "multi-juicer" to "ctf"
- change "maxInstances" from "10" to "20"
- change "ctfKey" to the key used during running juiceshop-ctf-cli ("trustno1" in our example)

### Export the CTF infrastructure to the public internet

Now export the load-balancer (where players can register their teams and spawn their CTF container) to the public internet:

``` bash
$ wget https://raw.githubusercontent.com/iteratec/multi-juicer/master/guides/k8s/k8s-juice-service.yaml
$ kubectl apply -f k8s-juice-service.yaml
# now call kubectl describe until the public ip address is shown
$ kubectl describe svc multi-juicer-loadbalancer
```
## Uninstallation Instructions

After the CTF event is done, don't forget to uninstall/remove your setup to prevent run-away Google Cloud Platform costs:

``` bash
$ helm uninstall multi-juicer
$ kubectl delete -f k8s-juice-service.yaml
```

In addition delete your cluster as well as the virtual instances (cluster nodes and game server).

## Appendix: What would I do differently the next time?

This setup works as intended but if I would redo it I'd change the following:

- switch the cluster nodes from e2-medium to e2-small. This is cheaper as base setup, I can always dynamically add more nodes to the cluster anyways --- as my containers seem to be mostly CPU-limited this should provide more virtual machines..
- setup SSL certificates and offer everything over HTTPS
- instead of using a separate e2-small instance for the game-server, deploy the game-server into the Kubernetes cluster itself

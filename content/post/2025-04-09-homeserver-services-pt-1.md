---
layout: post
title: "Homeserver: Services Pt. 1"
categories: ["Linux", "Tech"]
date: 2025-04-09
keywords:
- linux
- server
- audiobookshelf
- gitea
- tt-rss
- rss reader
---
I am running a home server for a while now. I have been using it to host some services that I use regularly. In this post, I will share my experience with some of the services I have set up on my home server.

This initial post will go over local `git` hosting using [gitea](https://about.gitea.com/), audiobook streaming using [audiobookshelf](https://audiobookshelf.org/) and a self-hosted RSS reader using [tt-rss](https://tt-rss.org/).

<!--more-->

## Preliminaries

Just some notes before we start with the different service configurtions:

- based upon [my basic homeserver setup](https://snikt.net/blog/2025/04/05/building-a-little-home-server-with-linux-tailscale-protonvpn-docker-compose-and-vm-support/).
    - the nginx configuration file is `/etc/nginx/sites-enabled/default`
    - all services will be placed behind a reverse proxy (nginx) and will be accessed through `https://meltingpot.social/<servicename>`
    - [docker compose](https://docs.docker.com/compose/) is used to run the services. We will make sure that docker services are only exposed through the nginx reverse-proxy [and not directly to the network](https://brokkr.net/2022/03/29/publishing-docker-ports-to-127-0-0-1-instead-of-0-0-0-0/)
- I use `/media/data/container/<container-name>` for container-data.
- Within my homedirectory (`/home/andy/`), I create a simple directory per service, copy the `docker-compose.yaml` file into it and then start it through `docker compose up` in a `tmux` session
    - I start everything with tmux and detaching from tmux (`ctrl-b d`) after I manually mount the encrypted data harddrive.
- Typically, you will have do to some sort of configuration when you first access the container's website. If I remember something "special" was needed during setup, I will note this here.

And now for the services..

## Audiobook-Server for my Humble Audio-Bundles

I got a couple of audiobooks from [humblebundle](https://www.humblebundle.com) over time. Initially I just copied them on my android phone and used `vlc` for playing them. There were some problems: I wanted some sort of sleep-timer, in addition I ran in to problems with audiobooks that were split up into multiple parts.

The solution was to user [audiobookshelf](https://audiobookshelf.org/). It is a self-hosted audiobook server that allows you to stream your audiobooks to your devices. It has a nice web interface and works well with the [android app](https://play.google.com/store/apps/details?id=com.audiobookshelf.app&hl=en&pli=1). This allows for a sleeping timer, resuming playback, and even offline use within the android app.

I only store audiobooks on the data drive, as I don't use podcasts (yet).

I am using the following `docker-compose.yaml` file:

```yaml
services:
  audiobookshelf:
    image: ghcr.io/advplyr/audiobookshelf:latest
    ports:
      - 127.0.0.1:13378:80
    volumes:
      - /media/data/media/audiobooks:/audiobooks
      - /media/data/containers/audiobookshelf/podcasts:/podcasts
      - /media/data/containers/audiobookshelf/config:/config
      - /media/data/containers/audiobookshelf/metadata:/metadata
    environment:
      - TZ=Europe/Vienna
```

To put `audiobookshelf` behind the nginx reverse proxy, I add the following to the nginx configuration (in `/etc/nginx/sites-enabled/default`):

```plain
server {

	# other stuff..

	location /audiobookshelf {
		proxy_pass http://127.0.0.1:13378/audiobookshelf;

		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto  $scheme;
      		proxy_set_header Host               $http_host;
      		proxy_set_header Upgrade            $http_upgrade;
      		proxy_set_header Connection         "upgrade";
      		proxy_http_version                  1.1;
		proxy_redirect	http:// https://;
		#proxy_set_header X-Real-IP $remote_addr;
	}
	
	# other stuff ..
}
```

## Git-Server for Obsidian Sync (gitea)

I am using [obisidan](https://obsidian.md/) for my notes. To sync notes between devices I am using the [git plugin](https://github.com/Vinzent03/obsidian-git). Before having the home-server, I was using a private github repository as git backend, but now that I have a local server it made sense to move the repository to my home server. I am using [gitea](https://gitea.com/) for this as it is a lightweight and [easy-to-use solution for hosting your own git repositories](https://unixhost.pro/blog/2023/03/installing-and-configuring-gitea-in-a-docker-container-a-guide-for-developers-and-devops-specialists/).

This is the `docker-compose.yaml` file I am using:

```yaml
version: "3"

services:
  server:
    image: gitea/gitea:latest
    container_name: gitea
    restart: always
    environment:
      - USER_UID=1000
      - USER_GID=1000
    volumes:
      - /media/data/containers/gitea/data:/data
      - /media/data/containers/gitea/custom:/app/gitea/custom
      - /media/data/containers/gitea/log:/app/gitea/log
    ports:
      - "127.0.0.1:3000:3000"
      - "2222:22"
```

After the intial start, a new configuration file is created at `/media/data/containers/gitea/data/gitea/conf/app.ini`. You can edit this file to change the configuration of gitea. The most important settings changes are:

```
[server]
...
ROOT_URL = https://meltingpot.social/gitea
...
SSH_PORT = 2222
DOMAIN = meltingpot.social
SSH_DOMAIN = meltingpot.social
...
```

This changes make sure that the `git clone` URLs displayed within gitea are actually working.

Finally, we also have to add the following to the nginx configuration (in `/etc/nginx/sites-enabled/default`):

```
server {
    # other configuraiton..

    location ~ ^/(gitea|v2)($|/) {
        client_max_body_size 512M;

        # make nginx use unescaped URI, keep "%2F" as-is, remove the "/gitea" sub-path prefix, pass "/v2" as-is.
        rewrite ^ $request_uri;
        rewrite ^/(gitea($|/))?(.*) /$3 break;
        proxy_pass http://127.0.0.1:3000$uri;

        # other common HTTP headers, see the "Nginx" config section above
        proxy_set_header Connection $http_connection;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # other configuration..
}
```

## TT-RSS for news aggregation and processing

The final part for this blog post will be [tt-rss](https://tt-rss.org/). It is a self-hosted RSS reader that allows you to read and manage your RSS feeds. It has a nice web interface and works well with the [android app](https://play.google.com/store/apps/details?id=org.fox.ttrssreader&hl=en&pli=1). I am using it to filter and read my RSS feeds from various sources.

In addition, I am installing the `ironfeed` plugin. This plugin can be used to grab full news items (instead of only having the summary typically included in the RSS feed), remove ads, and combine multi-page posts into a single news item.

Configuration is a bit more involved than the other two services. Create the service directory, e.g. `/home/andy/tt-rss` and copy the following `.env` file as well as the `docker-compose.yaml` file into it:

```env
# Put any local modifications here.

# Run FPM under this UID/GID.
# OWNER_UID=1000
# OWNER_GID=1000

# FPM settings.
#PHP_WORKER_MAX_CHILDREN=5
#PHP_WORKER_MEMORY_LIMIT=256M

# ADMIN_USER_* settings are applied on every startup.

# Set admin user password to this value. If not set, random password
# will be generated on startup, look for it in the 'app' container logs.
#ADMIN_USER_PASS=

# Sets admin user access level to this value. Valid values:
# -2 - forbidden to login
# -1 - readonly
#  0 - default user
# 10 - admin
#ADMIN_USER_ACCESS_LEVEL=

# Auto create another user (in addition to built-in admin) unless it already exists.
#AUTO_CREATE_USER=
#AUTO_CREATE_USER_PASS=
#AUTO_CREATE_USER_ACCESS_LEVEL=0

# Default database credentials.
TTRSS_DB_USER=postgres
TTRSS_DB_NAME=postgres
TTRSS_DB_PASS=password

# You can customize other config.php defines by setting overrides here.
# See tt-rss/.docker/app/Dockerfile for a complete list.

# You probably shouldn't disable auth_internal unless you know what you're doing.
TTRSS_PLUGINS=auth_internal,auth_remote
# TTRSS_SINGLE_USER_MODE=true
# TTRSS_SESSION_COOKIE_LIFETIME=2592000
# TTRSS_FORCE_ARTICLE_PURGE=30
# ...

# Bind exposed port to 127.0.0.1 to run behind reverse proxy on the same host.
# If you plan to expose the container, remove "127.0.0.1:".
HTTP_PORT=8280
#HTTP_PORT=8280
```

In the `docker-compose.yaml` file, we are using the environmental configuration from the `.env` file. We also make sure that tt-rss is not exposed to the network, but only to the nginx reverse proxy and enable periodic backups:

```yaml
version: '3'

services:

  # see FAQ entry below if upgrading from a different PostgreSQL major version (e.g. 12 to 15):
  # https://tt-rss.org/wiki/InstallationNotes/#i-got-the-updated-compose-file-above-and-now-my-database-keeps-restarting
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - POSTGRES_USER=${TTRSS_DB_USER}
      - POSTGRES_PASSWORD=${TTRSS_DB_PASS}
      - POSTGRES_DB=${TTRSS_DB_NAME}
    volumes:
      - /media/data/containers/tt-rss/db:/var/lib/postgresql/data

  app:
    image: cthulhoo/ttrss-fpm-pgsql-static:latest
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - /media/data/containers/tt-rss/app:/var/www/html
      - /media/data/containers/tt-rss/config.d:/opt/tt-rss/config.d:ro
    depends_on:
      - db

#  optional, makes weekly backups of your install
  backups:
    image: cthulhoo/ttrss-fpm-pgsql-static:latest
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - /media/data/containers/tt-rss/backups:/backups
      - /media/data/containers/tt-rss/app:/var/www/html
    depends_on:
      - db
    command: /opt/tt-rss/dcron.sh -f

  updater:
    image: cthulhoo/ttrss-fpm-pgsql-static:latest
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - /media/data/containers/tt-rss/app:/var/www/html
      - /media/data/containers/tt-rss/config.d:/opt/tt-rss/config.d:ro
    depends_on:
      - app
    command: /opt/tt-rss/updater.sh

  web-nginx:
    image: cthulhoo/ttrss-web-nginx:latest
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - 127.0.0.1:${HTTP_PORT}:80
    volumes:
      - /media/data/containers/tt-rss/app:/var/www/html:ro
    depends_on:
      - app
```

Stanza for nginx:

```text
        location /tt-rss {
                proxy_pass http://127.0.0.1:8280/tt-rss;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto  $scheme;
        }
```

Start this using `docker compose up` and then go to `https://meltingpot.social/tt-rss` to finish the setup. Check the output of `docker compose` for the randomly generated password for the `admin` user.

For setup of `feediron` we need to install the plugin. This is done by cloning the repository into the `plugins.local` directory of tt-rss:

```bash
$ /media/data/containers/tt-rss/app/tt-rss
$ git clone https://github.com/feediron/ttrss_plugin-feediron.git plugins.local/feediron
```

and enable it in the `admin` -> `configuration` -> `plugins` section
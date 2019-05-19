---
layout: post
categories: ["tech", "linux", "virtualization"]
tags: ["linux", "virtualization"]
title: "Using a (host) reverse-proxy together with LXC application servers"
description: "How to combine an reverse proxy (nginx) running on the host with virtualized aplication workers"
keywords: "virtualization lxc nginx reverse-proxy seafile ttrss"
aliases:
  - /blog/2014/04/07/host-reverse-proxy-with-lxc-app-servers
date: 2014-04-25
---

The basic idea is to move application servers into LXC containers while keeping the HTTP server part (which is also responsible for hosting static files) on the host system.

Normally an incoming request would be handled by an HTTP server on the host as well as by an HTTP server on the virtualized client:

~~~
  browser -> http server(host) -> http server (guest) -> app-server (guest)
~~~

I'm configuring the host HTTP server to directly communicate with the app worker, thus:

~~~
   browser -> http server (host) -> app sever (guest)
~~~

This removes one layer of indirection and simplifies HTTP server configuration (think maximum file-sizes which would have to be adopted for each web server). This is also possible als LXC containers are located within the host filesystem (i.e. `/var/lib/lxc/<container name>/rootfs`): the host web server can thus directly access static files without even invocing the guest container in the first place.

<!-- more -->

One downfall for my (converted) setups was that the Unix sockets within the containers were located within `/var/run` by default -- this was located within an per-container tmpfs (virtual in-memory filesystem). This makes this file invisible from outside the container. The quick'n'dirty solution for this was to move the unix domain socket into the containers root filesystem: this will be available from outside the container.

Some example configurations:

## ttrss

nginx configuration:

~~~
location /ttrss {
        root /var/lib/lxc/ttrss/rootfs/var/www/;
        index index.php;

        location ~ \.php$ {
                include /etc/nginx/fastcgi_params;
                fastcgi_index index.php;
                fastcgi_param SCRIPT_FILENAME /var/www/$fastcgi_script_name;
                fastcgi_pass unix:/var/lib/lxc/ttrss/rootfs/php5-fpm.sock;
        }
}
~~~

Notice the `fastcgi_param` entry: here the requested PHP filename is rewritten so that the in-container path (which will be forwarded to the PHP-FPM application server) does not contain the LXC container prefix (`/var/lib/lxc/ttrss/rootfs`).

## seafile

nginx configuration:

~~~
location /seafile {
        fastcgi_pass    192.168.122.21:8000;
        fastcgi_param   SCRIPT_FILENAME     $document_root$fastcgi_script_name;
        fastcgi_param   PATH_INFO           $fastcgi_script_name;

        fastcgi_param   SERVER_PROTOCOL     $server_protocol;
        fastcgi_param   QUERY_STRING        $query_string;
        fastcgi_param   REQUEST_METHOD      $request_method;
        fastcgi_param   CONTENT_TYPE        $content_type;
        fastcgi_param   CONTENT_LENGTH      $content_length;
        fastcgi_param   SERVER_ADDR         $server_addr;
        fastcgi_param   SERVER_PORT         $server_port;
        fastcgi_param   SERVER_NAME         $server_name;

        access_log      /var/log/nginx/seahub.access.log;
        error_log       /var/log/nginx/seahub.error.log;
}

location /seafhttp {
        rewrite ^/seafhttp(.*)$ $1 break;
        proxy_pass http://192.168.122.21:8082;
        client_max_body_size 0;
}

location /seafmedia {
        rewrite ^/seafmedia(.*)$ /media$1 break;
        root /var/lib/lxc/seafile/rootfs/home/seafile/base/seafile-server-latest/seahub;
}
~~~

There's actually nothing noteworthy here.

## gitlab

I'm using gitlab not with a domainname of its own but am "mouting" it at /gitlab. This allows me to reuse the same SSL certificate. The corresponding nginx configuration:

~~~
location /gitlab {
        try_files $uri $uri/index.html $uri.html @gitlab;
}

location @gitlab {
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_redirect off;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://unix:/var/lib/lxc/gitlab/rootfs/home/git/gitlab/tmp/sockets/gitlab.socket;
}
~~~

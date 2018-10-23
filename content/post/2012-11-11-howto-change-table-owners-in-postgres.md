---
layout: post
title: "Postgres: Howto change owner for all tables"
date: 2012-11-11
aliases:
  - /blog/2012/11/11/howto-change-table-owners-in-postgres
tags: ["linux", "database", "postgres"]
description: "Howto change owner of all tables of a database (in postgresql)"
keywords: "postgresql, postgres, owner, linux, change ownership, change owner"
---
Just a small tip for today: when moving an RoR-application between servers the database user often changes. While it is easy to dump and restore database dums using pg\_dump and pg\_restore this might lead to invalid table ownerships on the new host.

I'm using the following bash snippet for fixing this problem <!--more-->(just exchange $DATABASE and $NEW_OWNER" with the corresponding database and username, execute the following bash script as postgres user):

~~~ bash 
 $ for tbl in `psql -qAt -c "select tablename from pg_tables where schemaname = 'public';" $DATABASE` ; do  psql -c "alter table $tbl owner to $NEW_OWNER" $DATABASE ; done
~~~

If you tend to use this script more often encapsulate it in a quick-and-dirty bash script:

~~~ bash 
#!/bin/bash

# test that there are two arguments
if test $# -lt 2; then
  echo "usage: $0 <database> <new-owner>"
  exit 0
fi

database=$1
new_owner=$2
tables=`psql -qAt -c "select tablename from pg_tables where schemaname = 'public';" $database`

for tbl in $tables ; do
  psql -c "alter table $tbl owner to $new_owner" $database ;
done
~~~

---
layout: post
title: pathogen vs vundle
date: 2015-02-18
aliases:
  - /blog/2014/09/12/pathogen-vs-vundle
categories: ["tech", "linux", "vim"]
---

[Pathogen](https://github.com/tpope/vim-pathogen) was the first vim plugin
management system that I've known of. The contender is [Vundle](https://github.com/gmarik/Vundle.vim) which seems
to be inspired in it's configuration syntax (and name) by Ruby's [Bundler](http://bundler.io/).

So let's compare those two.

<!-- more -->

## Pathogen

Pathogen's workings are quite easy to grasp: each plugin
is a directory within "~/.vim/bundle/"; pathogen traverses through the plugin
list and includes each one of them. Let's see a sample directory:

~~~ bash
[~/.vim]$ ls -l bundle/
drwxr-xr-x  5 andy andy 4096 Sep  8 22:20 ag
drwxr-xr-x  5 andy andy 4096 Sep  8 22:20 ctrlp.vim
drwxr-xr-x  7 andy andy 4096 Sep  8 22:22 syntastic
drwxr-xr-x 13 andy andy 4096 Sep  8 22:23 ultisnips
drwxr-xr-x  7 andy andy 4096 Sep  8 22:26 vim-airline
...
~~~

It gets really powerful when you store you ~/.vim directory within a [git
repository](https://github.com/andreashappe/config-vim) and share it between multiple computers. If you use git
submodules for each plugin you even get versioned plugins for free.

~~~ bash
[~/.vim]$ git submodule
 d3a00f8affb091e7a14eb34f1beb9db9bb57a4bf bundle/ag (heads/master)
 b5d3fe66a58a13d2ff8b6391f4387608496a030f bundle/ctrlp.vim (1.79-27-gb5d3fe6)
 83b6d6a587aeac10fda14f363c536e739079c813 bundle/syntastic (3.5.0-7-g83b6d6a)
 386b3a0976574b3113d5a29ccdb26418716b345e bundle/ultisnips (3.0-102-g386b3a0)
 37096dbdcb84d89b17e6706f3e4e84da3c2a2990 bundle/vim-bundler (v2.0-27-g37096db)
 ...
~~~

## Vundle

Vundle is the newcomer. As it's name suggests it's configuration  seems
to be inspired by Bundler: each plugin is defined within the main ~/.vimrc:

~~~
" required by Vundle
set nocompatible
filetype off

" add runtime path to include Vundle and initalize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

" now add plugins
Plugin 'gmarik/Vundle.vim'
Plugin 'tpope/vim-fugitive'

" reactive stuff after vunlde has completed
call vundle#end()
filetype plugin indent on
~~~

Now you can install all plugins from within Vim by calling ":PluginInstall".
This in term installs all configured plugins within ~/.vim/bundle/":

~~~ bash
[~]$ ls -l ./.vim/bundle
total 8
drwxr-xr-x 5 andy andy 4096 Sep 12 20:25 vim-fugitive
drwxr-xr-x 6 andy andy 4096 Sep 12 20:23 Vundle.vim
~~~

Note that Vundle.vim was initially cloned by myself but is managed by Vundle
itself after the initial installation. The plugins itself are checked out from
git:

~~~ bash
[~/.vim/bundle]$ ls vim-fugitive -al
total 36
drwxr-xr-x 5 andy andy 4096 Sep 12 20:35 .
drwxr-xr-x 4 andy andy 4096 Sep 12 20:35 ..
-rw-r--r-- 1 andy andy 1145 Sep 12 20:35 CONTRIBUTING.markdown
drwxr-xr-x 2 andy andy 4096 Sep 12 20:35 doc
drwxr-xr-x 8 andy andy 4096 Sep 12 20:35 .git
-rw-r--r-- 1 andy andy   10 Sep 12 20:35 .gitignore
drwxr-xr-x 2 andy andy 4096 Sep 12 20:35 plugin
-rw-r--r-- 1 andy andy 4802 Sep 12 20:35 README.markdown
~~~

## Verdict

IMHO Vundle doesn't add too much over pathogen. It's main benefit is that
all configuration is concentrated within a single "~/.vimrc".

This would allow sharing a configuration through a Gist. But you would have to
create the initial ~/.vim by hand anyways(installing vundle, etc.). When using
pathogen for storage the initial setup is "checking out .vim; checking
out submodules" and everything is setup.

Plugin installation is more comfortable with Vunlde, it doesn't get any
easier than adding a line to your .vimrc. With pathogen you have to do a full

~~~ bash
$ git submodule add https://github.com/scrooloose/syntastic.git ~/.vim/plugin/syntastic
~~~

As I do not change plugins often this point is moot for me. A problem that
I'm seeing with current Vundle is that it doesn't allow for plugin versioning.
When you use pathogen through git submodules versioning is implicitly provided by git.

IMHO Vundle has more potential for future extensions while pathogen keeps
closer to the Unix spirit. And was written by tpope.

---
layout: post
title: "How to create a (good-looking) PDF and Kindle eBook from LaTeX"
categories: ["tech"]
date: 2019-07-29
keywords:
- latex
- generate pdf
- amazon kindle direct publish
- ebook
- mobi
---

So I held a lecture on "Web Application Security" for the FH/Technikum Wien last spring and wrote a small booklet for my students (partially because I wanted to avoid discussions during the final exam). I did volunteer for a anonymous feedback round which turned out very positive for me, the booklet was repeatatly mentioned positively. So I distilled and refined it, tried to improve its focus. As I will do the same lecture next year, I am in dire need of feedback so that I can improve it, so I went to dark places and [published it on reddit](https://www.reddit.com/r/netsec/comments/c2ymjh/free_german_lecture_notes_from_a_introduction_to/). I was suprised by the kindness of strangers, also got some suggestions from them. I [offer the book for free under a creative commons license on my website](https://special-circumstances.at/websec/), but also created a [kindle version of the book](https://amzn.to/2Ya7w2r). If you're into web security and have read the book, I'd be very happy if you leave a (hopefully positive) review of the book on Amazon. This blog post describes, how I've created both the PDF-Version as well as the Kindle-Version of the book.

For the PDF-Version, i went with the [Legrand Orange Book](https://www.latextemplates.com/template/the-legrand-orange-book) template as it is very easy on the eyes. For source-code highlighting I use the [minted](https://www.overleaf.com/learn/latex/Code_Highlighting_with_minted) package. I do like it, because it allows for easy cut-and-paste of source code snippets and I had some experience with it. The only more complex thing is, that minted needs some special invocations when using it together with [latexmk](https://mg.readthedocs.io/latexmk.html) so I created a simple shell script that builds a pdf docuemnt from main.tex:

~~~ bash
#!/bin/sh
latexmk -e '$latex=q/pdflatex %O -shell-escape %S/' main.tex
~~~

Calling this script will build the PDF-version of the document, in addition I moved all "real" content into content.tex so that I can use it from within different LaTeX templates.

Creating the mobi-File for [Amazon Kindle Direct Publishing](https://kdp.amazon.com) was not that straight-forward. More I less, I used [tex4book](https://ctan.org/pkg/tex4ebook?lang=de), had some problems with the Table-of-Content which were solved by tex4ebook's author with an additional lua script. First of all you need to [download kindlegen from Amazon](https://www.amazon.com/gp/feature.html?ie=UTF8&docId=1000765211) and install it. So, I created a new latex document:

~~~ tex
\documentclass{book}
\usepackage[T1]{fontenc}
\usepackage{lmodern}

\usepackage{xurl}

\usepackage{graphicx} % Required for including pictures
\graphicspath{{Pictures/}} % Specifies the directory where pictures are stored

\usepackage{tikz} % Required for drawing custom shapes

\usepackage[german]{babel} % English language/hyphenation

\usepackage{minted}
\ifdefined\HCode
	\setminted{
		autogobble,
		fontsize=\footnotesize,
		frame=single
	}%,bgcolor=bg}
\else
	\setminted{
		autogobble,
		breaklines,
		breakanywhere,
		fontsize=\footnotesize,
		frame=single
	}%,bgcolor=bg}
\fi
\usemintedstyle{tango}

\begin{document}
\title{Einführung Web Security}
\author{Andreas Happe}

\tableofcontents % Print the table of contents itself

\include{content}

\end{document}
~~~

I had to add some small fixes for using minted, but otherwise this is more or less business as usual. To compile it, I crated a new shell-script:

~~~ bash
#!/bin/sh
tex4ebook -s -f mobi -e build.mk4 ebook.tex
~~~

And for getting the table of content right, I used the "build.mk4" script provided by tex4book's author:

~~~ lua
local domfilter = require "make4ht-domfilter"
local filter = require "make4ht-filter"

local process = domfilter {function(dom)
  -- process table of contents and remove unnecessary white space and <br> tags
  for _, toc in ipairs(dom:query_selector(".tableofcontents")) do
    for _, child in ipairs(toc:get_children()) do
      if child:is_text() then
        -- replace all whitespace with linebreaks
        child._text = "\n"
      elseif child:is_element() then
        local name = child:get_element_name()
        -- remove <br> elements
        if name == "br" then
          child:remove_node()
        -- change spans to divs
        elseif name == "span" then
          child._name = "div"
        end
      end
    end

  end
  
return dom
end}

local cssprocess = filter(function(s)
   local s = s:gsub("sectionToc {margin%-left%:.em;}","sectionToc {margin-left:0em;}")
   return s
end)

Make:match("html$", process)
Make:match("css$", cssprocess)
~~~

And that's it. With that I was able to create the mobi-File which I then uploaded to Amazon's KDP website. You can download a [free sample of the book](https://amzn.to/2Ya7w2r) if you want to check the output.

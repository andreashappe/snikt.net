---
layout: post
tags : ["rails"]
title: Generating PDFs with wicked_pdf
description: "wicked_pdf allows generating PDFs from ruby on rails, for free!"
keywords: "wicked_pdf, PDF, ruby on rails, generating pdf, wkhtmltopdf"
comments: true
date: 2012-05-01
aliases:
  - /blog/2012/04/26/wicked-pdf

---
[Ruby on Rails](http://rubyonrails.org) is perfect for creating web applications but sometimes you just need to create some documents which can be stored or send through email. While printing is no problem with CSS not all users are able to "save/print page as pdf". The ubiquitous [Adobe PDF file format](http://en.wikipedia.org/wiki/Adobe_PDF) seems to be a perfect solution for this problem.

The common solution for this is [Prawn](http://wiki.github.com/sandal/prawn/) (also see [the RailsCast about it](http://railscasts.com/episodes/153-pdfs-with-prawn)). Alas prawn uses a custom DSL for defining and styling the document and I would rather prefer to reuse existing view partials. [princeXML](http://www.princexml.com/) seems to solve this: it transforms existing HTML/CSS into pdf. This allows to reuse existing views and partials but comes with a hefty price-tag of $3500+.

I'll investigate [wicked_pdf](http://github.com/mileszs/wicked_pdf) which takes the same approach as princeXML but comes free..

<!-- more -->

wicked_pdf uses the [wkhtmltopdf](http://code.google.com/p/wkhtmltopdf/) binary which in turn is based upon WebKit (the same engine as used in Safari and Konqueror). It works as princeXML: a HTML document is passed on to wkhtmltopdf which in turn converts it into a PDF document which then can be downloaded by the user.This allows developers to do PDFs in the right way™: define the document’s structure through a simple HTML document and theme them through CSS.

In this example I'm using wicked_pdf in combination with a rails 3.2 application (thus the need for the custom asset pipeline helpers). The needed steps are:

### Install wkhtmltopdf and the wicked_pdf gem

wkhtmltopdf will convert the HTML file into a PDF document. The gem depends on wkhtmltopdf version >= 0.9 which sadly isn't provided by Ubuntu 9.10 by default. Manual installation is easy though: download the [static compiled version](http://code.google.com/p/wkhtmltopdf/downloads/list) from the wkhtmltopdf website and place it under `/usr/local/bin`.

Ruby on Rails needs the "wicket_pdf" gem to make use of this binary, just add it to the Gemfile and use bundler.

# Install the wicked_pdf gem:

~~~ ruby
 $ echo "gem \"wicked_pdf\"" >> Gemfile
 $ bundle
~~~

## Configure wicked_pdf

Additionally a sample configuration file is needed. While the plugin provides a generate script for this I never acutally persuaded it to work with Rails 3.0. Let’s just copy it form the plugin’s directory into config/initializers.

~~~ bash
$ cp vendor/plugins/wicked_pdf/generators/wicked_pdf/templates/wicked_pdf.rb config/initializers
~~~

and alter the wkhtmltopdf path within it:

~~~ ruby
WICKED_PDF = {
	:exe_path => '/usr/local/bin/wkhtmltopdf-amd64'
}
~~~

Now we can start with the "real" application logic..

# Add pdf instructions to your controller..

In this example I’m using the offers#show action within `app/controllers/offers_controller.rb` to render a simple PDF document:

~~~ ruby 
  def show
    format.pdf do
          @example_text = "some text"
          render :pdf => "file_name",
                 :template => 'offers/show.pdf.erb',
                 :layout => 'pdf',
                 :footer => {
                    :center => "Center",
                    :left => "Left",
                    :right => "Right"
                 }
  end
~~~

The controller renders the view with a predefined footer containing some sample “center”, “left” and “right” strings, for further information about `render :pdf` options please consult wicked_pdfs github page.

#.. and create a PDF template

The view code is straightforward, but remember to fully name linked partials (i.e. `shared/address.html.erb` as otherwise partials with an ending of `.pdf.erb` would be searched). For an example see `app/views/offers/show.pdf.erb`:

~~~ erb 
<%= wicked_pdf_stylesheet_link_tag "documents" %>

<div class="document">
  ..
  <%= render :partial => 'shared/address.html.erb' %>
</div>
~~~

`wicked_pdf_stylesheet_link_tag` is a custom helper method that allows Ruby on Rails to utilize the asset pipeline, let's add it through `config/initializers/wicked_pdf_helpers.rb`:

~~~ ruby
 def wicked_pdf_stylesheet_link_tag(*sources)
    sources.collect { |source|
      asset = Rails.application.assets.find_asset("#{source}.css")

      if asset.nil?
        raise "could not find asset for #{source}.css"
      else
        "<style type='text/css'>#{asset.body}</style>"
      end
    }.join("\n").gsub(/url\(['"](.+)['"]\)(.+)/,%[url("#{wicked_pdf_image_location("\\1")}")\\2]).html_safe
  end
~~~

All generated PDF documents are styled through normal CSS files. In this example I've hardcoded the A4 page sizes. Another noteworthy hack is that I've included watermark.png directly within the CSS file. This prevents a whole field of proplems named "wicked_pdf cannot reference/find linked image files". For example we're using the following in `public/stylesheets/documents.css.scss.erb`:

~~~ scss
.document {
  height: 297mm - 23mm;
  width: 210mm -21mm;

  background-image: url(<%= asset_data_uri 'watermark.png' %>);
  background-repeat: no-repeat;
  background-position: 200px 280px;
}
~~~

We still need a reference to the newly created rendering action through a link:

~~~ ruby
link_to 'Create PDF document', invoice_path(@invoice, :format => :pdf)
~~~

Voila! When the link is clicked a pdf document will be generated and downloaded.

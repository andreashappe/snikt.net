function r(f){/in/.test(document.readyState)?setTimeout('r('+f+')',9):f()}

r(function() {
	function getToBeActiveId(h, currentScroll) {
	    let id = "";
	    for(let e of h) {
		if (e.offsetTop - 10 <= currentScroll) {
		    id = e.id;
		}
	    }
	    return id;
	}

	function findAncestor (el) {
	    let result = [];
	    while ((el = el.parentElement) && el.parentElement.tagName!="NAV") {
	       if(el.tagName == "UL") {
		   result.push(el);
	       }
	    }
	    return result;
	}

	function onScroll(){
	    const currentScroll = document.documentElement.scrollTop;
	    const id = getToBeActiveId(headers, currentScroll);
	    const todo = document.querySelector('#TableOfContents a[href="#' + id + '"]');
	    const currentActive = document.querySelectorAll('#TableOfContents a.active');

	    for(const e of currentActive) {
		if (e != todo) {
		    e.classList.remove('active');
		    for(let ee of findAncestor(e)) {
		        ee.classList.add("hide");
		    }
		}
	    };

	    if(todo && !todo.classList.contains('active')) {
		    todo.classList.add('active');
		    for(let ee of findAncestor(todo)) {
		        ee.classList.remove("hide");
		    }
	    }
	}


    	const headers = document.querySelectorAll('.article-entry h1, .article-entry h2, .article-entry h3');

	if (headers.length == 0) {
		document.querySelector('.article-sidebar').classList.add("hide");
	}



	window.addEventListener('scroll', onScroll);

	const topLevel=currentActive = document.querySelectorAll('#TableOfContents ul')
	for(ul of topLevel) {
		for(li of ul.querySelectorAll('ul')) {
		  li.classList.add("hide");
		}
	}
	document.getElementsByClassName('article-toc')[0].style.display = ''
	onScroll();
});

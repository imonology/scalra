function addScriptJs (js_file) {
	document.write('<script type="text/javascript" src="' + js_file + '"></script>');
}

// make sure jQuery is here ?
//if (!window.jQuery)
//{
//	addScriptJs("/lib/kurento_tools/jquery/dist/jquery.min.js");
//}

//addScriptJs("config.js");
addScriptJs("/lib/sockjs/sockjs.min.js");
addScriptJs("/lib/SR_REST.js");
addScriptJs("/web/config.js");
//addScriptJs("/lib/SR_Video.js");

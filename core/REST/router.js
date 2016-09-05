
/*
	A router to execute actual commands
*/

var urlParser = require('url');

var l_handlers = {};
var l_name = 'SR.REST';

l_default_page = '<html><body>hello</body></html>';

// load default webpage, if available
UTIL.readFile('../lib/default.html', function (page) {
	//LOG.warn('page is: ' + page);
	if (page) {
		l_default_page = page;
	}
});

exports.addHandler = function (handler) {
	var count = 0;
	var names = '';
	var redundent = '';
	for (key in handler) {
		if (typeof handler[key] === 'function') {
			if (l_handlers.hasOwnProperty(key)) {
				redundent += (key + ', ');
			}
			l_handlers[key] = handler[key];
			count++;
			names += (key + ', ');
		}
	}
	LOG.sys(count + ' handler(s) added: ' + names, 'SR.REST');

	// provide redundent loading warning
	if (redundent) {
		LOG.warn('redundent loading: (may be redundent loading of HTTP/HTTPS version)', 'SR.REST');
		LOG.warn(redundent, 'SR.REST');
	}
}

// TODO: check validity of requester (?) IP address restriction?
exports.route = function (req, res, JSONobj) {

	// get & process path
	var url = urlParser.parse(req.url, true);
	var pathname = url.pathname;

	// ignore favicon
	if (pathname === '/favicon.ico') {
		return;
	}

	// combine GET & POST data
	var query = url.query;

	// combine GET parameters with POST parameters (if available)
	if (Object.keys(query).length > 0) {
		if (JSONobj === undefined) {
			JSONobj = {};
		}

		for (var key in query) {
			LOG.sys(key, 'SR.REST');

			// check special _data parameter
			if (key === '_data') {
				var data = query[key];

				LOG.sys('type: ' + typeof data + ' length: ' + data.length, 'SR.REST');
				LOG.sys(data, 'SR.REST');

				data = UTIL.convertJSON(data);
				LOG.sys(typeof data, 'SR.REST');
				LOG.debug('_data=', 'SR.REST');				
				LOG.debug(data, 'SR.REST');

				JSONobj = UTIL.mixin(JSONobj, data);
			} else {
				JSONobj[key] = query[key];
			}
		}
	}

	// extract first verb in path
	var words = pathname.split("/");
	var verb = words[1];

	// show JSONobj attachments if monitor server
	if (SR.Settings.SERVER_INFO.type === 'monitor' && JSONobj) {
		LOG.sys(JSONobj, 'SR.REST');
	}

	// check if handlers exist
	if (typeof l_handlers[verb] === 'function') {
		UTIL.safeCall(l_handlers[verb], words, res, JSONobj, req);
	} else {

		// if no handlers exist, then check for defaults
		if (pathname === '/') {
			LOG.warn('no handlers, serve default page', l_name);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end(l_default_page);
		} else if (typeof l_handlers['default'] === 'function') {
			// check if default handler exists
			UTIL.safeCall(l_handlers['default'], words, res, JSONobj, req);
		} else {
			LOG.warn('no request handle for: ' + pathname, 'SR.REST');
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.end('404 Not Found: ' + pathname);
		}
	}
}

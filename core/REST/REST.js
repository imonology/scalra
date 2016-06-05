
/*
    A RESTful interface to scalra


    history:
        2012-10-25    adopted from VSS server source code


	functions:
		init(type, port, keys)
		addHandler(handler | filename)
		dispose()
		reply(res, res_obj, options, headers)
		getCookies(cookie_str)
		getCookie(cookie_str)
		

    NOTE:
        we do not yet support a fully RESTful server, which requires:
            
            1. Use HTTP methods explicitly.
                POST      (create)
                GET       (retrieve)
                PUT       (update)
                DELETE    (destroy)

            2. Be stateless.
            3. Expose directory structure-like URIs.
            4. Transfer XML, JavaScript Object Notation (JSON), or both.
        
        we can only do 3, 4 for now

    Basic Usage:
        client connects to the REST server port, and specify the following:

        GET /EVENT/some_event

        then 'some_event' will be created as a Event and send for the event
        handler to process, both parameters and returned results are passed in JSON

*/

var server   = require("./server");
var router   = require("./router");

var l_name = 'SR.REST';

var l_cookieName = exports.cookieName = 'ic.sess';

// record of server instances created, indexed by type (HTTP / HTTPS)
// used by other services that may need to bind with the HTTP or HTTPS server (sockjs, socketio,..)
exports.server = {};

// start server
exports.init = function (type, port, keys) {

	// start actual server instance, return the server created    
	var instance = server.start(type, router.route, port, keys);
	
	// keep a record
	exports.server[type] = instance;
	
    return instance;
}

exports.addHandler = function (handler) {
	
	// check if handler is a file
	// TODO: necessary or can remove this?
	if (typeof handler === 'string') {

		var filename = handler;
		
		// TODO: refactor this & make it more general? (refer/combine with SR.Listener.addHandler ?)
		// TODO: merge this with a generalized addHandler or SR.Handler module

		// produce a valid fullpath, check current directory first, then check SR's handlers directory
		var fullpath = SR.Settings.FRONTIER_PATH + SR.Settings.SLASH + filename;
		LOG.sys('checking for REST handlers locally: ' + fullpath, 'SR.REST');
		
		// check if file exists
		// TODO: better way to check? (possibly multiple directories)
		if (SR.fs.existsSync(fullpath) === false) {
			fullpath = SR.Settings.SR_PATH + SR.Settings.SLASH + 'handlers' + SR.Settings.SLASH + filename;
		
			LOG.sys('checking for REST handlers in system: ' + fullpath, 'SR.REST');
			if (SR.fs.existsSync(fullpath) === false)
				fullpath = undefined;
		}
		
		if (fullpath) {
			LOG.sys('loading REST handler [' + filename + ']', 'SR.REST');
			//SR.REST.addHandler(require(fullpath).REST_handles);
			require(fullpath);
		}
		else
			LOG.error('REST handler cannot be found on local or system path: ' + filename, 'SR.REST');
	}
	else {
		router.addHandler(handler);	
	}
}

// stop server
exports.dispose = function (type) {
    server.stop(type);
}

/*
options fields:
	origin, cookie, content_type, location
*/
// return response if exist, otherwise response might be returned
// AFTER some callback is done handling (i.e., response will be returned within the callback)

// send back response to client
exports.reply = function (res, res_obj, options, headers) {
	
	// if header is provided, it's a direct response (no processing needed), 
	if (headers) {
		LOG.warn('pass headers directly in response:', 'SR.REST');
		LOG.warn(headers, 'SR.REST');
		res.writeHead(200, headers);
		if (res_obj) {			
			if (typeof res_obj === 'object');
				res_obj = JSON.stringify(res_obj);
			
			var is_binary = UTIL.isBinary(res_obj);
			LOG.warn('is_binary: ' + is_binary, 'SR.REST');
			res.write(res_obj, (is_binary ? 'binary' : undefined));
		}
		res.end();
		return;
	}
		
	options = options || {};
	
	// check finish status of 'res' object
	// ref: http://stackoverflow.com/questions/11137648/how-do-i-capture-a-response-end-event-in-node-jsexpress
	//LOG.warn('(before) header sent: ' + res.headersSent, 'SR.REST');
	
	// HTTP redirect (todo: cleaner approach?)
	if (options.location) {
		res.writeHead(302, {'Location': options.location});
		res.end();
		//LOG.warn('(after) header sent: ' + res.headersSent, 'SR.REST');
		return;
	}
	
	// prepare response header
	var header = {};

	// NOTE: returning 'Access-Control-Allow-Credentials' is very important
	//       otherwise ajax call may not succeed (such as when client's using jQuery)
	//       more info: http://www.bennadel.com/blog/2327-Cross-Origin-Resource-Sharing-CORS-AJAX-Requests-Between-jQuery-And-Node-js.htm

	// NOTE: if testing server functions via a client-side jquery
	//       then the client needs to be located at some server (same or different)
	//       but the page cannot be loaded from local machine, as the origin will be "null"
	
	// to prevent CORS issues (but will open security vulunarability)
	// either origin is specified or we 'allow all' (security concern?)
	header['access-control-allow-origin'] = options.origin || "*";
	header['access-control-allow-credentials'] = true;
	
	// set cookie if available
	if (options.cookie) {
		
		// previous approach 
		// (NOTE: below does not allow cross cookie access between websocket and HTTP)
		//header['set-cookie'] = (l_cookieName + '=' + options.cookie);
				
		// set cookie express-style
		res.cookie(l_cookieName, options.cookie);
	}
	// store cookie parameter directly
	else if (options['set-cookie']) {
		header['set-cookie'] = options['set-cookie'];
	}

	var is_binary = false;
	
	// if this is an ajax response
	if (typeof res_obj === 'string') {

		if (options.origin) {
			LOG.sys('replying a JSON to Ajax call: ' + res_obj, 'SR.REST');
			header['content-type'] = 'application/json';
		}
		else {
			// for simple text response (just a sample)
			if (UTIL.isBinary(res_obj)) {
				LOG.sys('replying a binary string', 'SR.REST');
				is_binary = true;
			}
			else
				LOG.sys('replying a text string: ' + res_obj.substring(0, 200), 'SR.REST');
			
			// set content-type, default to 'text/plain' if not specified
			header['content-type'] = options['content_type'] || 'text/plain';
		}
	}
	else if (typeof res_obj === 'object') {

		// simple JSON response
		res_obj = JSON.stringify(res_obj);
		LOG.sys('replying a JSON: ' + res_obj, 'SR.REST');
		header['content-type'] = 'application/json';
	}

	// force utf-8 encoding (to make display chinese correctly) if not already specified
	if (header['content-type']) {
		if (header['content-type'].indexOf('charset') === -1 && header['content-type'].indexOf('image') === -1)
			header['content-type'] += '; charset=utf-8';
	}
	
	LOG.sys('replying header:', 'SR.REST');
	LOG.sys(header, 'SR.REST');
	LOG.sys('is_binary: ' + is_binary, 'SR.REST');
	
	// NOTE: it's possible res_obj is undefined when using event.done()
	if (res_obj) {
		res.writeHead(200, header);
		res.end(res_obj, is_binary ? "binary" : undefined);
	}
	else {
		res.status(404);
		res.end('Not Found');
	}
	LOG.sys('(after) header sent: ' + res.headersSent, 'SR.REST');
}

// get cookies from current request
// NOTE: we assume cookies exist at req.headers.cookie
var l_getCookies = exports.getCookies = function (cookie_str) {

	// if parameter is object, assume it's an request object and cookie exists at req.headers.cookie
	if (typeof cookie_str === 'object') {
		if (cookie_str.headers && cookie_str.headers.cookie)
			cookie_str = cookie_str.headers.cookie;
		else {
			LOG.warn('cookie object cannot be found in headers:', 'SR.REST');
			LOG.warn(cookie_str.headers, 'SR.REST');
			return {};
		}
	}
	
	// To Get a Cookie
	var cookies = {};
	(typeof cookie_str === 'string') && cookie_str.split(';').forEach(function (cookie) {
		var parts = cookie.split('=');
		cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
	});
	
	//LOG.warn('cookies:', 'SR.REST');
	//LOG.warn(cookies, 'SR.REST');

	return cookies;
}

// get scalra specific cookie
// assuming req.headers.cookie exists
exports.getCookie = function (cookie_str) {
	//LOG.warn('getCookie called with: ' + cookie_str, l_name);
	var cookies = l_getCookies(cookie_str);
	//LOG.warn('cookies:', l_name);
	//LOG.warn(cookies);
	
	var cookie = cookies[l_cookieName] || UTIL.createUUID();	
	return cookie;
}

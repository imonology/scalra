//
//  express.js
//
//	a module that supports an express HTTP server
//
//	history:
//		2015-12-26	init
//
//	note:
//		the following node modules are required for this module to function properly
//		(all are express-related)
//			express, ejs, cookie-parser
//

// module object
var l_module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

var l_name = 'Module.Express';

//-----------------------------------------
// Handlers (format checkers and event handlers)
//
//-----------------------------------------



//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

SR.Callback.onStart(function () {
	// tasks when server starts
});

SR.Callback.onStop(function () {
	// tasks when server stops
});

// when a client connects
SR.Callback.onConnect(function (conn) {
	// do some config checking & init
});

// when a client disconnects
SR.Callback.onDisconnect(function (conn) {
	// handle disconnect
});


// module init
l_module.start = function (config, onDone) {

	/*
		Web Frontend
	*/
	//var express = require(SR.Settings.FRONTIER_PATH + '/../node_modules/express');
	var express = require('express');
	var http = require('http');
		
	var app = express();
	//var cookieParser = require(SR.Settings.FRONTIER_PATH + '/../node_modules/cookie-parser')
	var cookieParser = require('cookie-parser')
	
	// set view engine & directory
	app.set('views', SR.Settings.FRONTIER_PATH + '/../views');	
	app.set('view engine', 'ejs');
	
	// set directory to serve static files
	app.use('/web', express.static(SR.Settings.FRONTIER_PATH + '/../web'));
	app.use('/lib', express.static(SR.Settings.SR_PATH + '/lib'));
	
	// need cookieParser middleware before we can do anything with cookies
	// TODO: need to input a string? such as below..
	//app.use(express.cookieParser('843751247f5ef129bcc2ed42e6ab2cba'));
	app.use(cookieParser());
	
	// set a cookie
	// ref: http://stackoverflow.com/questions/16209145/how-to-set-cookie-in-node-js-using-express-framework
	app.use(function (req, res, next) {
		
		// check if client sent cookie
		var cookie = req.cookies[SR.REST.cookieName];
		if (cookie === undefined)
		{
			// get cookie			
			cookie = SR.REST.getCookie();
			//res.cookie(SR.REST.cookieName, cookie, { maxAge: 900000, httpOnly: true });
			// NOTE: if 'httpOnly' is set then cookie won't be shared for websocket connections
			res.cookie(SR.REST.cookieName, cookie);
			LOG.sys('express: cookie created successfully: ' + cookie, l_name);
		} 
		else
		{
			// yes, cookie was already present 
			LOG.sys('express: cookie exists: ' + cookie);
		} 
		next(); // <-- important!
	});	
	
	var express_port = UTIL.getProjectPort('PORT_INC_EXPRESS');
	//LOG.warn('express port: ' + express_port, l_name);
	
	var server = http.createServer(app).listen(express_port, function() {
		LOG.warn('Express server listening on port ' + express_port, l_name);
	});

	// set up script monitor, so we may hot-load router
	//var router_path = SR.Settings.FRONTIER_PATH + '/' + (config.router || 'router.js'); 
	var router_path = SR.path.join(SR.Settings.FRONTIER_PATH, (config.router || 'router.js')); 

	var err = undefined;
	if (SR.Script.monitor('router', router_path, app) === undefined) {
		err = 'cannot load router!';
		LOG.error(err, l_name);
	}

	// process config & verify correctness here
	UTIL.safeCall(onDone, err);
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);
}

// register this module
SR.Module.add('express', l_module);

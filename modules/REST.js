//
//  REST.js
//
//	REST (HTTP) module
//
//	history:
//		2014-11-15	extract from /core/component to /modules and take init parameters
//
// module object
var l_module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

//-----------------------------------------
// Handlers (format checkers and event handlers)
//
//-----------------------------------------



//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

// when server starts
SR.Callback.onStart(function () {});

// when server starts
SR.Callback.onStop(function () {});

// when a client connects
SR.Callback.onConnect(function (conn) {
	// do some config checking & init
});

// when a client disconnects
SR.Callback.onDisconnect(function (conn) {});

// module init
l_module.start = function (config, onDone) {

	// default to HTTP
	var type = config.type || 'HTTP';

	// convert port to numerical value
	if (port && typeof port === 'string')
		port = parseInt(port);

	var REST_port = port ||
		SR.Settings.FRONTIER.getHostAddress().port +
		(type === 'HTTPS' ? SR.Settings.PORT_INC_HTTPS : SR.Settings.PORT_INC_HTTP);

	LOG.sys('init icREST...type: ' + type + ' port: ' + REST_port, 'SR.Module');

	// start REST server given type, port, keys
	var server = SR.REST.init(type, REST_port, UTIL.userSettings('keys'));

	// TODO: store it somewhere

	// set default REST handlers
	SR.REST.addHandler(SR.REST.Handler);

	UTIL.safeCall(onDone);
}

// module shutdown
l_module.stop = function (onDone) {
	UTIL.safeCall(onDone);
}

// register this module
SR.Module.add('REST', l_module);
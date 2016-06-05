//
//  DB.js
//
//	a module for DB handling
//
//	history:
//		2015-04-07 convert from component.js DB handling parts
//
// module object
var l_name = 'SR.Module';
var l_module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

// set the upper limit of the message queue's size
l_checkers.SR_SET_QUEUESIZE = {
	size: 'number'
};

l_handlers.SR_SET_QUEUESIZE = function (event) {
	event.done();
}

l_api.SR_SET_QUEUESIZE = {
	fullname: '',
	name: 'SR_SET_QUEUESIZE'
}

//-----------------------------------------
// API for internal calling
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

// do something when a user disconnects
SR.Callback.onDisconnect(function (conn) {});

// start the module
// config:
// {collections: collections, shutdown_if_fail: true}
l_module.start = function (config, onDone) {

	// do config checking & init
	LOG.sys('start DB module...', 'SR.Module');

	// add handlers
	SR.Handler.add(exports);

	SR.DB.init(config, function (result) {
		LOG.sys('DB module init done, result: ' + result, l_name);
		UTIL.safeCall(onDone, result);
	});
}

// stop / shutdown this module
l_module.stop = function (onDone) {
	LOG.sys('stop DB module...', 'SR.Module');
	SR.DB.dispose(onDone);
}

// register this module
SR.Module.add('DB', l_module);
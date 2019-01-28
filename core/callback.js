//
//  callback.js
//
//  registeration to receive system-wide callback (such as user connect/disconnect, server start/stop)
//
//  methods:
//		register(type, callback, to_front)			// add a new callback of a certain 'type' 
//		unregister(type, callback)							// remove a callback of a given 'type'
//		get(type)																// get all callbacks of a certain type
//		clear(type)															// clear all callbacks of a certain type
//		notify(type, para)											// notify call callbacks of a certain type of a parameter object
//		onConnect(func)
//		onDisconnect(func)
// 
//	relies on:
//		SR.Utility

//-----------------------------------------
// define local variables
//
//-----------------------------------------
var l_callbacks = {};
var l_isCrashing = false;
var l_crashDelay = undefined;

//-----------------------------------------
// define local function
//
//-----------------------------------------


//-----------------------------------------
// define export functions
//
//-----------------------------------------

// NOTE: the callbacks will be called in the order of registration
// currently supported types include:
//		'onConnect' 					a client has connected to this server
//		'onDisconnect'				a client disconnects from this server
//		'onStart'							server starts
//		'onStop'							server stops
//		'onCrash'							when server crashes unexpectedly or via Ctrl-C
//		'onAppUserConnect'		a user has connected to an app server
//		'onAppUserDisconnect'	a user has disconnected from an app server
//		'onAppServerStart'		an app server has started
//		'onAppServerStop'			an app server has disconnected/stopped
//		'onUpload'						when a file is uploaded
//	
// below are kept for backward compability but not recommend to use:
//		'onAppUserLogin'			a user at the app server attempts to login to authenticate
//		'onAppUserLogout'			a user at the app server attempts to logout
//		'onStatUpdate'				a stat update from app server
//

// register callback for a certain type of event
var l_register = exports.register = function (type, callback, to_front) {
	
	if (typeof callback !== 'function') {
		LOG.error('callback passed is not function of type [' + type + ']', 'SR.Callback');
		return false;
	}
	
	// check if type exists
	if (l_callbacks.hasOwnProperty(type) === false) {
		l_callbacks[type] = [];
	}
	
	// check if we store the new callback in front (for example suitable for shutdown procedure)
	if (to_front === true) {
		l_callbacks[type].unshift(callback);
	}	else {
		l_callbacks[type].push(callback);
	}

	return true;
};

// remove a callback of a given 'type'
var l_unregister = exports.unregister = function (type, callback) {
	
	if (typeof callback !== 'function') {
		LOG.error('callback passed is not function of type [' + type + ']', 'SR.Callback');
		return false;
	}
	
	// check if type exists
	if (l_callbacks.hasOwnProperty(type) === false) {
		LOG.error('callback of type [' + type + '] has not been registered', 'SR.Callback');
		return false;
	}
	
	var callbacks = l_callbacks[type];
	for (var i=0; i < callbacks.length; i++) {
		if (callbacks[i] === callback) {
			callbacks.splice(i, 1);
			return true;
		}
	}

	return false;
};

// call the callbacks registered previously, in order
// get all callbacks of a certain type
var l_get = exports.get = function (type) {
	
	// check if type exists
	if (l_callbacks.hasOwnProperty(type) === false) {
		return [];
	}

	return l_callbacks[type];
};

// clear a certain type of callbacks
var l_clear = exports.clear = function (type) {
	
	// check if type exists
	if (l_callbacks.hasOwnProperty(type) === false) {
		return false;
	}
	
	l_callbacks[type] = [];
	return true;
};

// notify a certain type of callback & pass in a parameter
// TODO: support multiple parameters
var l_notify = exports.notify = function (type, para1, para2, para3) {

	// prepare access of multiple parameters
	//var args = Array.prototype.slice.call(arguments).slice(1);
	//return_value = callback.apply(this, args.slice(1));
	
	// prevent infinite looping in onCrash
	if (type === 'onCrash') {
		if (!l_isCrashing) {
			l_isCrashing = true;
		}	else {
			LOG.warn('infinite looping in SR.Callback.onCrash, force exiting process', 'SR.Callback');
			process.exit();
		}
	}
	
	// call registered callbacks of a given type
	var callbacks = l_get(type);
	for (var i=0; i < callbacks.length; i++) {
		UTIL.safeCall(callbacks[i], para1, para2, para3);
	}
	
	// return number of calls made
	return callbacks.length;
};

// passed in:
//		conn		connection object
//
// callbacks called when a connection is made
var l_onConnect = exports.onConnect = function (callback) {
	return l_register('onConnect', callback);
};

// passed in:
//		conn		connection object
//
// callbacks called when a connection is lost
var l_onDisconnect = exports.onDisconnect = function (callback) {
	return l_register('onDisconnect', callback, true);
};

// passed in:
//		conn		connection object
//
// callbacks called when lobby server starts
var l_onStart = exports.onStart = function (callback) {
	return l_register('onStart', callback);
};

// passed in:
//		conn		connection object
//
// callbacks called when lobby server stops
var l_onStop = exports.onStop = function (callback) {
	return l_register('onStop', callback, true);
};

// passed in:
//
// callbacks called when lobby server crashes
var l_onCrash = exports.onCrash = function (callback, delay) {
	
	if (typeof delay === 'number') {
		if (!l_crashDelay || delay > l_crashDelay) {
			l_crashDelay = delay;
		}
	}

	return l_register('onCrash', callback, true);
};

// passed in:
//		account		the connected user's account
//		appID			the ID of the app server
//		onDone		notify scalra when handling is done
//
// callbacks called when a user connects to app server (often the lobby server handles this)
var l_onAppUserConnect = exports.onAppUserConnect = function (callback) {
	return l_register('onAppUserConnect', callback);
};

// passed in:
//		account		the connected user's account
//		appID			the ID of the app server
//		onDone		notify scalra when handling is done
//
// callbacks called when a user disconnects from an app server (the lobby server handles this)
var l_onAppUserDisconnect = exports.onAppUserDisconnect = function (callback) {
	return l_register('onAppUserDisconnect', callback, true);
};

// passed in:
//		app_info	info of the app server
//
// callback for App Server connection
var l_onAppServerStart = exports.onAppServerStart = function (callback) {
	return l_register('onAppServerStart', callback);
};

// passed in:
//		app_info:	info of the app server
//
// callback for AppServer disconnection
var l_onAppServerStop = exports.onAppServerStop = function (callback) {
	return l_register('onAppServerStop', callback);
};

// passed in:
//		account		login user's account
//		connID		connection id of conn
//
// callback for App Server User login/logout attempt
var l_onAppUserLogin = exports.onAppUserLogin = function (callback) {
	return l_register('onAppUserLogin', callback);
};

// passed in:
//		account		login user's account
//		connID		connection id of conn
//
// callback when App Server User logout
var l_onAppUserLogout = exports.onAppUserLogout = function (callback) {
	return l_register('onAppUserLogout', callback);
};

// passed in:
//		appID		the ID of the app server
//		stat		a statistic object
//
// callback for handling when app stat has been updated
var l_onStatUpdate = exports.onStatUpdate = function (callback) {
	return l_register('onStatUpdate', callback);
};

// passed in:
//
// callback for handling when a file is uploaded
var l_onUpload = exports.onUpload = function (callback) {
	return l_register('onUpload', callback);
};

var l_onUploadProgress = exports.onUploadProgress = function (callback) {
	return l_register('onUploadProgress', callback);
};

// quit current server process
var l_shutdown = exports.shutdown = function () {

	LOG.stack();
	console.log('shutdown called, delay for: ' + (l_crashDelay ? l_crashDelay : 0) + ' ms');
	SR.Settings.FRONTIER.dispose();
	setTimeout(function () {
		if (l_crashDelay) {
			setTimeout(function () {
				process.exit();
			}, l_crashDelay);
		}	else {
			process.exit();	
		}
	}, 2000);
};

// forward crash or Ctrl-C events to onCrash callback
// for Ctrl-C
process.on('SIGINT', function () {
	SR.Callback.notify('onCrash', 'SIGINT');
	console.log('Caught interrupt signal, calling shutdown');
	l_shutdown();
});

/*
// for exceptions
process.on('uncaughtException', function (err) {
	LOG.error(err);
	LOG.stack();
	//console.log("uncaughtException");
    SR.Callback.notify('onCrash', err);
	l_shutdown();
});
*/

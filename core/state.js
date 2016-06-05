//
//  state.js
//
// storage of global states
//
// 	2013-09-27	started
//	2015-05-09	l_memcached added
//
//	functions:
//		// global states on local machine only 
//		get(name, type)				// get a storage for some app states
//		delete(name)				// delete a state storage by name
//		list()						// list all currently stored state names
//
//		// global states on distributed machines
//		getShared(key, onDone)					// get shared states
//		setShared(key, value, onDone)			// set shared states
//		deleteShared(key, onDone)				// delete shared states
//		
//
// relies on:
//	l_memcached
//	SR.Callback


//-----------------------------------------
// define local variables
//
//-----------------------------------------

// all in-memory states
var _states = {};

// get and existing state or set new one, provided with a 'type', which can be: 'array' or 'map'
// NOTE: type default is 'map'
exports.get = function (name, type) {
	
	// return all if nothing is passed
	if (typeof name === 'undefined')
		return _states;
	
	// if it's new or empty
	if (_states.hasOwnProperty(name) === false) {
		_states[name] = (type === 'array' ? [] : {});
	}
	
	return _states[name];
}

// delete a state storage by name
exports.delete = function (name) {
	if (_states.hasOwnProperty(name) === false) {
		LOG.warn('deleted state not found [' + name + ']', 'SR.State');
		return false;
	}
				 
	delete _states[name];
	return true;
}

// print everything (debug purpose: use very carefully)
exports.print = function () {
	LOG.warn(_states, 'SR.State');
	return _states;
}

// list all currently stored state names
exports.list = function () {
	return Object.keys(_states);
}

/*
	shared states based on MemCached

*/

var Memcached = require('memcached');
var l_memcached = undefined;
var l_server = '127.0.0.1:11211';

// init connection to l_memcached server
SR.Callback.onStart(function () {
	LOG.warn('connecting to Memcached server: ' + l_server, 'SR.State');
	l_memcached = new Memcached(l_server);
	LOG.warn('memcached version: ' + (typeof l_memcached.version === 'string' ? l_memcached.version : 'memcached not init'), 'SR.State'); 
});

// dispose connection to l_memcached server
SR.Callback.onStop(function () {
	if (l_memcached)
		l_memcached.end();
	delete l_memcached;
	l_memcached = undefined;
});

// get shared states
exports.getShared = function (key, onDone) {
	if (!l_memcached)
		return UTIL.safeCall(onDone, 'memcached not init');
	
	l_memcached.get(key, function (err, data) {
		if (err) 
			return UTIL.safeCall(onDone, err);
			
		UTIL.safeCall(onDone, undefined, data);
	});
}

// set shared states
exports.setShared = function (key, value, onDone) {
	if (!l_memcached)
		return UTIL.safeCall(onDone, 'memcached not init');

	l_memcached.set(key, value, function (err) {			
		UTIL.safeCall(onDone, err); 
	});
}

// delete shared states
exports.deleteShared = function (key, onDone) {
	if (!l_memcached)
		return UTIL.safeCall(onDone, 'memcached not init');

	l_memcached.del(key, function (err) {			
		UTIL.safeCall(onDone, err); 
	});	
}

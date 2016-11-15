//
//  example_module.js
//
//	an empty module example
//
//	history:
//
// module object
var l_module = exports.module = {};

//-----------------------------------------
// API definitions
//
//-----------------------------------------

SR.API.add('EXAMPLE_API', {
	name:	'string',
	age:	'number'
}, function (args, onDone, extra) {
	LOG.warn('Name: ' + args.name);
	onDone(null, {age: args.age+1});
});


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
	// process config & verify correctness here
	UTIL.safeCall(onDone);
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}

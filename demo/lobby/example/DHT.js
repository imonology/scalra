//
//  DHT.js
//
//  testing DHT functions
//

// put collections used here
SR.DB.useCollections([]);

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------
var l_dht = undefined;

SR.DHT.init(['src.scalra.com', 'src-stage.scalra.com'], function (err, dht) {
	if (err) {
		return LOG.error(err);
	}		
	l_dht = dht;
});

l_handlers.SET_DHT = function (event) {

	var data = event.data;
	
	if (!l_dht) {
		event.done('SET_DHT', {key: event.data.key, msg: 'DHT not init'});
		return;
	}	
	
	if (data.key && data.value) {
		l_dht.set(data.key, data.value, function (result) {
			event.done('SET_DHT', {key: event.data.key, msg: 'key set result: ' + result});	
		});
	}
	else
		event.done('SET_DHT', {key: event.data.key, msg: 'no key or value provided'});
}

l_handlers.GET_DHT = function (event) {
	if (!l_dht) {
		event.done('GET_DHT', {key: event.data.key, msg: 'DHT not init'});
		return;
	}	
	
	var data = event.data;
	
	if (data.key) {
		l_dht.get(data.key, function (result) {
			event.done('GET_DHT', {key: data.key, value: result});	
		});
	}
	else
		event.done('GET_DHT', {key: event.data.key, value: undefined});
}

//
// system events
//

SR.Callback.onStart(function () {

});

SR.Callback.onStop(function () {
	
});

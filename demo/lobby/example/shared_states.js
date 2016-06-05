//
//  shared_states.js
//
//  test cases for SR.State functions
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


l_handlers.SET_SHARED = function (event) {
	var key = event.data.key || 'test_key';
	var value = event.data.value || 'test_value';
	
	SR.State.setShared(key, value, function (err) {
		if (err)
			event.done('SET_SHARED', {result: false});
		else
			event.done('SET_SHARED', {result: true, key: key, value: value});
	});
}


//
// system events
//

SR.Callback.onStart(function () {

});

SR.Callback.onStop(function () {
	
});

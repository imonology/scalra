/* cSpell:disable */
/* global SR, LOG, UTIL */
/*
//
//	load.js
//
//	a load filter for CPU or I/O intensive monitoring and holding
//
//	install:
//
//	doc:
//
//	history:
//		2016-05-13	first version
//

supported functions:
	init(type, max_load)			// set maximum load for a given type of calls
	check(type, increment)			// set increment / decrement for a given type of counter, returns whether max is exceeded

*/

// loading mapping from type of max & curr loads
var l_loading = SR.State.get('SR.Load');


//
//	args: {
//		type:	'string',	// type of I/O
//		max:	'number',	// maxiumum number of operations per second
//	}
//	onDone: {
//		err:	'string',	// error value
//		result: 'object',	// result object
//	}

// init max loading for a given type of I/O operation
exports.init = function (args, onDone) {
	l_loading[args.type] = {
		count: 0,				// how many tasks are currently for this I/O type
		max: args.max || 100	// how many concurrent tasks are maximumally allowed
	};
	UTIL.safeCall(onDone, null);
};

// check if maximum load is already reached for a given type of calls
exports.check = function (type, increment, onDone) {
	if (l_loading.hasOwnProperty(type) === false || typeof increment !== 'number') {
		UTIL.safeCall(onDone, 'type not found or increment not a number');
		return false;
	}

	if (increment > 0 && l_loading[type].count >= l_loading[type].max) {
		UTIL.safeCall(onDone, null, {result: false, msg: 'already too many loaded streams'});
		return false;
	}

	l_loading[type].count += increment;

	// safety check: should not happen
	if (l_loading[type].count < 0) {l_loading[type].count = 0;}

	UTIL.safeCall(onDone, null, {result: true});
	return true;
};








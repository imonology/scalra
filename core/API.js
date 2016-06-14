//
//  api.js
//
//	generic API interface for creating API callable on both server & client-side using the same syntax
//
//  history:
//  2016-04-14		first version
//
//	functions:
//
//	add(name, func)	add an API by 'name' that will be processed by function func (passing args and onDone) 
//

var l_name = 'SR.API';

// list of functions
var l_list = {};

// add a new API function 
var l_add = exports.add = function (name, func, checker) {

	// see if we need to re-order func & checker (both orderings are accepted)
	//LOG.warn('func type: ' + typeof func + ' checker type: ' + typeof checker);
	if (typeof func === 'object' && typeof checker === 'function') {
		var temp = checker;
		checker = func;
		func = temp;
	}
	
	if (typeof name !== 'string' || typeof func !== 'function') {
		LOG.error('[' + name +'] argument type error, please re-check function definition', l_name);
		return false;
	}
	
	// check redundency & type correctness
	if (l_list.hasOwnProperty(name)) {
		LOG.warn('API [' + name +'] already defined, replace it...', l_name);
	}

	// store the user-defined function
	l_list[name] = func;
	
	// define wrapper function
	var wrapper = function (args, onDone, extra) {
		
		// if args are not provided then we shift the parameters
		if (typeof args === 'function') {
			extra = onDone;
			onDone = args;	
			args = {};
		}
		
		//LOG.sys('wrapper args:', l_name);
		//LOG.sys(args, l_name);
		
		// make actual call to user-defined function
		UTIL.safeCall(l_list[name], args, function (err, result) {
			if (err) {
				LOG.error('[' + name + '] error:', l_name);
				LOG.error(err, l_name);
			}
			UTIL.safeCall(onDone, err, result);
		}, extra);
	};
	
	// store a new wrapper function for calling the specified API
	exports[name] = wrapper
	
	// add this function as a handler
	var handlers = {};
	handlers[name] = function (event) {
		var args = event.data;
		wrapper(args, function (err, result) {
			// check for special processing
			// TODO: cleaner way?
			if (typeof result === 'object' && typeof result.type === 'string') {
				if (result.type === 'html' && typeof result.data === 'string') {
					// return webpage
					return event.done('SR_HTML', {page: result.data});
				}
				
				// check for special SR messages
				if (result.type.startsWith('SR_')) {
					return event.done(result.type, result.data);
				}
			}
			
			// check if nothing should be returned
			if (typeof err === 'undefined' && typeof result === 'undefined') {
				event.done();
			}
			else {
				// normal processing
				event.done({err: err, result: result});
			}
			
		}, {
			// NOTE: we also pass connection & session, as extra info
			conn: event.conn,
			session: event.session
		});
	}
	var checkers = {};
	if (typeof checker === 'object' || typeof checker === 'function') {
		checkers[name] = checker;	
	}

	LOG.warn('transforming [' + name + '] as handler...', l_name);
	SR.Handler.add({handlers: handlers, 
					checkers: checkers});
	
	return true;
}



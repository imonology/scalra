//
//  api.js
//
//	generic API interface for creating API callable on both server & client-side using the same syntax
//
//  history:
//  2016-04-14		first version
//	2016-10-21		adds 'addRemote' 'remote'
//
//	functions:
//
//	add(name, func)						add an API by 'name', processed by function 'func' (takes: 'args', 'onDone') 
//	addRemote(host, hostinfo)			add a remote API endpoint. hostinfo: {IP: 'string', port: 'number'}
//	['host'](name, args, onDone)	calls a remote API by its host's name
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
	// NOTE: when this API is called as a server-side function, 
	// likely 'extra' data such as session or conn won't be provided
	exports[name] = wrapper;
	
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

	LOG.sys('transforming [' + name + '] as handler...', l_name);
	SR.Handler.add({handlers: handlers, 
					checkers: checkers});
	
	return true;
}

// add first API (allow querying of API name from client-side)
l_add('SR_API_QUERY', function (args, onDone) {
	// return a list of registered API directly
	onDone(null, Object.keys(l_list));
});

// list of remote hosts
var l_hosts = {};

l_add('addRemote', {
	name:		'string',
	host:		'object',
	secured:	'+boolean'
}, function (args, onDone) {
	
	if (l_hosts.hasOwnProperty(args.name)) {
		return onDone('remote host [' + args.name + '] already registered');	
	}
	
	l_hosts[args.name] = args.host;
	
	// add a remote host calling function
	exports[args.name] = function (name, remote_args, onRemoteDone) {
				
		// call through HTTP post request
		var url_request = (args.secured ? 'https' : 'http') + '://' + 
						l_hosts[args.name].IP + ':' + l_hosts[args.name].port + '/event/' + name;
		
		UTIL.HTTPpost(url_request, remote_args, function (err, res, res_obj) {
			if (err) {
				return UTIL.safeCall(onRemoteDone, err);
			}
			
			// return error code & result directly
			UTIL.safeCall(onRemoteDone, res_obj[SR.Tags['PARA']].err, res_obj[SR.Tags['PARA']].result);
		});
	};
	
	onDone(null);
});

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
var l_direct_list = {};

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

	// store direct calling functions (return results directly and not via callback)
	if (typeof checker === 'object' && checker['_direct'])
		l_direct_list[name] = func.toString();
	
	// store the user-defined function
	l_list[name] = func;
	
	// define post-event action
	var post_action = function (args, result, func) {
		return new SR.promise(function (resolve, reject) {
			UTIL.safeCall(func, args, result, function () {
				UTIL.safeCall(resolve);
			});
		});
	}
	
	// define wrapper function
	var wrapper = function (args, onDone, extra) {
		
		// if args are not provided then we shift the parameters
		if (typeof args === 'function') {
			extra = onDone;
			onDone = args;	
			args = {};
		}
		
		// TODO: perform argument type check (currently there's none, so internal API calls won't do type checks)
		// TODO: move checker to here
		
		// make actual call to user-defined function
		// NOTE: we also return values for direct function calls
		return UTIL.safeCall(l_list[name], args, function (err, result, unsupported_return) {
			if (err) {
				LOG.error('[' + name + '] error:', l_name);
				LOG.error(err, l_name);
			}
			
			if (unsupported_return) {
				var errmsg = 'onDone() in SR.API does not support more than one return variable, please return everything inside a result object';
				LOG.error(errmsg, l_name);
				LOG.stack();
				return UTIL.safeCall(onDone, errmsg);				
			}
			
			// perform post-event actions, if any
			if (l_afterActions.hasOwnProperty(name) === false) {
				return UTIL.safeCall(onDone, err, result);
			}
			
			var posts = l_afterActions[name];
			var promise = undefined;
			for (var i=0; i < posts.length; i++) {
				if (!promise) {
					promise = post_action(args, {err: err, result: result}, posts[i], extra);	
				} else {
					promise = promise.then(post_action(args, {err: err, result: result}, posts[i]));	
				}
			}
			
			// last action
			promise.then(new SR.promise(function (resolve, reject) {
				//LOG.warn('everything is done... call original onDone...', l_name);
				UTIL.safeCall(onDone, err, result);	
				resolve();
			}));

		}, extra);
	};
	
	// store a new wrapper function for calling the specified API
	// NOTE: when this API is called as a server-side function, 
	// 'extra' data such as session or conn won't be provided
	exports[name] = wrapper;
	
	// build checkers
	var checkers = {};
	if (typeof checker === 'object' || typeof checker === 'function') {
		checkers[name] = checker;	
	}	
	
	// add this function as a handler
	var handlers = {};
	
	// simply reject requests for _prviate API
	if (checkers[name] && checkers[name]['_private'] === true) {
		handlers[name] = function (event) {
			event.done({err: '[' + name + '] is private'});
		}
	} else {
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
	}
	
	LOG.sys('transforming [' + name + '] as handler...', l_name);
	SR.Handler.add({handlers: handlers, 
					checkers: checkers});
	
	return true;
}

// add first API (allow querying of API name from client-side)
l_add('SR_API_QUERY', function (args, onDone) {
	// return a list of registered API directly
	var list = Object.keys(l_list);
	
	// remove direct functions
	for (var i=list.length-1; i >= 0; i--) {
		if (l_direct_list.hasOwnProperty(list[i])) {
			list.splice(i, 1);
		}
	}
	onDone(null, list);
});

l_add('SR_API_QUERY_DIRECT', function (args, onDone) {
	// return a list of registered API directly
	onDone(null, l_direct_list);
});

var l_afterActions = {};

// register post-event actions
exports.after = function (name, handler) {

	// type check
	if (typeof name !== 'string' || typeof handler !== 'function') {
		LOG.error('SR.API.after parameters incorrect (need "name" and "callback function")');
		return false;
	}
	
	if (l_afterActions.hasOwnProperty(name) === false) {
		l_afterActions[name] = [];
	}
	
	// store action
	l_afterActions[name].push(handler);
	return true;
};

const SockJS = require('sockjs-client');

// list of remote hosts
var l_hosts = {};
var l_onDisconnect = {};
var l_pending = {};

//
// add a server for remote API calls
// so later we can use the following to call the remote API:
//
//		SR.API['server_name'].API_NAME()
//
l_add('_addRemote', {
	name:		'string',
	host:		'object',
	secured:	'+boolean',
	use_socket:	'+boolean',
	auto_reconnect: '+boolean',
	onDisconnect: '+function'
}, function (args, onDone) {
	if (l_hosts.hasOwnProperty(args.name)) {
		var errmsg = 'remote host [' + args.name + '] already registered';
		LOG.warn(errmsg, l_name);
		return onDone(errmsg);
		//if (args.onDisconnect) {			
		//	l_onDisconnect[args.name].push(args.onDisconnect);
		//}
		//return onDone(null);
	}
		
	l_hosts[args.name] = args.host;
	
	l_onDisconnect[args.name] = [];
	if (args.onDisconnect) {			
		l_onDisconnect[args.name].push(args.onDisconnect);
	}	
	
	if (l_pending.hasOwnProperty(args.name) === false) {
		LOG.warn('clearing & setup l_pending[' + args.name + ']...', l_name);
		l_pending[args.name] = [];
	}
	
	// add a remote host calling function
	if (args.use_socket === true) {

		// build web-socket connection
		var url = (args.secured ? 'https' : 'http') + '://' + l_hosts[args.name].IP + ':' + l_hosts[args.name].port + '/sockjs';
		var sock = undefined;
		var responseCallbacks = {};
		var pending = l_pending[args.name];

		var connectSocket = function (onConnected) {
			
			LOG.warn('connecting to [' + args.name + '] by websocket (' + l_hosts[args.name].IP + ':' + l_hosts[args.name].port + ')', l_name);
			sock = new SockJS(url);
		
			// Open the connection
			sock.onopen = function () {
				// send cookie explicitly (my serverID)
				var cookie = SR.Settings.SERVER_INFO.id;
				LOG.warn('connected to server [' + args.name + '], sockjs sends cookie:', l_name);
				LOG.warn(cookie, l_name);
				sock.send(cookie, l_name);				
				sock.is_connected = true;
				
				// send pending packets
				if (pending.length > 0) {
					LOG.warn('pending packets to send: ' + pending.length, l_name);
					LOG.warn(l_pending, l_name);					
				}
				
				for (var i=0; i < pending.length; i++) {
					sock.sendJSON(pending[i]);
				}
				pending = [];
				
				UTIL.safeCall(onConnected, null);
			}
			
			// On connection close
			sock.onclose = function (obj) {
				LOG.warn('disconnected from server [' + args.name + ']', l_name);
				// TODO: try to re-connect periodically?
				setTimeout(function () {
					SR.API.addRemote(args);
				}, 5000);

				delete sock;
				sock = undefined;
				
				// if onDone still exists, it means we're just in the process of making a new connection
				// so this attempt fails
				if (typeof onDone === 'function') {
					onDone('cannot establish websocket connection to [' + args.name + ']');
					onDone = undefined;
				}
				
				// remove remote host record
				delete l_hosts[args.name];
				
				// notify
				var list = l_onDisconnect[args.name];
				LOG.warn('notify onDisconnect callbacks: ' + list.length, l_name);
				for (var i=0; i < list.length; i++)
					UTIL.safeCall(list[i]);
			}
			
			// On receive message from server
			sock.onmessage = function (e) {
				// Get the content
				var obj = JSON.parse(e.data);
				var name = obj[SR.Tags['UPDATE']];
				
				if (responseCallbacks.hasOwnProperty(name) === false) {					
					LOG.warn('cannot find proper response handler for [' + name + ']', l_name);
					return;
				}
				
				// return error code & result directly
				UTIL.safeCall(responseCallbacks[name], obj[SR.Tags['PARA']].err, obj[SR.Tags['PARA']].result);
			}
			
			// attach customized send function
			sock.sendJSON = function (obj) {
				sock.send(JSON.stringify(obj));
			};
		}
	
		// call through websocket requests (useful for subscription-like behaviors)
		exports[args.name] = function (name, remote_args, onRemoteDone) {

			responseCallbacks[name] = onRemoteDone;
			var obj = {};
			obj[SR.Tags['EVENT']] = name;
			obj[SR.Tags['PARA']] = remote_args;
						
			// check if socket is connected
			if (sock) {
				// send packet if connection established
				if (sock.is_connected === true) {				
					sock.sendJSON(obj);
					return;
				} 
			} else {
				var msg = '[' + args.name + '] not yet connected or broken, cache packet: ' + name;
				LOG.warn(msg, l_name);
				//UTIL.safeCall(onRemoteDone, errmsg);
				// TODO: try to re-connect (periodically)	
			}
			
			// otherwise cache the packet and send when connection is made			
			pending.push(obj);
			LOG.warn(l_pending);
		};
		
		// init first socket connection
		connectSocket(function () {
			onDone(null);
			onDone = undefined;
		});
		
	} else {
				
		LOG.warn('connecting to [' + args.name + '] by HTTP (' + l_hosts[args.name].IP + ':' + l_hosts[args.name].port + ')', l_name);
		
		// call through HTTP post request	
		exports[args.name] = function (name, remote_args, onRemoteDone) {
	
			var url_request = (args.secured ? 'https' : 'http') + '://' + 
				l_hosts[args.name].IP + ':' + l_hosts[args.name].port + '/event/' + name;
			
			// POST approach
			UTIL.HTTPpost(url_request, remote_args, function (err, res, res_obj) {
				if (err) {
					return UTIL.safeCall(onRemoteDone, err);
				}
				
				// return error code & result directly
				UTIL.safeCall(onRemoteDone, res_obj[SR.Tags['PARA']].err, res_obj[SR.Tags['PARA']].result);
			});
		};

		onDone(null);		
	}
});

// dummy warpper to allow usage of 'addRemote' directly
exports['addRemote'] = exports['_addRemote'];

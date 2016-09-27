//
//  handler.js
//
//  Storage of all event handlers and how they're been processed
//
//  history:
//  2014-03-04  extracted from event_manager.js
//
//	functions:
//
//	add				add some handlers to a set under a given name
//	addByFile		add some handlers to a set under a given name
//	get				get a particular event handler set by name
//	dispatch		dispatch an event to be processed by a specific set of handlers
//

var l_name = 'SR.Handler';

var l_handlerSets = {};

// add some handlers to a set under a given name
var l_add = exports.add = function (handlers, name) {

	// set default name if not exist
	name = name || 'default';
	
	return l_get(name).load(handlers);
}

// add some handlers by filename and owner
// handler_info example:
//	  {name: 'handler', file: 'handler.js'},
//		{name: 'system',  file: 'system', owner: 'SR'},
//		{name: 'cluster', file: 'cluster.js', owner: 'SR'} 
		
// from listener.js	

// TODO: merge handler loading in SR.Script?
// TODO: cleaner way to do parameter passing and owner lookup
// NOTE: if owner or path is specified, then the handler will be reloadable by default
var l_addByFile = exports.addByFile = function (handler_info, path) {

	var filename = 		handler_info.file;
	var handler_name = 	handler_info.name || filename;
	var owner = 		handler_info.owner;
	
	// define full path to the handler file
	var fullpath = undefined;
	
	// remove ending .js
	if (handler_name.endsWith('.js') || handler_name.endsWith('.JS')) {
		handler_name = handler_name.slice(0, handler_name.length-3).replace('/', '_');
	}
	
	if (filename) {
		
		// attach '.js' if not exist
		if (filename.endsWith('.js') === false && filename.endsWith('.JS') === false)
			filename += '.js';
		
		// if owner is specified
		if (owner) {
			if (owner === 'SR' || owner === 'scalra') {
				fullpath = SR.path.join(__dirname, '..', 'handlers', filename);
			}
			else if (SR.Settings.PATH_LIB) {
				fullpath = SR.path.join(SR.Settings.PATH_LIB, owner, filename);				
			}
		}
		// otherwise we assume in same directory
		else if (path)
			fullpath = SR.path.join(path, filename);		
	}
						 
	// set up script monitor, so we may hot-load handler functions
	if (SR.Script.monitor(handler_name, fullpath) === undefined) {
		LOG.error('cannot load file: ' + fullpath, 'SR.Handler');	
		return false;
	}

	LOG.warn('load handlers [' + handler_name + '] success...', 'SR.Handler');
	var handlers = SR.Script[handler_name];
	
	// add handlers by checkers & handlers array
	l_add(handlers);
	
	return true;
}


// get a particular event handler set by name
var l_get = exports.get = function (name) {

	// set default name if not exist
	name = name || 'default';
	
	// create new set if not exists
	if (l_handlerSets.hasOwnProperty(name) === false) {
		l_handlerSets[name] = new EventHandler();
		LOG.sys('creating new handler_set: ' + name, 'SR.Handler');
	}	
	
	return l_handlerSets[name];
}

// dispatch an event to be processed by a specific set of handlers
exports.dispatch = function (event, name) {

	// set default name if not exist
	name = name || 'default';

	// find handler set
	if (l_handlerSets.hasOwnProperty(name) === false) {
		LOG.warn('no handler set by the name [' + name + ']', 'SR.Handler');
		return false;
	}	
	
	return l_handlerSets[name].dispatcher(event);
}

// set permission to use a particular event handler
exports.setGroup = function (arg/*event_name, group, type, name*/) {
	
	// set default name if not exist
	arg.name = arg.name || 'default';
	
	return l_get(name).setGroup(arg);
}

//todo: 
exports.getGroup = function (arg) {
}

// 
// a EventHandler object, for handling incoming packets, 
// given customized handlers for different event types
//
// functions:
//		getHandlerSize()
//		getHandlers()
//		load(handlers)
//		dispatcher(event)
//		addResponder(response_type, callback)
//		setGroup({event_name:event_name, group:group, type:type})

var EventHandler = function () {
	
	// format checker 
	var l_checkers = {}; 

	// event handler
	var l_handlers = {}; 

	// register response callback (event responder) for server notifications
	var l_responders = {}

	// return the number of handlers
	this.getHandlerSize = function () {
		return Object.keys(l_handlers).length;
	}

	// return all current handlers
	this.getHandlers = function () {
		return l_handlers;
	}

	// add custom handlers to this EventHandler
	this.load = function (handler_app) {
		
		if (typeof handler_app !== 'object') {
			LOG.error('nothing to load', 'SR.Handler');
			LOG.stack();
			return 0;
		}
		
		// get checker & handler
		var checkers = handler_app.checkers;
		var handlers = handler_app.handlers;

		// do check
		if (typeof handler_app.getFormatCheckers === 'function')
			checkers = handler_app.getFormatCheckers();

		if (typeof handler_app.getMessageHandlers === 'function')
			handlers = handler_app.getMessageHandlers();

		if (!checkers || !handlers) {
			LOG.warn('Checkers or handlers not found, possibly only SR.Callback used?', 'SR.Handler');
			return 0;
		}
	  
		// store checkers & handlers locally
		var num_stored = 0;
		var list = '';
		for (var h in handlers) {

			// check if format checker is available
			if (checkers.hasOwnProperty(h))
				l_checkers[h] = checkers[h];

			// store event handler
			l_handlers[h] = handlers[h];
			list += (h + ' ');
			num_stored++;
		}
		LOG.sys(list, 'SR.Handler');
		
		return num_stored;
	}
	
	// TODO: suitable to put here?
	// add custom handlers to this EventHandler
	// NOTE: return current permission settings
	this.setGroup = function (arg /*event_name, group, type*/) {
		
		// check if name exists
		if (l_checkers.hasOwnProperty(arg.event_name) === false) {
			LOG.warn('event handler [' + arg.event_name + '] does not exist, cannot modify permission', 'SR.Handler');
			return undefined;
		}
		
		LOG.warn('type: ' + arg.type, 'SR.Handler');
		
		// check over if groups exist
		var checkers = l_checkers[arg.event_name];
		var groups = (checkers.hasOwnProperty('_groups') ? l_checkers[arg.event_name]['_groups'] : []);
		var permissions = (checkers.hasOwnProperty('_permissions') ? l_checkers[arg.event_name]['_permissions'] : []);
		LOG.sys('original groups & permissions', 'SR.Handler');
		LOG.sys(groups, 'SR.Handler');
		LOG.sys(permissions, 'SR.Handler');
		
		for (var i=0; i < groups.length; i++) {
			if (groups[i] === arg.group) {
				if (arg.type === true) {
					LOG.warn('group [' + arg.group + '] already set for event [' + arg.event_name + ']', 'SR.Handler');
					return groups;
				}
				// unset flag
				else
					break;
			}
		}

		for (var i=0; i < permissions.length; i++) {
			if (permissions[i] === arg.permission) {
				if (type === true) {
					LOG.warn('permission [' + arg.permission + '] already set for event [' + arg.event_name + ']', 'SR.Handler');
					return permissions;
				}
				// unset flag
				else
					break;
			}
		}
		
		// if not found, check if this is a new group to add
		if (i === groups.length) {
			if (type === true) {
				LOG.warn('adding new group [' + group + '] to event [' + event_name + ']', 'SR.Handler');
				groups.push(group);
			}
			else {
				LOG.warn('no group setting', 'SR.Handler');
				return groups;
			}
		}
		else
			groups.splice(i, 1);

		// re-assign
		if (groups.length > 0)
			l_checkers[event_name]['_groups'] = groups;
		else
			delete l_checkers[event_name]['_groups'];
		
		LOG.warn('new groups: ', 'SR.Handler');
		LOG.warn(groups, 'SR.Handler');
		return groups;
	}	
	
	// check if an event should be forwarded to another app server for execution
	var l_checkForward = function (msgtype, event) {
	
		// we only forward for non-SR user-defined events at lobby
		if (SR.Settings.SERVER_INFO.type !== 'lobby' || msgtype.startsWith('SR'))
			return false;
		
		// check if we're lobby and same-name app servers are available
		var list = SR.AppConn.queryAppServers();
		LOG.sys('check forward for: ' + msgtype + ' app server size: ' + Object.keys(list).length, 'SR.Handler');
	
		var minload_id = undefined;
		var minload = 10000;
		
		for (var id in list) {
			var info = list[id];
			if (info.type === 'app' && info.name === SR.Settings.SERVER_INFO.name) {
				LOG.warn('found forward target [' + id + '] loading: ' + info.usercount, 'SR.Handler');
				if (info.usercount < minload) {
					minload_id = id;
					minload = info.usercount;
				}
			}
		}
			
		// an app server with minimal loading is available, relay the event
		if (minload_id) {
			SR.RPC.relayEvent(minload_id, msgtype, event);	
			return true;
		}
		
		// no need to forward, local execution
		return false;
	}

	//
	// Dispatcher for sending a particular command to its handler
	//
	//-----------------------------------------
	// NOTE: dispatcher requires the following data:
	//		 l_responders	(responders for events sent to server)
	//		 l_handlers		(handlers for events)
	//		 l_checkers		(format checkers for events)  
	
	// TODO: remove all eventtype check (leave only one)
	// NOTE: 'err' should not be received
	var eventtypes = [SR.Tags.EVENT, SR.Tags.UPDATE];
	
	this.dispatcher = function (event) {
		
		// extract message type
		for (var i=0; i < eventtypes.length; i++) {
			if (event.data.hasOwnProperty(eventtypes[i]))
				break;
		}

		// unknown event type  
		if (i == eventtypes.length) {
			var err_str = 'unknown event type. sent from: ' + event.printSource();					
			LOG.error(err_str, 'SR.Handler');
			
			// print each key in this event
			for (var k in event.data)
				LOG.error(k, 'SR.Handler');
			
			// simply ignore, this should not happen
			SR.EventManager.checkout(event, {});
			return false;
		}

		// narrow down event type
		var eventtype = eventtypes[i];
		var msgtype  = event.data[eventtype];
		event.msgtype = msgtype;

		// lookup name associated with this connection
		var conn_name = '';

		// will look up for connection name & pass in 
		if (event.conn !== undefined)
			conn_name = SR.Conn.getSessionName(event.conn);

		// log incoming message type
		// append '\n' at end to indicate message end
		// NOTE: message type is shown as 'debug' message to allow developer also to see it
		var recv_str = JSON.stringify(event.data) + '\n';
		LOG.debug(SR.Tags.RCV + msgtype + ' from ' + (conn_name ? '[' + conn_name + '] ' : '') + '(' + event.printSource() + ')\n' + recv_str + SR.Tags.END, 'SR.Handler');
		
		// record incoming size plus '\n'
		SR.Stat.add('net_in', recv_str.length + 1);
		
		// transfer cid & parameters up one level
		if (event.data.hasOwnProperty('_cid'))
			event.cid = event.data._cid;
			
		//LOG.warn('before event obj:', l_name);
		//LOG.warn(event);
		
		// NOTE: somehow the hasOwnProperty check will pass if event.data does not have the SR.Tags.PARA field
		if (event.data.hasOwnProperty(SR.Tags.PARA) === false || event.data[SR.Tags.PARA] === undefined)
			event.data = {};
		else 
			event.data = event.data[SR.Tags.PARA];
				
		//LOG.warn('after event obj:', l_name);
		//LOG.warn(event);

		// move rid (request id) into event object, if exists
		// NOTE: do not store in conn object, as different events could shae the SAME connection object 
		// for socket connections
		if (event.data.hasOwnProperty('_rid')) {
			event.rid = event.data._rid;
			delete event.data['_rid'];
		}
		
		// check if this message is a response from a previous query (often to another frontier)
		// if so, a unique client ID will be attached
		// NOTE: we assume the msgtype stored in l_responders 
		//	   will not duplicate with any msgtype in l_handlers
		if (l_responders.hasOwnProperty(msgtype) === true) {
							   
			// handle directly from callback pool
			if (event.hasOwnProperty('cid'))	
				l_handleEventResponse(msgtype, event);
			else
				LOG.error('no client id (cid) provided by a response for event [' + msgtype + ']', 'SR.Handler');
		
			// finish handling the event
			// NOTE: should not use 'event.done' as it will return something back, which may trigger new responses
			SR.EventManager.checkout(event, {});
			return;
		}

		// check if the right handler exists (for both format & content)
		if (l_handlers.hasOwnProperty(msgtype) === false) {
			var err_str = 'no handler for [' + eventtype + '] type: ' + msgtype;
			LOG.error(err_str, 'SR.Handler');

			LOG.error('existing handlers: ', 'SR.Handler');
			for (var event_name in l_handlers)
				LOG.error(event_name, 'SR.Handler');
			
			// notify error
			var obj = {};
			obj[SR.Tags['UPDATE']] = SR.Tags['RES_ERROR'];
			obj[SR.Tags['PARA']] = {msg: err_str};
			SR.EventManager.checkout(event, obj);
			return;
		}

		// check if parameter format is correct
		// NOTE: this check will allow unspecified SR.Tags.PARA to pass through
		//	   will also allow other types of parameters be passed through
		//	   assumpion here is that the handler will not process non-SR.Tags.PARA parameters	   
		//var result = true;
		var err_str = [];	

		// if checker exist, perform format check
		if (l_checkers.hasOwnProperty(msgtype) === true) {

			var checker = l_checkers[msgtype];

			if (typeof checker === 'function') {
				if (UTIL.safeCall(checker, event.data, event.session) === false) {
					err_str.push('checker function fail');	
				}
			}
			else {
				
				// it's a js object, check each parameter one by one
				for (var para in checker) {
					
					// check for group specifications
					if (para === '_groups' || para === '_permissions') {
						// check if logined user matches the group
						var groups = checker['_groups'] || [];
						var permissions = checker['_permissions'] || [];
						// see if we've a group match
						if (l_checkGroups(groups, event.session['_groups']) === false && l_checkGroups(permissions, event.session['_permissions']) === false) {
							err_str.push('group-permission denied, no group permission to access event');
							break;
						}
						continue;
					}
					
					var actual_type = (event.data[para] instanceof Array ? 'array' : typeof event.data[para]);
										
					// get an array of valid types 
					var valid_types = checker[para];
					if (valid_types instanceof Array === false) {
						valid_types = [valid_types];
					}
					
					for (var i=0; i < valid_types.length; i++) {
						var defined_type = valid_types[i];
						
						if (typeof defined_type !== 'string') {
							err_str.push('invalid type in checker: ' + defined_type);
							continue;
						}
												
						// check if the type check is optional (will check for type only if parameter is provided)
						if (defined_type.charAt(0) === '+') {

							// skip optional parameters if not available
							if (actual_type === 'undefined') {
								break;
							}
							defined_type = defined_type.substring(1);														
						}
													
						// type check is considered pass if at least one defined_type matches the actual						
						if (actual_type === defined_type) {
							break;
						}						
					}
					
					// type is considered mismatched is none of the defined types can be found
					if (i === valid_types.length) {
						err_str.push('arg [' + para + '] expects type \'' + valid_types + '\', actual: ' + actual_type);
					}
				}
			}
		}
		
		// parameter sent is incorrect
		if (err_str.length > 0) {
			if (Object.keys(event.data).length > 0) {
				err_str.push('args: ' + JSON.stringify(event.data));	
			}
			LOG.error(err_str, l_name);			
			var obj = {};
			//obj[SR.Tags['UPDATE']] = SR.Tags['RES_ERROR'];
			obj[SR.Tags['UPDATE']] = msgtype;
			obj[SR.Tags['PARA']] = {err: err_str};
			SR.EventManager.checkout(event, obj);
			return;
		}
		
		// check if we should forward to another app server for execution
		if (l_checkForward(msgtype, event) === true)
			return;

		// call event handler
		UTIL.safeCall(l_handlers[msgtype], event, conn_name);
		
		var check_eventdone = function () {

			// check if already checkout
			if (typeof event.id !== 'undefined') {
				LOG.error('event still not checkout after: ' + SR.Settings.TIMEOUT_EVENTHANDLE + ' ms', 'SR.Handler');
				SR.EventManager.dropEvent(event);
			}
		}

		// set timeout to check if event has been checked out
		var timeout_trigger = setTimeout(check_eventdone, SR.Settings.TIMEOUT_EVENTHANDLE);		
	};

	// if callback returns true then the response_type is registered, false means not registered
	this.addResponder = function (response_type, callback) {
		
		// check parameter are correct
		if (typeof response_type !== 'string' || typeof callback !== 'function')
			return undefined;
		
		// create a unique ID for future communication
		var cid = UTIL.createID();

		// if not exist, insert new array already exist, then attach into array
		if (l_responders.hasOwnProperty(response_type) === false)
			l_responders[response_type] = [];

		l_responders[response_type].push(
			{
				onResponse:  callback,
				cid: cid
			}
		);

		// return unique key to be attached to msg to identify this communication
		return cid;
	}

	//
	// private methods
	//
	
	// TODO: move to some other user management place?
	// check if groups match, return true if any from set1 matches any from set2
	var l_checkGroups = function (set1, set2) {
				
		if (set1 instanceof Array === false ||
			set2 instanceof Array === false)
			return false;
		
		// return true if at least one match is found
		for (var i=0; i < set1.length; i++) {
			for (var j=0; j < set2.length; j++) {
				if (set1[i] === set2[j]) {
                    //console.log("matched group/permission: " + set1[i]);
					return true;
                }
            }
        }
		return false;
	}

	// notify that a response to a particular event is received
	var l_handleEventResponse = function (response_type, event) {
	
		LOG.sys('handling event response [' + response_type  + ']', 'SR.Handler');
		
		// go over each registered callback function and see which one responds
		for (var i=0; i < l_responders[response_type].length; i++) {
			// find the callback with matching client id
			// call callback and see whether it has been processed
			if (l_responders[response_type][i].cid === event.cid) {
				// log incoming message type & IP/port
				LOG.sys(SR.Tags.RCV + response_type + ' from ' + event.printSource() + SR.Tags.END, 'SR.Handler');

				// make callback
				UTIL.safeCall(l_responders[response_type][i].onResponse, event);

				// then remove it
				l_responders[response_type].splice(i, 1);
				i--;
			}
		}
	}
}

/* cSpell:disable */
/* global SR, LOG, UTIL */
//
//  RPC.js
//
//  Remote Procedural Call (RPC) service between servers
//
//  history:
//  2014-03-02  extracted from app_connector (remoteAction) and
//                             app_manager_handler.js (APP_RPC event handling, renamed as SR_SYS_RPC)
//  2014-03-11  put event handler for SR_SYS_RPC here in this file (first usage in scalra core functions)
//
//	functions:
//
// 		addServer(name, info, conn)							// add a server info with its connection object
// 		removeServer(conn) 									// remove a server by its connection object
//		queryServer()										// query currently registered servers
//		registerConnector(connector)						// record default connector to use
//		call(svc_name, func_name, parameters, connector)	// make an RPC call to a remote server via a connector (app -> lobby)
//		remoteEvent(server_name, event_type, para, onDone)	// send an event to remote server for processing
//		relayEvent(server_name, event_type, event)			// relay an event (without changing event object) to a remote server for processing
//

var l_connector = undefined;
var l_localinfo = undefined;

// list of connected servers
/* example info in l_servers
	{
        "id": "0EB091F3-388D-463E-A3F5-D9F86D004C58",
        "owner": "test",
        "project": "Cluster_Test",
        "name": "lobby",
        "type": "lobby",
        "IP": "211.78.245.176",
        "port": 37220,
	     conn: 'object'
    }
*/

var l_servers = SR.State.get('SR.RPC.servers');

// callbacks to call once a event is processed remotely and returned
var l_pendingEvents = SR.State.get('SR.RPC.events');


// record default connector
exports.registerConnector = function (connector) {
	l_connector = connector;
};

// store my own server info for RPC event handling
// local_info format:
// {name: 'string', info: 'object'}
exports.registerLocal = function (local_info) {
	l_localinfo = local_info;
};

/* example info
	{
        "id": "0EB091F3-388D-463E-A3F5-D9F86D004C58",
        "owner": "test",
        "project": "Cluster_Test",
        "name": "lobby",
        "type": "lobby",
        "IP": "211.78.245.176",
        "port": 37220,
    }
*/
// add a server info with its connection object
var l_addServer = exports.addServer = function (name, info, conn) {

	// if already exists then fail
	if (l_servers.hasOwnProperty(name)) {
		LOG.error('server [' + name + '] already registered...', 'SR.RPC');
		return false;
	}

	LOG.warn('remote server [' + name + '] connected, add to pool...', 'SR.RPC');

	// NOTE: we clone a copy of the object to avoid attaching conn object to it will complicate original info
	l_servers[name] = UTIL.clone(info);
	l_servers[name].conn = conn;
	return true;
};

// remove a server by its connection object
var l_removeServer = exports.removeServer = function (conn) {
	for (var name in l_servers) {
		LOG.warn('checking [' + name + ']...', 'SR.RPC');
		//console.log(l_servers[name].conn);
		if (l_servers[name].conn.connID === conn.connID) {
			LOG.warn('remote server [' + name + '] disconnected, remove from pool...', 'SR.RPC');
			delete l_servers[name];
			return true;
		}
	}
	return false;
};

// query currently registered servers (without conn objects)
// TODO: better approach than copy everything?
var l_queryServer = exports.queryServer = function () {

	var list = {};

	// strip off conn object
	for (var id in l_servers) {
		LOG.warn(l_servers[id], 'SR.RPC');

		list[id] = {};
		for (var name in l_servers[id]) {
			if (name !== 'conn') {list[id][name] = l_servers[id][name];}
		}
	}
	return list;
};

// make an RPC call to a remote server via a connector
// NOTE: last argument in parameters is a onDone callback
exports.call = function (svc_name, func_name, parameters, connector) {

	connector = connector || l_connector;

	// convert all arguments to array
	var args = Array.prototype.slice.call(parameters);

	// check if last argument is callback
	var onDone = args[args.length-1];
	var has_callback = (typeof onDone === 'function');

	// remove last argument if it's a callback function
	if (has_callback) {args.pop();} else {onDone = undefined;}

	LOG.warn('func_name: ' + func_name + ' return by callback: ' + has_callback, 'SR.RPC');

	if (!connector || typeof connector.send !== 'function') {
		LOG.error('cannot call remote service, connector missing', 'SR.RPC');
		return false;
	}

	// send an event with an expected response type
	connector.send('SR_SYS_RPC', {grp: svc_name, func: func_name, cb: has_callback, args: args}, 'SRR_SYS_RPC',
		(event) => {

			LOG.sys('SRR_SYS_RPC received', 'SR.RPC');

			// if no callback provided, simply print out return values
			if (onDone) {UTIL.safeCall(onDone, event.data.res);} else {LOG.warn('RPC call to [' + svc_name + '.' + func_name + '] returns: ' + event.data.res, 'SR.RPC');}
		}
	);
	return true;
};

// send an event to remote server for processing
// NOTE: this works similarly as notifyLobby in SR.AppConnector
// onDone = function (type, para)
exports.remoteEvent = function (server_name, event_type, para, onDone) {

	// build custom event
	// create a new remote event with a specific done function to perform further processing

	// NOTE: we need to prepare the event object as a 'raw' event,
	// different from a 'dispatched' event processed by handlers,
	// as 'E' parameter is extracted as 'msg_type'
	para = para || {};

	LOG.warn('server_name: ' + server_name + ' build new event: ' + event_type);
	LOG.warn(para);

	var event = SR.EventManager.createEvent(event_type, para, (res_obj) => {
		LOG.sys('get remote response for event [' + event_type + ']: ', 'SR.RPC');
		LOG.sys(res_obj, 'SR.RPC');
		UTIL.safeCall(onDone, res_obj[SR.Tags.PARA]);
	}, {
		type: 'relay'
	});

	event.msg_type = event.data[SR.Tags.EVENT];
	event.data = event.data[SR.Tags.PARA];

	// TODO: relayEvent can perhaps accept more direct input? (than having to create an event object first)
	// NOTE: if server is not registered, will return false, and undefined is returned
	if (l_relayEvent(server_name, event_type, event) === false) {
		UTIL.safeCall(onDone);
	}
};

// relay an event (without changing event object) to a remote server for processing
var l_relayEvent = exports.relayEvent = function (server_name, event_type, event) {

	// first check if the event should be processed by myself (local server)
	if (l_localinfo && l_localinfo.name === server_name) {
		LOG.warn('[' + event_type + '] is a local event, process locally', 'SR.RPC');
		return false;
	}

	LOG.warn('checking: ' + server_name, 'SR.RPC');

	// if server name cannot be found immeidately, assuming it's one of the app server and try to find its ID
	if (l_servers.hasOwnProperty(server_name) === false) {

		// check if server name is an available app name
		for (var id in l_servers) {
			LOG.warn('checking appID: ' + id, 'SR.RPC');
			LOG.warn(l_servers[id].name, 'SR.RPC');

			if (l_servers[id].name === server_name) {
				server_name = id;
				break;
			}
		}
	}

	// if the server is not registered, also do not relay
	if (l_servers.hasOwnProperty(server_name) === false) {
		LOG.warn('target server [' + server_name + '] not registered, process locally', 'SR.RPC');
		return false;
	}

	LOG.sys('relay event [' + event_type + '] to server [' + server_name + ']', 'SR.RPC');

	var info = l_servers[server_name];

	// build packet to send
	var packet = {
		type: event_type,
		data: event.data,
		id: UTIL.createID(),
		host: event.conn.host,
		port: event.conn.port,
		cookie: event.conn.cookie
	};

	// store callback when event processing result is returned
	l_pendingEvents[packet.id] = event;

	// send away the event to remote server for processing
	SR.EventManager.send('SR_SYS_RPC_EVENT', packet, [info.conn]);

	return true;
};

//
//	event handlers
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
// a pool for all message handlers
var l_checkers = exports.checkers = {};

// RPC handling from other servers
l_checkers.SR_SYS_RPC = {};

l_handlers.SR_SYS_RPC = function (event) {

	var group = event.data.grp;
	var func = event.data.func;
	var args = event.data.args;
	var has_callback = event.data.cb;

	// define what to return
	var onDone = function (result) {

		var return_obj = {func: func, res: result};
		event.done('SRR_SYS_RPC', return_obj);
	};

	// check if we need to add onDone to arguments
	if (has_callback) {args.push(onDone);}

	// execute function
	// check if it's SR functions
	if (group.startsWith('SR.')) {
		group = group.substring(3);
		LOG.warn('group: ' + group, 'SR.RPC');
		SR[group][func].apply(this, args);
	} else {

		if (global.hasOwnProperty(group) === false) {
			var msg = 'no handler by name [' + group + '] found';
			LOG.warn(msg, 'SR.RPC');
			return onDone(msg);
		}

		// NOTE: this could be a dangerous operation (potential security issues)
		try {
			// make calls to the specified function
			var result = global[group][func].apply(this, args);
			// see if need to actively return
			if (has_callback === false) {onDone(result);}
		} catch(e) {
			LOG.error(e, 'SR.RPC');
			onDone(e);
		}
	}
};


var l_serial_checker = undefined;

// TODO: cleaner appraoch for serial checks?
exports.registerSerialChecker = function (checker) {
	if (typeof checker === 'function') {l_serial_checker = checker;} else {LOG.error('checker is not a valid function', 'SR.RPC');}
};

// process a registeration request of the local server
l_checkers.SR_REGISTER_SERVER = {
	name:   'string',
	info:   'object'
};

l_handlers.SR_REGISTER_SERVER = function (event) {
	LOG.warn('SR_REGISTER_SERVER called', 'SR.RPC');
	LOG.warn(event.data, 'SR.RPC');

	// check reg code
	var result = true;

	if (l_serial_checker) {
		if (l_serial_checker(event.data.serial)) {
			LOG.warn('serial registeration success: ' + event.data.serial, 'SR.RPC');
			l_addServer(event.data.name, event.data, event.conn);
		} else {
			result = false;
			LOG.warn('serial registeration failed: ' + event.data.serial, 'SR.RPC');
		}
	}

	event.done('SR_REGISTER_SERVER_R', {name: event.data.name, result: result});
};

// process relayEvent requests
l_checkers.SR_SYS_RPC_EVENT = {
	type:   'string',
	data:   'object',
	id:		'number',
	host:	'string',
	port:	'number'
};

l_handlers.SR_SYS_RPC_EVENT = function (event) {

	var event_type = event.data.type;
	var para = event.data.data;

	LOG.sys('SR_SYS_RPC_EVENT called, event_type: ' + event_type + ' para: ', 'SR.RPC');
	LOG.sys(para, 'SR.RPC');

	// create a new event with a specific done function to return results
	var relayed_event = SR.EventManager.createEvent(event_type, para, (res_obj) => {
		event.done('SRR_SYS_RPC_EVENT', {type: res_obj.U, data: res_obj.P, id: event.data.id});
	},
	{	// NOTE: we pass in the host/port/cookie of the original client
		host: event.data.host,
		port: event.data.port,
		type: 'relay',
		cookie: event.data.cookie
	});

	// process event using dispatcher, and return results
	SR.Handler.dispatch(relayed_event);
};

// process relayEvent responses
l_checkers.SRR_SYS_RPC_EVENT = {
	type:   'string',
	data:   'object',
	id:		'number'
};

l_handlers.SRR_SYS_RPC_EVENT = function (event) {
	LOG.warn('SRR_SYS_RPC_EVENT called', 'SR.RPC');

	// no need to return anything
	event.done();

	var result = event.data;

	if (l_pendingEvents.hasOwnProperty(result.id) === false) {
		LOG.error('received response to an event with unknown id: ' + result.id, 'SR.RPC');
		return;
	}

	LOG.warn('got response for relayed event, packet id: ' + result.id, 'SR.RPC');
	var pending_event = l_pendingEvents[result.id];

	// deliver the response to the event to the original event handler
	pending_event.done(result.type, result.data);
	delete l_pendingEvents[result.id];

	// TODO: record how long it took for the remote event to finish?

	// TODO: if event takes too long to return, can we indicate there's a timeout error?
};

//
//	init / dispose actions during server start/stop or connect/disconnect
//

// register handlers when server starts
SR.Callback.onStart(() => {

	var handler_set = {
		handlers: l_handlers,
		checkers: l_checkers
	};

	// register RPC handlers for both lobby server and AppManager (if this is a lobby server)
	// NOTE: better approach than install twice?
	LOG.sys('load RPC handlers for main server...', 'SR.RPC');
	SR.Handler.add(handler_set);

	if (SR.Settings.SERVER_INFO.type === 'lobby') {
		LOG.sys('load RPC handlers for AppManager...', 'SR.RPC');
		SR.Handler.add(handler_set, 'manager');
	}
});

// remove stored local server info when socket is disconnected
SR.Callback.onDisconnect((conn) => {
	l_removeServer(conn);
});

// when app server joins
SR.Callback.onAppServerStart((info, conn) => {
	LOG.warn('adding new AppServer (id: ' + info.id + '):', 'SR.RPC');
	LOG.warn(info, 'SR.RPC');
	l_addServer(info.id, info, conn);
});

// when app server leaves
SR.Callback.onAppServerStop((info, conn) => {
	LOG.warn('AppServer stops: ' + info.id, 'SR.RPC');
	l_removeServer(conn);
});

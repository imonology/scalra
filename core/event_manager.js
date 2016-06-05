/*
//
//  event_manager.js
//
//	handles all event processing within a given frontier
//  including socket / websocket / http / https incoming events
//
	function:

		createEvent(name, para, onResponse, from);
		dropEvent
		checkin
		checkout
		send
		waitSocketsEmtpy
		unpack(data, conn, token)

event.session usage:
=====================
	// get value 取值
	event.session['abc'];			// undefined
	event.session;					// {}
	
	// set value 設值
	event.session['abc'] = 'def';	
	event.session.abc = 'def';
	event.session['abc'];			// 'def'
	event.session.abc; 				// 'def'
	event.session;					// {abc: 'def'}

	// replace value 取代值
	event.session = {
		abc: 'abc',
		def: 'def'
	};
	
	event.session['abc'];			// 'abc'
	event.session;					// {abc: 'abc', def: 'def'}

event._session usage:
===================
	// 取值
	event._session('abc'); 		// null
	event._session(); 			// null

	// 設值
	event._session('abc', 'def');
	event._session('abc'); 		// def
	event._session(); 			// { "abc": "def" }

	// 取代值
	event._session({
		abc: 'abc',
		def: 'abc'
	});
	
	event._session('abc'); 		// abc
	event._session(); 			// { "abc": "abc", "def": "abc" }

*/

//
// todo 所有 event 記錄從 checkin 到 checkout 所花費的時間, 依收到的 command 歸類分析

// todo event emitter, retry times 過多時, 把正在 processing event 從 l_eventPool 移至 deadeventpool, 禁止其 checkout, (禁此相關運作 : 尚無法實作)
// (lobby dispatcher 的 function 在 vm 上執行, checkout 時才把實際變動資料)
//

var l_name = 'SR.EventManager';

//-----------------------------------------
// define local variables
//
//-----------------------------------------
// # of messages pending to be sent
var l_pendingMessageLimit = 1000;

// only one event can be executed among different sockets
var l_eventPool = {};

//-----------------------------------------
// define local function
//
//-----------------------------------------

// number of maximum events for a socket concurrently
// NOTE: limit may reach when server is sending a lot of data between them
// for example, when shutting down a game server
// so queue size cannot be too small
var l_queuedEventsPerSocket = 100;

// function to store a event pending to send
var l_queueEvent = function (event) {

	// if event is not from socket, no need to queue
	// TODO: remove connection-specific code from here
	if (event.conn.type !== 'socket')
		return true;

	var socket = event.conn.connector;

	// if no mechanism to store (such as from a bot), just ignore
	// TODO: this is not clean
	if (typeof socket.queuedEvents === 'undefined')
		socket.queuedEvents = {};

	var queue_size = Object.keys(socket.queuedEvents).length;
	if (queue_size > l_queuedEventsPerSocket) {

		LOG.warn('queued event size: ' + queue_size + ' limit exceeded (' + l_queuedEventsPerSocket + ')', 'SR.EventManager');

		// DEBUG purpose (print out events queued)
		for (var i in socket.queuedEvents)
			LOG.sys('queuedEvents[' + i + '] =' + UTIL.stringify(socket.queuedEvents[i].data), 'SR.EventManager');

		return false;
	}

	// store event with the ID to socket's eventlist
	socket.queuedEvents[event.id] = event;

	return true;
};

// opposite of queueEvent
var l_unqueueEvent = function (event) {

	// check if connection object exists
	if (typeof event.conn === 'undefined') {
		LOG.error('no connection records, cannot respond to request', 'SR.EventManager');
		return false;
	}

	// if no mechanism to store (such as from a bot), just ignore
	// TODO: cleaner approach?
	if (event.conn.type !== 'socket' ||
    	event.conn.connector.queuedEvents === undefined) {
		return true;
	}

	var socket = event.conn.connector;

	// check if id exist
	if (socket.queuedEvents.hasOwnProperty(event.id) === false) {
		LOG.error('event not found. id = ' + event.id, 'SR.EventManager');
		LOG.stack();
		return false;
	}

	// remove current event from the socket's event queues
	delete socket.queuedEvents[event.id];

	return true;
};

/*
	from: {
		host: 'string',
		port: 'number',
		type: 'string',		// 'HTTP' 'HTTPS' 'relay'
		cookie: 'string',	// client cookie
		pid: 'string'		// polling id
	}
*/
// build an event to process
exports.createEvent = function (name, para, onResponse, from) {
	
	var conn = SR.Conn.createConnObject(from.type, onResponse, from);	
	var data = {};
	data[SR.Tags.EVENT] = name;
	data[SR.Tags.PARA] = para;	
	
	return l_unpack(data, conn, from.cookie);
}

// force checkout on a given event
var l_dropEvent = exports.dropEvent = function (event) {

	LOG.error('dropping event [' + event.msgtype + '] (' + event.id + ')', 'SR.EventManager');
	LOG.error('=== Please check if the event did not call event.done() correctly ===', 'SR.EventManager');

	LOG.error('event data: ', 'SR.EventManager');
	LOG.error(event.data, 'SR.EventManager');

	// drop first event
	l_checkout(event, {});
}

// setup default dispatcher
var l_dispatcher = SR.Handler.get().dispatcher;

//-----------------------------------------
// store a event to be processed by dispatcher
// will also check if the socket can still handle so many events
exports.checkin = function (event, dispatcher) {

	// check if dispatcher exists
	// NOTE: better way to pass / handle this?
	dispatcher = dispatcher || l_dispatcher;

	// if we've checked in before
	if (event.checkin === true) {
		LOG.error('event already checkin', 'SR.EventManager');
		return false;
	}

	// if socket is available, then store to socket current event & check if exceed limit
	// refuse checkin if this socket has too many queued events
	if (l_queueEvent(event) === false)
 		return false;

	// in process of executing event
	event.checkin = true;

	var msgsize = Object.keys(l_eventPool).length;
	if (msgsize > 0 && msgsize % l_pendingMessageLimit === 0)
 		LOG.warn('eventPool size: ' + msgsize + ' exceeds limit: ' + l_pendingMessageLimit, 'SR.EventManager');

	// emit the event
	// process event regardless of whether there are pending events not yet done
	// (otherwise we'll need to wait)
	l_eventPool[event.id] = event;

	// process event via dispatcher
	dispatcher(event);

	return true;
};

//-----------------------------------------
// execute checkout and return checkout obj (if exist) to client
var l_checkout = exports.checkout = function (event, res_obj) {

	// if this event should be returned by socket, but socket does not queue this event
	if (l_unqueueEvent(event) === false)
		return;

	// remove this event from pool to be processed
	delete l_eventPool[event.id];

	// mark event as done by removing its id
	// NOTE: unqueueEvent may still need event.id
	delete event.id;

	//
	// send response to requester (socket or RESTful)
	//

	// TODO: check if response's format is legal
	l_send(res_obj, undefined, [event.conn], event.cid);
};

//-----------------------------------------
// send message to an array of connections
var l_send = exports.send = function (packet_type, para, connections, cid) {

	// convert a single destination into an array
	if (typeof connections === 'string')
		connections = [connections];
	
	// check if target connections are valid
	if (connections instanceof Array === false) {
		LOG.error('connections undefined or is not an array, drop message', 'SR.EventManager');
		LOG.stack();
		return false;
	}
	
	if (connections.length === 0) {
    	LOG.sys('connection list is empty, drop message', 'SR.EventManager');
		return false;
	}

	// check if packet to send if valid
	// TODO: currently we support two formats:
	//		1) sending an object directly,
	//      2) 'packet_type' + 'para'..
	//       this is because checkout currently does not accept 'packet_type' + 'para' format
	//       but should modify it if possible...

	var res_obj = {};
	if (typeof packet_type === 'string') {

		// default to empty parameter
		para = para || {};
		res_obj = SR._kit.update(packet_type, para);
	} 
	else if (typeof packet_type === 'object') {
		res_obj = packet_type;
	}
	else {
		LOG.error('packet type is undefined or incorrect format, drop message', 'SR.EventManager');
		return false;
	}
	
	// if nothing to be sent back to client, stop now
	if (Object.keys(res_obj).length === 0) {

		// need to go over all connections as HTTP requests still need to be terminated
		for (var i = 0; i < connections.length; ++i) {
			// NOTE: make sure empty paremters indicate a 'no-send' for types besides 'HTTP'
			if (typeof connections[i].connector === 'function') {
				connections[i].connector();
			}
			else {
				LOG.warn('connector missing or not a function', 'SR.EventManager');
				LOG.warn(connections[i], 'SR.EventManager');
				LOG.stack();
			}
		}

		return false;
	}
	
	// show if we're sending to more than one client
	if (connections.length > 1)
		LOG.sys(SR.Tags.SND + 'send to '+ connections.length + ' clients' + SR.Tags.END, 'SR.EventManager');
	
	// attach client defined id if exist (sent by the client in the event)
	// NOTE: client event ID (cid) is a requester-generated unique ID
	// returned by the server processing the request, to identify the message
	// TODO: combine with SR.RPC mechanism?	
	if (cid) {
		res_obj._cid = cid;
	}

	// serialize object to a string (to send over socket or HTTP)
	// NOTE: we serialize here so this only needs to be done once for possibly 
	// different connection types
	// NOTE: object may fail to serialize due to circular structure
	var data = UTIL.stringify(res_obj);
	if (!data) {
		LOG.stack();
		return false;		
	}

	// print message to send (partial up to 250 characters, adjustable in LENGTH_OUTMSG setting)
	// NOTE: this is a 'debug' level message so developer can also see it
	// avoid sending streaming data (skip it) 
	// TODO: a better approach
	if (SR.Settings.HIDDEN_EVENT_TYPES.hasOwnProperty(res_obj[SR.Tags.UPDATE]) === false)
		LOG.debug(SR.Tags.SND + data.length + ' ' + data.substring(0, SR.Settings.LENGTH_OUTMSG) + SR.Tags.END, 'SR.EventManager');		
	//else
	//	LOG.debug(SR.Tags.SND + data.length + ' ' + res_obj[SR.Tags.UPDATE] + SR.Tags.END, 'SR.EventManager');
	
				
	// number of messages dropped due to invalid connection
	var droppedMessage = 0;

	// go through each connection and send
	for (var i = 0; i < connections.length; ++i) {

		// get current connection
		var conn = connections[i];
		
		// check if this is a connID, translate to a connection object
		if (typeof conn === 'string')
			conn = SR.Conn.getConnObject(conn);

		if (typeof conn === 'undefined') {
			LOG.error('connection object is invalid, cannot send', 'SR.EventManager');
			continue;
		}
		
		// check if it's purely a socket (should not happen)
		if (typeof conn.connector === 'undefined') {
			LOG.error('connector not found', 'SR.EventManager');
			LOG.error(conn);
			continue;
		}
					
		// record size
		SR.Stat.add('net_out', data.length);

		LOG.sys('sending [' + conn.type + '] message...', 'SR.EventManager');		
				
		// NOTE: both object (res_obj) and string (data) formats are passed for flexibility			
		// NOTE: conn object is also passed because right now conn.pid (polling id) may be used by http response
		if (conn.connector(res_obj, data, conn) === false)
			droppedMessage++;
	
	} // for connection array

	// print out dropped message
	if (droppedMessage > 0)
		LOG.error(droppedMessage + ' messages dropped.', 'SR.EventManager');

	return true;
}

//-----------------------------------------
// TODO: move this to socket-specific processing
// used in conn.js
var l_waitSocketsEmptyPool = new SR.AdvQueue();

// wait for all events be done for a given socket
exports.waitSocketsEmpty = function (socket, onDone) {

	if (socket.hasOwnProperty('queuedEvents') === false) {
		LOG.sys('socket does not have queuedEvents', 'SR.EventManager');
		return UTIL.safeCall(onDone);
	}

	l_waitSocketsEmptyPool.enqueue(
		{
			socket: socket,
			onComplete: onDone
		},
		function (item) {
			// if conn still has pending item, re-queue and keep waiting
			if (Object.keys(item.socket.queuedEvents).length > 0)
        		return false;

			UTIL.safeCall(item.onComplete);
			return true;
		}
	);
}

//
// a Event object, for each incoming packet/request,
// we turn it into a Event (with 'socket' and 'data') awaiting processing
// by Event handlers
//
function Event (data, conn, token) {

	// internal id
	this.id = UTIL.createUUID();

	// store connection object
	this.conn = conn;
	
	// incoming data
	this.data = data;

	// flags to indicate current status of Event
	this.checkin = false;

	// create session token and create/load session values
	// NOTE: do not use 'port' as part of token generation, as port can change during repeated HTTP requests
	// NOTE: if 'conn.host' is used, for some clients, their IP might change from request to request (due to load balancer)
	// then session will break
	//this.conn.session_token = new Buffer(token + conn.host).toString('base64').substring(0,150);	
	// TODO: review potential security vulunarabilility here
	token = token || '';
	this.conn.session_token = new Buffer(token).toString('base64').substring(0,150);
	
	// need to de-allocate the sessions when no longer used
 	this.session = SR.State.get(this.conn.session_token);
	
	// record client id (if available)
	// NOTE: this id will be sent back as a '_cid' attribute in the response for this event
	//         when the event is checkout, this is to ensure that
	//         there's a unique response to each unqiue event
	// TODO: simplify this? combine with forwardEvent in SR.RPC?

	if (data.hasOwnProperty('_cid'))
 		this.cid = data._cid;
}

// attach convenience functions
Event.prototype.done = function (packet_type, para, connections) {

	// build response packet, if exist
	var response = {};
	
	if (packet_type !== undefined) {
			
		// auto fill-in name if not provided
		if (typeof packet_type === 'object') { 
			para = packet_type;
			packet_type = this.msgtype;
		}
		
		// check if we should return back rid (request id) to allow requesting client to handle response uniquely
		if (this.rid) {

			// NOTE: if para is not JSON object (such as string or array), rid won't be attachable
			if (para instanceof Array || typeof para === 'string') {
				LOG.error('[' + packet_type + '] return value is not JSON object (array or string), please return JSON objects to avoid potential client-side callback sequence misordering', l_name);
			} else {
				para['_rid'] = this.rid;
			}
		}
		
		response = SR._kit.update(packet_type, para);
	}

  	// perform checkout first
	//LOG.warn('checking out response:');
	//LOG.warn(response);
	
	SR.EventManager.checkout(this, response);

	// send packet to other client(s) if connections are provided	
	if (typeof connections !== 'undefined')
		this.send(packet_type, para, connections, false);
}

// respond to a specific packet, or a number of other connections (if provided)
// NOTE: default to not sending to self
Event.prototype.send = function (packet_type, para, connections, to_self) {

	var send_self = (typeof to_self === 'undefined' ? true : to_self);

	// check if sockets are specified (if not, default is this event's socket)
	if (typeof connections === 'undefined' || connections instanceof Array === false) {
		connections = [];
	}
	else {
		// check if list of sockets has self
		for (var i=0; i < connections.length; i++) {
			if (connections[i].connID == this.conn.connID) {
				send_self = false;
				break;
			}
		}
	}

	if (send_self === true) {
		LOG.sys('send to self true, adding self...', 'SR.EventManager');
		connections.push(this.conn);
	}

	SR.EventManager.send(packet_type, para, connections);
}

// print the source of the request for this event
Event.prototype.printSource = function () {
	var src = this.conn.host + ':' + this.conn.port + ' ' + this.conn.type;
	return src;
}


// session
var l_sessionPool = {};
Event.prototype._session = function (query, data) {
	
	var token = this.session_token;
	
	// store directly
	if (typeof query === 'object') {
		// total replacement
		//l_sessionPool[token] = query;
		
		// incrementally add new keys
		for (key in query)
			l_sessionPool[token][key] = query[key];
	}
	// store a key-value in string
	else if (typeof query === 'string' && typeof data !== 'undefined') {
		if (!l_sessionPool[token]) {
			l_sessionPool[token] = {};
		}

		l_sessionPool[token][query] = data;
	} 
	// get 
	else if (typeof query === 'string' && typeof data === 'undefined') {
		if (l_sessionPool[token] && l_sessionPool[token][query]) {
			return l_sessionPool[token][query];
		} 
		else {
			return null;
		}
	} 
	// return all
	else if (typeof query === 'undefined' && typeof data === 'undefined') {
		if (l_sessionPool[token]) {
			return l_sessionPool[token];
		} 
		else {
			return null;
    	}
	}
}

//-----------------------------------------
// build an event from a general event and connection object
var l_unpack = exports.unpack = function (data, conn, token) {

	return new Event(data, conn, token);
}

exports.list = function (arg) {
	console.log("l_eventPool");
	console.log(l_eventPool);
	return true;
}

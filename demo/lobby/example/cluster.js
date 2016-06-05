// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};


l_handlers.TEST_CLUSTER = function (event) {
    
	// print some message
	LOG.debug('TEST_CLUSTER has been called');
	LOG.warn(event);
	if (!event.data.age) {
		LOG.error('no age sent to TEST_EVENT!', 'lobby');	
	}
	
	reset_counter++;
	l_states['counter']++;
	
	var age = event.data.age ? parseInt(event.data.age) : 0;
	age = age + 2;
	
	// send back response
	event.done('TEST_CLUSTER', {server: SR.Settings.SERVER_INFO, name: event.data.name, age: age, 中文: 'Chinese 也通!', reset_counter: reset_counter, persist_counter: l_states['counter']});
}


// test app event
l_checkers.QUERY_APP = {

};

l_handlers.QUERY_APP = function (event) {
    
	// print some message
	LOG.debug('QUERY_APP called');
	LOG.warn(event.data);
	
	result = SR.AppConn.queryAppServers(event.data.name);
	
	LOG.warn('queryapp: ');
	LOG.warn(result);
		
	// send back response
	event.done('QUERY_APP_REPLY', result);	
	// do something..
}

// perform an event at an app server
l_handlers.APP_EVENT = function (event) {
    
	// print some message
	LOG.debug('APP_EVENT called');
	//LOG.warn(event.data);
	
	if (typeof event.data.server === 'undefined') {
		return event.done('APP_EVENT_REPLY', {msg: 'need to specify server name in [server]'});
	}
	
	if (typeof event.data.event === 'undefined') {
		return event.done('APP_EVENT_REPLY', {msg: 'need to specify event name in [event]'});
	}	
	
	var onResponse = function (result) {
		LOG.warn('AppEvent result:: ');
		LOG.warn(result);
		
		// send back response
		if (result) {
			event.done('APP_EVENT_REPLY', result);
		}
		else
			event.done('APP_EVENT_REPLY', {msg: 'remote server not found'});
	};
	
	var obj = SR.kit.clone(event.data);
	delete obj['server'];
	delete obj['event'];
	
	SR.RPC.remoteEvent(event.data.server, event.data.event, obj, onResponse);
	// do something..
}


// test app event
l_checkers.RELAY_EVENT = {
	server: 'string',
	event:  'string'
};


// relay event execution to app server
l_handlers.RELAY_EVENT = function (event) {
	
	LOG.warn(event, 'RELAY_EVENT');
	
	var server_name = event.data.server;
	var event_name = event.data.event;
	delete event.data['server'];
	delete event.data['event'];
	
	SR.RPC.relayEvent(server_name, event_name, event);
}

// test send message to all connections
l_checkers.SEND_CONN = {

};

l_handlers.SEND_CONN = function (event) {
	var name = event.session._account;
	LOG.warn(event);
	LOG.warn('connection name: ' + name);
	
	var list = SR.Conn.getConnections(name);
	
	event.done('SEND_CONN_R', {conn_count: list.length, who: event.data.who, msg: event.data.msg});
	
	// send message if exist
	if (event.data.who && event.data.msg)
		event.send('SR_MSG', {"channel":"main","msg":{"who": event.data.who, "msg": event.data.msg}}, list, false);
}
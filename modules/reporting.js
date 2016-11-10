
//
// Standard module stuff
//

// module object
var l_module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

var l_name = 'SR.Module.reporting';

//
// module start/stop
//

/*
	config: {
		ip_port:	'string'		// target server's IP & port to connect
	}
*/

l_module.start = function (config, onDone) {

	// do not connect if this is a monitor server
	if (SR.Settings.SERVER_INFO.type === 'monitor') {
		LOG.warn('monitor server need not initialize connection to monitor', l_name);
		return UTIL.safeCall(onDone);
	}
	
	// set IP & port for monitor server
	var ip = (SR.Settings.IP_MONITOR instanceof Array ? 
			  SR.Settings.IP_MONITOR[0] :
			  SR.Settings.IP_MONITOR);
	
	l_ip_port = config.ip_port || 
		{IP: ip,
		 port: SR.Settings.PORT_MONITOR + SR.Settings.PORT_INC_SOCKET};
	
	LOG.warn('monitor to connect:', l_name);
	LOG.warn(l_ip_port, l_name);
	
	l_connect(function () {

		// 1st time reporting
		l_report({
			type:		'ServerStatus',
			status:		{
				server: SR.Settings.SERVER_INFO,
				admin:  UTIL.userSettings('adminMail'),
				ports:  UTIL.getLocalPort()
			}
		});
		
		// subscribe for shutdown message
		l_connector.send('_MONITOR_ALERT', {
			id:	 SR.Settings.SERVER_INFO.id
		}, '_MONITOR_ALERT', function (res) {
			LOG.warn('monitor alert received:');
			LOG.warn(res);
			if (res.type === 'SHUTDOWN') {
				LOG.warn('received self shutdown request');
				SR.Settings.FRONTIER.dispose();		
			}
		});			

		// add monitor as a remote API endpoint		
		SR.API.addRemote({name: 'monitor', host: {IP: ip, port: SR.Settings.PORT_MONITOR}});
		
		// get parameters from monitor, if available
		SR.API['monitor']('_SYS_PATH', {type: 'PATH_LIB'}, function (err, result) {
			if (!err) {
				LOG.warn('PATH_LIB: ' + result, l_name);
				SR.Settings.PATH_LIB = result;
			}
		});
		
		UTIL.safeCall(onDone);		
	});
}

// stop / shutdown this module
l_module.stop = function (onDone) {

	// shutdown reporting
	l_report({
		type:		'ServerStatus',
		status:		{
			server: SR.Settings.SERVER_INFO,
			status: 'shutdown'
		}
	})

	UTIL.safeCall(onDone);
}

// prepare content of the periodic reporting
var onReport = function () {

	// TODO: should update changing status (such as login user count)
	// currently SERVER_INFO is pretty static
	var status = {
		//server: SR.Settings.SERVER_INFO,
		server: undefined
	}
	
	return status;
}


//
//	Remote Server Management (for Monitor)
//


// server status indexed by 'serverID', each status is indexed by 'type'
var l_status = {};

// mapping from connID to serverID
var l_conn2server = {};

// receiving status report and store it, indexed by: 1) serverID 2) type
/*
	status: {
		serverID:	'string'
		type:		'string',
		data:		'object'
	}
*/
l_handlers.SR_REPORT_STATUS = function (event) {
	
	// do not respond unless I'm a monitor
	if (SR.Settings.SERVER_INFO.type !== 'monitor') {
		event.done();
		return;
	}
	
	var status = event.data;
	//LOG.warn('status received:');
	//LOG.warn(status);
	
	if (l_status.hasOwnProperty(status.serverID) === false) {
		l_status[status.serverID] = {};
		l_conn2server[event.conn.connID] = status.serverID;
	}
	if (l_status[status.serverID].hasOwnProperty(status.type) === false) {
		l_status[status.serverID][status.type] = {};
	}
		
	//LOG.warn('before update:');
	//LOG.warn(l_status);
	
	// NOTE: we only update what's new, while keeping all the other existing fields
	l_status[status.serverID][status.type] = UTIL.mixin(l_status[status.serverID][status.type], status.data);
	
	//LOG.warn('after update:');
	//LOG.warn(l_status);
	
	LOG.sys('SR_REPORT_STATUS id: ' + status.serverID + ' after update:', l_name);
	LOG.sys(l_status[status.serverID][status.type], l_name);
	
	event.done('SR_REPORT_STATUS', {id: status.serverID});
}

//
// public API
//

// get log name for a given server
//exports.getLog = function ()

// get a list of servers based on server info
// info: 'string' ||
//		 {owner: 'string', project: 'string', name: 'string'}
exports.getStat = function (info, onDone) {
	var query_name = undefined;
	var query_id = undefined;
	
	if (typeof info === 'object') {
		query_name = (info.owner ? info.owner : '') + 
			(info.project ? ('-' + info.project) : '') +
			(info.name ? ('-' + info.name) : '');
	}
	else if (typeof info === 'string')
		query_id = info;
	
	LOG.sys('query_name [' + query_name + '] query_id: [' + query_id + ']', l_name);
	
	var list = [];

	for (var id in l_status) {
		if (!l_status[id]) {
			LOG.error('no server info found for id: ' + id);
			continue;
		}
		
		var servers = l_status[id];
		for (var type in servers) {

			var server = servers[type].server;
			var server_name = server.owner + '-' + server.project + '-' + server.name;
			LOG.warn('[' + id + '] type: ' + type + ' server name: ' + server_name, l_name);
			
			if ((query_id && id === query_id) ||
				 server_name.startsWith(query_name)) {
				LOG.sys('match found: ' + server_name, l_name);
				list.push(server);
			}		
		}
		
	}
	LOG.sys('returning ' + list.length + ' server info', l_name);

	UTIL.safeCall(onDone, list);	
	return list;
}


//
// connection management
//

// when a server disconnects, remove related records
SR.Callback.onDisconnect(function (conn) {
	
	// check if connection belongs to a server in contact
	if (l_conn2server.hasOwnProperty(conn.connID) === false)
		return;
		
	var serverID = l_conn2server[conn.connID];
	
	LOG.warn('server [' + serverID + '] disconnected', l_name);
	delete l_status[serverID];
	
	// TODO: send out system-wide notify?
});


//
//	Connection Management (to Monitor)
//
const l_timeoutConnectRetry = 3000;
var l_connector = undefined;
var l_ip_port = undefined;
var l_onConnect = undefined;		// what to do after first connect

var l_config = {
	onConnect: function () {
		LOG.warn('Monitor Server connected', l_name);
	},
	onDisconnect: function () {
		LOG.warn('Monitor Server disconnected'); 
		// re-init connection
		LOG.warn('attempt to re-connect in: ' + l_timeoutConnectRetry + 'ms', l_name);
		setTimeout(l_connect, l_timeoutConnectRetry);
	}
};

// connect to remote server
var l_connect = function (onDone) {

	// store what to do after connected
	// NOTE: may be called repeatedly (if initial attempts fail or disconnect happens)
	if (typeof onDone === 'function')
		l_onConnect = onDone;

	if (l_ip_port === undefined) {
		LOG.warn('not init (or already disposed), cannot connect to server');
		return;
	}

	if (l_connector === undefined)    
		l_connector = new SR.Connector(l_config);

    // establish connection
	LOG.warn('connecting to: ' + l_ip_port, l_name);
	l_connector.connect(l_ip_port, function (err, socket) {
		
		if (err) {
			// try-again later
			LOG.warn('attempt to re-connect in: ' + l_timeoutConnectRetry + 'ms', l_name);
			setTimeout(l_connect, l_timeoutConnectRetry);
			return;
		}

		LOG.warn('connection to: ' + socket.host + ':' + socket.port + ' established', l_name);
				
		UTIL.safeCall(l_onConnect);
	});    
}

// send report to remote server
/* 	args: {
		target: 'string', 	// 'monitor', 'app', 'lobby'
		type: 	'string',
		status: 'object' || 'function',
		interval: 'number'
	}
*/
var l_report = function (args, onDone) {
	
	// check if we've init / connected already
	if (!l_connector) {
		var err = 'connection to monitor not yet established, cannot report';
		LOG.error(err, l_name);
		return UTIL.safeCall(onDone, err);
	}
	
	var serverID = SR.Settings.SERVER_INFO.id;
	
	var send_once = function (onSent) {
		var data = (typeof args.status === 'function' ? args.status() : args.status);
		
		// send a report (including status type & sender's serverID)
		// TODO: error handling?
		l_connector.send('SR_REPORT_STATUS', {
			serverID: serverID,
			type: args.type,
			data: data
		}, 'SR_REGISTER_STATUS', function (res) {
			UTIL.safeCall(onSent);
		});	
	}
	
	// send once only
	send_once(function () {
		UTIL.safeCall(onDone, null);
	});
}

// add handlers
SR.Handler.add(exports);

// register this module
SR.Module.add('reporting', l_module);

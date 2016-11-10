//
//  frontier.js
//
//  main lobby server
//

require('scalra')('dev');

// show debug / warning / error messages
LOG.setLevel(2);
LOG.show('all');

var l_name = 'Monitor';

//-----------------------------------------
// define local variables
//
//-----------------------------------------

// a list of names for all collections to be created
var collections =  ['log'];

var config = {
    path:               __dirname,
    handlers: [
		{file: 'log.js', owner: 'SR'}
    ],
    components: [
        //SR.Component.REST('HTTP', ['REST_handle.js']),      // start a HTTP server
		//SR.Component.REST('HTTPS', ['REST_handle.js']),     // start a HTTPs server
    ],
	modules: {
		'reporting': {}
	}
};

// create frontier
var l_frontier = new SR.Frontier(config);
		
// set custom REST handlers
SR.REST.addHandler('REST_handle.js');
SR.REST.addHandler('REST_execute.js');

//
// define API
//

// API to get system paths
SR.API.add('_SYS_PATH', {
	type:	'string'
}, function (args, onDone) {
	switch (args.type) {
		case 'demo': {
			var path = SR.path.resolve(SR.Settings.SR_PATH, 'demo');
			return onDone(null, path);
		}
		default: {
			// check if the requested path exists in settings
			if (SR.Settings.hasOwnProperty(args.type)) {
				return onDone(null, SR.Settings[args.type]);	
			}
			return onDone('unknown type [' + args.type + ']');
		}
	}
});

// API to set system paths
SR.API.add('_SET_SYS_PATH', {
	type:	'string',
	path:	'string'
}, function (args, onDone) {
	
	if (SR.Settings.hasOwnProperty(args.type) === true) {
		return onDone('[' + args.type + '] already set');
	}
	SR.Settings[args.type] = args.path;
	l_buildPaths();
	onDone(null);
});

// server mapping from id -> info
var l_servers = {};

// API to subscribe for monitor alerts
SR.API.add('_MONITOR_ALERT', {
	id:	'string'
}, function (args, onDone, extra) {
	LOG.warn('server [' + args.id + '] subscribing alert:', l_name);
	LOG.warn(extra.conn, l_name);
	l_servers[args.id] = extra.conn;
	onDone(null);	
});

// remove disconnected servers from list
SR.Callback.onDisconnect(function (conn) {
	for (var id in l_servers) {
		if (l_servers[id] === conn) {
			LOG.warn('server [' + id + '] disconnected', l_name);
			delete l_servers[id];
			return;
		}
	}
});

// API to start servers
SR.API.add('_START_SERVER', {
	owner:		'string',
	project:	'string',
	name:		'string',
	size:		'+number'
}, function (args, onDone) {
		

	
});

// API to stop servers (based on serverID)
SR.API.add('_STOP_SERVER', {
	id:		'string'
}, function (args, onDone) {
	if (l_servers.hasOwnProperty(args.id) === false) {
		return onDone('server [' + args.id + '] not registered');
	}
	
	LOG.warn('sending MONITOR_ALERT to [' + args.id + ']...');

	// notify server to shutdown via previous connection
	SR.EventManager.send('_MONITOR_ALERT', {type: 'SHUTDOWN'}, [l_servers[args.id]]);
	onDone(null);
});

var l_buildPaths = function () {
	
	// (re-)build path settings
	if (SR.Settings.PATH_USERBASE) {
		SR.Settings.PATH_LIB = SR.path.join(SR.Settings.PATH_USERBASE, 'lib');	
	}	
}

// execute all the steps for running a server
l_frontier.init(function () {
		
    // callback when lobby is started
    LOG.warn('monitor started successfully', l_name);
});

//
//  frontier.js
//
//  main lobby server
//

require('scalra')('dev');

const ansi_up = require('ansi_up');				// converts console message to colorful HTML
const humanize = require('humanize');			// better human readability
const pm2 = require('pm2');

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
		'reporting': {},
		'swagger': {}
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


// list of subscribers to screen (server id -> conn object list)
var l_subscribers = {};

const spawn = require('child_process').spawn;

var l_tailOutput = function (owner, project, name, subscriber) {
	project = project.replace(/\[.*\]$/, '');
	var serverID = owner + '-' + project + '-' + name;
	
	// start tailing the project's output
	try {
		new Promise((resolve, reject) => {
			if (SR.Settings.PM2_ENABLE) {
				pm2.connect((err) => {
					if (err) {
						LOG.error(err);
						reject(err);
						return;
					}

					pm2.describe(`${owner}-${project}-${name}`, (err, data) => {
						if (err) {
							LOG.error(err);
							reject(err);
							return;
						}

						if (!data[0]) {
							LOG.error(`Cannot get pm2 info of server "${owner}-${project}-${name}"`);
							reject(`Cannot get pm2 info of server "${owner}-${project}-${name}"`);
							return;
						}

						const pmID = data[0].pm_id;
						resolve(SR.path.resolve(
							SR.Settings.PATH_USERBASE,
							owner,
							project,
							'log',
							`output-${pmID}.log`
						));
					})
				})
			} else {
				resolve(SR.path.resolve(
					SR.Settings.PATH_USERBASE,
					owner,
					project,
					'log',
					'output.log'
				));
			}
		}).then((log_file) => {
			LOG.warn('tailing [' + log_file + ']...', l_name);
			subscriber.proc = spawn('tail', ['-n', '1000', '-f', log_file]);

			var onData = function (d) {
				// NOTE: strings like '[monitor]' will get replaced as well (incorrectly)
				var logData = d.toString().replace(/\[m/g, '[');

				SR.EventManager.send('_SUBSCRIBE_LOG',
					{ err: null, result: { subID: subscriber.subID, data: logData } },
					subscriber.conns);
			}

			subscriber.proc.stdout.on('data', onData);
			subscriber.proc.stderr.on('data', onData);

			subscriber.proc.on('exit', function (code) {
				LOG.warn('screen spawn exit: ' + code, l_name);
				subscriber.proc = undefined;
				delete l_subscribers[serverID];
			});
		}).catch((err) => {
			LOG.error(err);
		});
	}
	catch (e) {
		LOG.error(e, l_name);
	}	
}

// API to subscribe for the continous output of a log file
SR.API.add('_SUBSCRIBE_LOG', {
	owner:		'string',
	project:	'string',
	name:		'string',
	subID:		'string'
}, function (args, onDone, extra) {

	var owner = args.owner;
	var project = args.project;
	var name = args.name;
	
	var serverID = owner + '-' + project + '-' + name;
	
	// check if already subscribed
	if (l_subscribers.hasOwnProperty(serverID) === false) {
		l_subscribers[serverID] = {
			proc: null,
			subID: args.subID,			
			conns: []
		}
	}
	
	var subscriber = l_subscribers[serverID];
	
	// add a new subscriber connection (only if new)
	if (subscriber.conns.indexOf(extra.conn) === (-1)) {		
		subscriber.conns.push(extra.conn);
	}
		
	// return subID to indicate subscription success	
	onDone(null, {subID: args.subID, data: 'showing screen for [' + serverID + ']...\n'});
	
	if (subscriber.proc !== null) {
		LOG.warn('screen output for [' + serverID + '] already exists, show existing tailing process', l_name);
		return;
	}
	
	// use another function to make sure 'subscriber' is still valid in callback
	l_tailOutput(owner, project, name, subscriber);
});

// API to subscribe for the continous output of a log file
SR.API.add('_UNSUBSCRIBE_LOG', {
	subID:			'string',
	connID:			'+string'
}, function (args, onDone, extra) {
	
	var connID = args.connID || extra.conn.connID;
	var subID = args.subID;
	var subscriber = undefined;
	
	for (var serverID in l_subscribers) {
		
		if (l_subscribers[serverID].subID === subID) {
			subscriber = l_subscribers[serverID];
			break;
		}
	}
	
	if (!subscriber) {
		return onDone('subID [' + args.subID + '] not found');
	}	
	
	// find & remove the connection object	
	for (var i=0; i < subscriber.conns.length; i++) {
		if (subscriber.conns[i].connID === connID) {
			
			subscriber.conns.splice(i, 1);
			
			// check if nobody's subscribing, then should remove tailing process
			if (subscriber.conns.length === 0) {
				LOG.warn('no subscriber for [' + serverID + '] screen, stop tailing...', l_name);
				subscriber.proc.kill('SIGHUP');
				delete l_subscribers[serverID];
			}
			return onDone(null);
		}
	}
	return onDone('cannot find connection to remove');
});

// remove subscription or stop tailing if nobody's interested in viewing
// TODO: should have system-mechanism for auto-unsubscribe
SR.Callback.onDisconnect(function (conn) {
	for (var serverID in l_subscribers) {
		for (var i=0; i < l_subscribers[serverID].conns.length; i++) {
			
			var c = l_subscribers[serverID].conns[i];
			if (c.connID !== conn.connID)
				continue;
			
			// remove the connection
			SR.API._UNSUBSCRIBE_LOG({
				serverID: serverID,
				connID: c.connID
			});
			
			// NOTE: we just break because it's possible the same connection (from a single icpm instance)
			// may subscribe for multiple serverID's output
			break;
		}
	}
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

// restart any existing, started servers
SR.Callback.onStart(function () {
	
	SR.startedServers = {};
	
	// determine where the log file should be
	var logfile = SR.path.resolve(SR.Settings.LOG_PATH, SR.Settings.Project.serverList);

	// start server
	if (SR.fs.existsSync(logfile) === false) {
		return;	
	}

	LOG.warn('Found previously started servers in: ' + logfile, l_name);
	
	SR.fs.readFile(logfile, 'utf8', function (err, data) {
		if (err) {
			LOG.error(err, l_name);
			return;
		} 
		if (data == '') {
			return;
		}

		try {
			var servers = JSON.parse(data);			
		} catch (e) {
			return LOG.error(e, l_name);
		}
		if (typeof servers != 'object') {
			return LOG.error('invalid started server log');
		}

		// NOTE: we don't store this list by default, as if the server is not started successfully, 
		// 		it should be removed from the list
		//SR.startedServers = servers;

		setTimeout(function () { 
			for (let serverID in servers) {
				SR.API._START_SERVER({
					owner: servers[serverID].owner, 
					project: servers[serverID].project, 
					name: servers[serverID].name,
					size: servers[serverID].size,
					onOutput: function (output) {

						// make output HTML displable
						// TODO: do this at the client to save bandwidth?
						if (SR.Settings.REFORMAT_HTML_TEXT === true)
							output.data = humanize.nl2br(ansi_up.ansi_to_html(output.data));

						// record to file
						SR.StreamManager.publish(output.id, output);
					}
				}, function (err, list) {
					if (err) {
						LOG.error(err, l_name);
						return; 
					}

					LOG.warn('execute success:', l_name);
					LOG.warn(list, l_name);
					// SR.REST.reply(res, list);
				});
			}
		}, 3000);
	});	
	
	//} else {
	//	SR.fs.writeFile(logfile, '', function(err) {
	//		if (err) {
	//			return console.log(err);
	//		}
	//		SR.startedServers = {};
	//		LOG.warn("initialize started server log: " + logfile, l_name);
	//	}); 
	//}	
})





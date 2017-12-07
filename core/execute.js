/*
//  execute.js
//
// handling all server start/stop functions & related display issues
//
// 2013-08-20	copied from app_conn.js
//
// relies on:
//   SR.AppConn

	functions:
		start(server_info, size, onDone, onOutput)			// start a certain number (size) of servers of a particular type
		stop(list, onDone)									// shutdown a given or a number of servers
		query(server_info, onDone)							// get a list of currently started/recorded servers

*/

var l_name = 'SR.Execute';

const pm2 = require('pm2');

const spawn = require('child_process').spawn;	// for starting servers

// convert raw binary to string
// ref: http://stackoverflow.com/questions/12121775/convert-buffer-to-utf8-string
var StringDecoder = require('string_decoder').StringDecoder;		
var decoder = new StringDecoder('utf8');

//-----------------------------------------
// define local variables
//
//-----------------------------------------

// load system states (to store / load currently running servers)
//var l_states = SR.State.get(SR.Settings.DB_NAME_SYSTEM);

// map for pending app server deletions
var l_pendingDelete = {};

// map for pending app server starts
var l_pendingStart = [];

// map for process ID to server info
var l_id2server = {};

// map of successfully started processes (to be associated with the app server info)
var l_started = {};


//-----------------------------------------
// define local function
//
//-----------------------------------------


//-----------------------------------------
// define external function
//
//-----------------------------------------

// start a certain number (size) of servers of a particular type
SR.API.add('_START_SERVER', {
	owner:		'+string',
	project:	'+string',
	name:		'+string',
	size:		'+number',
	onOutput:	'+function'
}, function (args, onDone) {
		
	if (SR.Settings.hasOwnProperty('SERVER_INFO') === false) {
		return onDone('SR.Settings.SERVER_INFO not set');
	}
			
	// construct server_info (if not provided, use default value in SERVER_INFO)
	var size = args.size || 1;	
	args.owner   = args.owner   || SR.Settings.SERVER_INFO.owner;
	args.project = args.project || SR.Settings.SERVER_INFO.project;
	args.name = args.name || '';
	
	LOG.warn('start ' + size + ' server(s), info: ', l_name);
	LOG.warn(args, l_name);
	
	if (!args.owner || !args.project) {
		return onDone('server_info incomplete');
	}

	var server_type = args.owner + '-' + args.project + '-' + args.name;
				
	// notify if a server process has started
	var onStarted = function (id) {
					  
		LOG.warn('server started: ' + server_type, l_name);
    
		// check if we should notify start server request
		for (var i=0; i < l_pendingStart.length; i++) {
		
			var task = l_pendingStart[i];
		
			if (task.server_type !== server_type) {
				continue;
			}

			LOG.warn('pending type matched: ' + task.server_type, l_name);

			// record server id, check for return
			task.servers.push(id);
			task.curr++;
			
			// store this process id
			if (l_started.hasOwnProperty(server_type) === false)
				l_started[server_type] = [];
			
			// NOTE: we currently do not maintain this id, should we?
			l_started[server_type].push(id);
			
			// check if all servers of a particular type are started
			if (task.curr === task.total) {
				UTIL.safeCall(task.onDone, null, task.servers);
				
				// remove this item until app servers have also reported back
				l_pendingStart.splice(i, 1);
			}
			break;
		}

		// delete log
		l_deleteStartedServer({
			owner: args.owner,
			project: args.project,
			name: args.name
		});

		// log started server
		l_getServerInfo({
			owner: args.owner,
			project: args.project,
			name: args.name,
			size: args.size
		}, 1);
	}
	
	// keep starting servers until 'size' is reached
	var count = 0;
	var start_server = function () {
	
		count++;
		LOG.warn('starting [' + server_type + '] Server #' + count, l_name);
			
		var id = UTIL.createToken();			
		l_run(id, args, onStarted, args.onOutput);

		// see if we should keep starting server, or should return
		if (count < size)
			setTimeout(start_server, 100);
	};

	// try to execute on a given path	
	var validate_path = function (base_path, onExec) {

		var onFound = function () {
			
			// if file found, execute directly			
			// store starting path
			args.exec_path = base_path;
			
			LOG.warn('starting ' + size + ' [' + server_type + '] servers', l_name);
			
			// store an entry for the callback when all servers are started as requested
			// TODO: if it takes too long to start all app servers, then force return in some interval
			l_pendingStart.push({
				onDone: onDone,
				total: size,
				curr: 0,
				server_type: server_type,
				servers: []
			});
			
			start_server();		
		}
		
		var file_path = SR.path.join(base_path, args.name, 'frontier.js');
		LOG.warn('validate file_path: ' + file_path, l_name);
		
		// verify frontier file exists, if not then we try package.json
		SR.fs.stat(file_path, function (err, stats) {

			// file not found
			if (err) {
				file_path = SR.path.join(base_path, 'package.json');
				
				// remove server name from parameter 
				args.name = '';
				
				SR.fs.stat(file_path, function (err, stats) {
					if (err) {
						return onExec('cannot find entry file');
					}
					onFound();
				});
			}
			onFound();
		});
	}

	// NOTE: we assume PATH_USERBASE only exists at the monitor (a non-user project)
	var base_path = (SR.Settings.PATH_USERBASE ? SR.path.join(SR.Settings.PATH_USERBASE, args.owner, args.project) : '.');
	
	// try relative path first
	validate_path(base_path, function (err) {
		if (err) {
			return onDone('cannot find entry file to start server');
		}		
	});
})

function l_deleteStartedServer(data) {
	for (let serverID in SR.startedServers) {
		if (SR.startedServers[serverID].owner == data.owner &&
			SR.startedServers[serverID].project == data.project &&
			SR.startedServers[serverID].name == data.name) {
			delete SR.startedServers[serverID];
			break;
		}
	}
}

function l_getServerInfo(data, times) {
	if (times > 20) {
		return;
	}
	LOG.warn('Trying to get info of the just started server.', l_name);
	SR.API._QUERY_SERVERS(data, function (err, result) {
		if (err) {
			LOG.error(err, l_name);
		} else {
			if (!result[0] || !result[0].id) {
				setTimeout(function () {
					l_getServerInfo(data, +times + 1);
				}, 500);
			} else {
				l_logStartedServers(Object.assign({}, data, {id: result[0].id}))
			}
		}
	})
}

function l_logStartedServers(serverData) {
	var serverExist = false;
	for (let serverID in SR.startedServers) {
		if (SR.startedServers[serverID].owner == serverData.owner && 
			SR.startedServers[serverID].project == serverData.project && 
			SR.startedServers[serverID].name == serverData.name) {
			serverExist = true;
			break;
		}
	}

	if (!serverExist) {
		var projectKey = `${serverData.owner}-${serverData.project}-${serverData.name}`;
		var pid = SR.serverPID[projectKey];
		SR.startedServers[serverData.id] = {
			id: serverData.id,
			owner: serverData.owner, 
			project: serverData.project, 
			name: serverData.name,
			size: serverData.size,
			pid: pid
		};
	}

	var logfile = SR.path.resolve(SR.Settings.LOG_PATH, SR.Settings.Project.serverList);
	SR.fs.writeFile(logfile, JSON.stringify(SR.startedServers), function (err) {
		if (err) {
			return console.log(err);
		}
		LOG.warn("Started server logged.", l_name);
	}); 
}

// start a certain number (size) of servers of a particular type
// server_info include:
// { owner:  'string',
//   project: 'string',
//   name:    'string'}
// NOTE: path needs to be relative to the executing environment, which is where the calling frontier resides

// SR-API
// l_name.start 
// start a certain number (size) of servers of a particular type
// Input
//   server_info 
//     {owner: 'aether', project: 'BlackCat', name: 'lobby'}    
//     what kind of server to start      
//     object         
//   size    
//     1   
//     how many servers to start        
//     number                       
// Output                                    
//   onDone                  
//   onOutput 
var l_start = exports.start = function (server_info, size, onDone, onOutput) {

	LOG.error('obsolete usage of SR.Execute.start.. please use SR.API._START_SERVER instead', l_name);
	
	// force convert parameter
	if (typeof size === 'string')
		size = parseInt(size);

	SR.API._START_SERVER({
		owner:		server_info.owner,
		project:	server_info.project,
		name:		server_info.name,
		size:		size,
		onOutput:	onOutput
	}, function (err, result) {
		if (err) {
			LOG.error(err, l_name);
			return UTIL.safeCall(onDone, err);
		}
		
		// NOTE: this usage returns an array of servers started if success, returns an error string if failed
		// an obsolete usage, should be removed in future versions
		UTIL.safeCall(onDone, result);
	})
}

// shutdown a given or a number of servers
SR.API.add('_STOP_SERVER', {
	id:	'string'
}, function (args, onDone) {

	var id = args.id;

	// check if this is process_id and needs translation to serverID
	if (l_id2server.hasOwnProperty(id))
		id = l_id2server[id];

	// get server info
	SR.Call('reporting.getStat', id, function (list) {
		if (list.length === 0) {
			return onDone('server info for id [' + id + '] does not exist');
		}

		var stat = list[0];
		
		LOG.warn('info for server to be shutdown: ', l_name);
		LOG.warn(stat, l_name);
				
		// check if server to be shutdown is a lobby
		// TODO: have a more unified approach?
		if (stat.type === 'app') {
			
			// record id to list of pending deletion
			l_pendingDelete[id] = true;
		
			// to shutdown app servers, notify the app server directly
			SR.AppConn.sendApp(id, 'APP_SHUTDOWN', {});	
			onDone(null);
		} else {
			if (SR.Settings.PM2_ENABLE) {
				pm2.connect((err) => {
					if (err) {
						LOG.error(err);
						onDone(err);
						return;
					}

					pm2.stop(`${stat.owner}-${stat.project}-${stat.name}`, (err, data) => {
						if (err) {
							LOG.error(err);
							onDone(err);
							return;
						}

						LOG.warn(data);
						onDone(null);
					});
				});
			} else {
				var info = stat;
				var url = 'http://' + info.IP + ':' + (info.port + SR.Settings.PORT_INC_HTTP) + '/shutdown/self';
				LOG.warn('stopping server @ url: ' + url, l_name);
				var stopTimeout = setTimeout(function () {
					
					if (!SR.startedServers[id]) {
						LOG.warn('try to kill invalid server with id: [' + id + ']', l_name);
						return;
					}
					
					var pid = SR.startedServers[id].pid;
					LOG.warn(`Fail to stop server ${id}, force to kill process ${pid}`, l_name);
					process.kill(pid);
				}, 10*1000);
				UTIL.HTTPget(url, function () {
					LOG.warn('stop lobby HTTP request done', l_name);
					clearTimeout(stopTimeout);
					onDone(null);
				});
			}
		}
	});	
});


// shutdown a given or a number of servers          
/// SR-API                     
/// l_name.stop     
/// stop the execution of some servers given server IDs 
 /// Input                   
///   list    
///     ['684D846B-FE39-4506-A19A-F50D0FEFA088', '22C163AE-2E35-4219-AAD1-EA961077B2E2']       
///     array for server's unique ID list 
///     array            
/// Output                                   
///   onDone 
var l_stop = exports.stop = function (list, project, onDone) {
	if (list == 'undefined' && project) {
		if (SR.Settings.PM2_ENABLE) {
			pm2.connect((err) => {
				if (err) {
					LOG.error(err);
					onDone(err);
					return;
				}

				pm2.delete(project, (err, data) => {
					if (err) {
						LOG.error(err);
						onDone(err);
						return;
					}

					LOG.warn(data);
				});
			});
		} else {
			var pid = SR.serverPID[project];
			process.kill(pid);
		}
	}

	// first check if it's just a single server
	if (typeof list === 'string' && list !== '')
		list = [list];
	
	// check if list exist or compose a list made of all currently registered apps servers
	else if (typeof list === 'undefined' || list.length === 0) {
		list = [];
		var servers = SR.AppConn.queryAppServers();
		for (var id in servers)
			list.push(id);
	}

	LOG.warn('attempt to stop ' + list.length + ' servers in total', l_name);
	LOG.warn(list);
	
    // send shutdown signal
	var shut_count = 0;
    for (var i = 0; i < list.length; i++) {
		var id = list[i];
		LOG.warn('id: ' + id, l_name);
		
		SR.API._STOP_SERVER({id: id}, function (err) {
			if (err) {
				LOG.error(err, l_name);
			} else {
				shut_count++;
			}
			
			//LOG.warn('i: ' + i + ' list.length: ' + list.length);
			if (i >= (list.length-1)) {
				UTIL.safeCall(onDone, shut_count + '/' + list.length + ' servers shutdown successfully');				
			}
		});	
	}
}

// get a list of currently started/recorded servers
// server_info include:
// { owner:  'string',
//   project: 'string',
//   name:    'string'}
// NOTE: path needs to be relative to the executing environment, which is where the calling froniter resides                
/// SR-API                   
/// l_name.query          
/// get a list of currently started and live servers                     
/// Input                   
///   server_info  
///     {owner: 'aether', project: 'BlackCat', name: 'lobby'}    
///     what kind of server to query (can be partial, will return the largest set of matched servers)  
///     object                
/// Output                  
///   onDone   
///     [{"server":{"id":"7FA39AA9-63B8-423C-BBE9-A3D38405240B","owner":"aether","project":"BlackCat","name":"lobby","type":"lobby","IP":"211.78.245.176","port":37000},"admin":"shunyunhu@gmail.com","reportedTime":"2014-06-03T10:25:27.779Z"}] 
///     returns a list of currently live servers

SR.API.add('_QUERY_SERVERS', {
	owner:		'+string',
	project:	'+string',
	name:		'+string'
}, function (args, onDone) {

	// resolve for actual path if parameters indicate symlinks
	LOG.warn('_QUERY_SERVERS para:', l_name);
	LOG.warn(args, l_name);
	
	if (!SR.Settings.PATH_USERBASE) {
		return onDone('PATH_USERBASE not found (exists at Monitor only)');
	}

	var onResolved = function () {
		// FIXME: avoid using reporting.getStat
		SR.Call('reporting.getStat', args, function (list) {
			UTIL.safeCall(onDone, null, list);
		});		
	}
	
	// if owner & project are not provided, do not attempt to resolve symlinks 
	if (!args.owner || args.owner === '' || !args.project || args.project === '') {
		return onResolved();
	}
	
	var fullpath = SR.path.join(SR.Settings.PATH_USERBASE, args.owner, args.project);
	LOG.warn('fullpath: ' + fullpath, l_name);
	SR.fs.realpath(fullpath, function (err, resolved) {
		if (err) {
			return (err);
		}
		LOG.warn('resolved path: ' + resolved, l_name);
		// get resolved user / project
		var names = resolved.split('/');
		if (names.length > 2) {
			args.project = names[names.length-1];
			args.owner = names[names.length-2];			
		}
		LOG.warn('resolved para:', l_name);
		LOG.warn(args, l_name);		
		
		onResolved();
	})
});

var l_query = exports.query = function (server_info, onDone) {

	SR.API._QUERY_SERVERS(server_info, function (err, result) {
		if (err) {
			LOG.error(err);
			onDone([]);
		} else {
			onDone(result);
		}
	});	
}

// 以下可自動關閉/啟動全部正在執行的 project servers: 
// 可手動 stopall 關閉, startall 啟動 (包含 lobby, apps 及自行手動 ./run lobby 的)
// 目前已知問題: 
// 	1) 手動 stopall 之後，馬上下 query 還可以看見未關閉前的 project server 集合, 如果又馬上 quit, 則下次重新啟動 monitor 會自動啟動的是 stopall 前的集合，而不是空集合 
//	2) owner: 'aether', project: 'BlackCat', name: 'catfruit_silver' 本身不能被 quit ; 因此像這類關不掉的 app server 可能會「越開越多」, 此外，對於「關不掉」的 project server 而言，若當初是用 bash 開啟的，則可以強制 kill, 但若是用 monitor 開啟的，就要小心刪 process 
//	3) 若有多個 app servers，將來 startall 之後，有可能只會被開一個
//	4) 不在 SR-project 標準路徑的 $SR_PATH 將來 startall 無法自動啟動

// restart all servers previously running
var l_startAll = exports.startAll = function () {
	
    // restart stopped server
	SR.DB.getData(SR.Settings.DB_NAME_SYSTEM, {},
		function (re) {
			
			var servers = re.allservers;
			
            LOG.warn(servers, l_name);
            for (var c in servers) {
				if (servers[c].server.type === 'entry')
					continue;
				
                var obj = { owner: servers[c].server.owner, 
                            project: servers[c].server.project,
                            name: servers[c].server.name
                        };
				
                l_start(obj, 1, function (re){
                        //LOG.warn('The project server is started.', l_name);
                        //LOG.warn(obj, l_name);
                    }, function (re){
                        //LOG.warn('The project server is not started.', l_name);
                        //LOG.warn(obj, l_name);
                    });
            }
        }, 
        function (re) {
			LOG.warn('DB read error', l_name);
		});
};

// stop all servers and record to DB currently executing servers
var l_stopAll = exports.stopAll = function () {
	
    // save and stop all running servers
	l_query({}, function (allServers) {
		
		for (var c in allServers) {
			if (allServers[c].server.type === 'entry')
				delete allServers[c];
		}
				
        SR.DB.setData(SR.Settings.DB_NAME_SYSTEM, {'allservers': allServers});
        LOG.warn('shutting down all servers.', l_name);
	    for (var c in allServers) {
	        LOG.warn(allServers[c].server.id, l_name);
	        l_stop(allServers[c].server.id);
    	}
    });
};


// notify a particular server is started
// TODO: check correctness based on info
/*
info: {
	owner: 'string',
	project: 'string',
	name: 'string',
	type: 'string',
	IP: 'string',
	port: 'number'
}
*/

// record server info (IP & port) when server starts
SR.Callback.onAppServerStart(function (info) {

	var server_type = info.owner + '-' + info.project + '-' + info.name;
	if (l_started.hasOwnProperty(server_type)) {
		var id_list = l_started[server_type];

		// try to associate a process id with a started app server
		// NOTE: this process is independent of when a specific number of processes have started and onDone is called
		if (id_list.length > 0) {
			l_id2server[id_list[0]] = info.id;
			
			LOG.warn('server [' + server_type + '] was started with process id: ' + id_list[0], l_name);
			
			// remove process id
			id_list.splice(0, 1);
			return;
		}
	}
	else {
		LOG.warn('server [' + server_type + '] was started manually, cannot terminate it with process id', l_name);
	}
	
});

SR.Callback.onAppServerStop(function (info) {
	
	LOG.warn('removing pending delete record for server [' + info.id + ']', l_name);
	
	// delete pending requests for app server deletion
	delete l_pendingDelete[info.id];
	
	// remove server info in SR.Report
	//SR.Report.removeStat(info.id);
	
});

// run a single server instance
// id:	unique id for this process
// info: {
//		owner: 'string',
//		project: 'string',
//		name: 'string'
//		exec_path: 'string'
// }
// onDone notifies when the process is executed (with unique ID returned)
// onOutput notifies the output of the process execution
var l_run = exports.run = function (id, info, onDone, onOutput) {
	
	var exec_path = info.exec_path;
	var exec_name = info.owner + '-' + info.project + '-' + info.name;
	LOG.warn(info, l_name);
	LOG.warn('exec_path: ' + exec_path, l_name);
	
	var log_path = SR.path.resolve(exec_path, 'log');
	LOG.warn('log_path: ' + log_path, l_name);
	
	/* screen version
	var new_proc = spawn('screen', 
						 ['-m', '-d', '-S', info.name, SR.path.join('.', 'run'), info.name],
						 {cwd: exec_path}		
	*/
	
	var log_file = undefined;
	
	var onLogOpened = function (err, file_exists) {
		
		if (err) {
			LOG.error('Failed to open log file: ' + exec_name, l_name);
			LOG.error(err, l_name);
			return;
		}
	
		// execute directly
		// TODO: execute under a given linux user id? (probably too complicated)
		var cmd, para;

		// see usage: http://stackoverflow.com/questions/11580961/sending-command-line-arguments-to-npm-script		
		if (info.name && info.name !== '') {
			cmd = 'node';
			para = [info.name + '/frontier.js', '--CONNECT_MONITOR_ONSTART=true'];	
		} else {
			cmd = 'npm';
			para = ['start'];
		}
	 
		LOG.warn('cmd: ' + cmd + ' para: ' + para);
		
		if (SR.Settings.PM2_ENABLE) {
			pm2.connect((err) => {
				if (err) {
					LOG.error(err);
					onDone(err);
					return;
				}

				pm2.start({
					name: `${info.owner}-${info.project}-${info.name}`,
					cwd: exec_path,
					script: 'npm',
					args: 'start',
					output: SR.path.resolve(log_path, 'output.log'),
					error: SR.path.resolve(log_path, 'output.log')
				}, (err, proc) => {
					if (err) {
						LOG.error(err);
						onDone(err);
						return;
					}

					LOG.warn(proc);
					UTIL.safeCall(onDone, id);
					// log project pid
					SR.serverPID = SR.serverPID || {};
					SR.serverPID[`${info.owner}-${info.project}-${info.name}`] = proc[0].pid;
				});
			})
		} else {
			var new_proc = spawn(cmd, para, {cwd: exec_path});

			// log screen output & re-direct
			new_proc.stdout.setEncoding('utf8');
			new_proc.stdout.on('data', function (data) {

				// notify the process run has been executed for once (but may or may not be successful)
				if (typeof onDone === 'function') {
					UTIL.safeCall(onDone, id);
					onDone = undefined;
				}

				onStdData(data);
			});

			// print error if start fail
			new_proc.stderr.setEncoding('utf8');
			new_proc.stderr.on('data', function (data) {
				if (/^execvp\(\)/.test(data)) {
					LOG.error('Failed to execute: ' + exec_name + ' path: ' + exec_path, l_name);
				}
				LOG.error(data, l_name);
				onStdData(data);
			});

			// NOTE: should we call some callback when process exits?
			new_proc.on('exit', function (code) {
				LOG.warn('program [' + exec_name + '] process exited with code ' + code, l_name);

				if (log_file) {
					log_file.close(function () {
						log_file = undefined;
					});
				}
			});

			// catch errors
			new_proc.on('error', function (err) {
				LOG.error(err, l_name);
			});
		}

		function onStdData(data) {

			// convert to utf8 text chunk
 	 	    var textChunk = decoder.write(data);
    
			// write output to log file under the project's log directory
			if (log_file) {
				log_file.write(textChunk);
			}

			// notify callback of output messages
			if (typeof onOutput === 'function') {
    				
				// store data as an output message
				var msg = {
					id: id,
					data: textChunk
				}
                UTIL.safeCall(onOutput, msg);
			}
		}
	}
	
	// filename, onSuccess, onFail, to_cache
	// NOTE: why log_file is important here is because we want to capture ALL stdout output during starting a server
	// not just those the server writes by itself if executing successfully	
	log_file = new SR.File();
	//log_file.open(id + '.log',
	log_file.open('output.log',
				  	onLogOpened, 
					false,
					log_path);
}


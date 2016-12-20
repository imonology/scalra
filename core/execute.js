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
	name:		'string',
	size:		'+number',
	onOutput:	'+function'
}, function (args, onDone) {
	
	LOG.warn('SR.API._START_SERVER called');
	
	if (SR.Settings.hasOwnProperty('SERVER_INFO') === false) {
		return onDone('SR.Settings.SERVER_INFO not set');
	}
			
	// construct server_info (if not provided, use default value in SERVER_INFO)
	var size = args.size || 1;	
	args.owner   = args.owner   || SR.Settings.SERVER_INFO.owner;
	args.project = args.project || SR.Settings.SERVER_INFO.project;
		
	LOG.warn('start ' + size + ' server(s), info: ', l_name);
	LOG.warn(args, l_name);
	
	if (!args.owner || !args.project || !args.name) {
		return onDone('server_info incomplete');
	}

	// build path, first try relative, then try absolute
	var valid_path = false;
	
	var path = '.';
	var frontier_path = SR.path.join('.', args.name, 'frontier.js');
	var log_path = SR.path.join('.', 'log', 'screen.out');

	LOG.warn('relative frontier path: ' + frontier_path, l_name);
	LOG.warn('log path: ' + log_path, l_name);

	var server_type = args.owner + '-' + args.project + '-' + args.name;
			
	// notify if a server process has started
	var onStarted = function (id) {
					  
		LOG.warn('server started: ' + server_type, l_name);
    
		// check if we should notify start server request
		for (var i=0; i < l_pendingStart.length; i++) {
		
			var task = l_pendingStart[i];
		
			LOG.warn('pending type: ' + task.server_type, l_name);
			if (task.server_type === server_type) {
									
				// record server id, check for return
				task.servers.push(id);
				task.curr++;
				
				// store this process id
				if (l_started.hasOwnProperty(server_type) === false)
					l_started[server_type] = [];
				
				// NOTE: we currently do not maintain this id, should we?
				//l_started[server_type].push(id);
				
				// check if all servers of a particular type are started
				if (task.curr === task.total) {
					UTIL.safeCall(task.onDone, null, task.servers);
					
					// remove this item until app servers have also reported back
					l_pendingStart.splice(i, 1);
				}
				break;
			}
		}
	}
	
	// start executing
	var count = 0;
	var existing_count = 0;
	var start_server = function () {
	
		count++;
		existing_count++;
		var name = server_type + existing_count;
		LOG.warn('starting [' + server_type + '] Server #' + count + ' ' + name, l_name);
			
		var id = UTIL.createToken();			
		l_run(id, args, onStarted, args.onOutput);

		// see if we should keep starting server, or should return
		if (count < size)
			setTimeout(start_server, 100);
	};
	
	var exec_frontier = function () {

		// store starting path
		args.exec_path = path;
		
		LOG.warn('starting ' + size + ' [' + server_type + '] servers', l_name);
		
		// for app servers, get how many app servers of a given name is already started	
		if (args.name !== 'lobby')
			existing_count = Object.keys(SR.AppConn.queryAppServers(args.name)).length;
		
		LOG.warn('there are ' + existing_count + ' existing [' + server_type + '] servers', l_name);

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
	
	// verify frontier file exists
	SR.fs.stat(frontier_path, function (err, stats) {
		
		// if file found, execute directly
		if (!err) {
			return exec_frontier();
		}
			
		if (!SR.Settings.PATH_USERBASE) {
			return onDone('frontier not found: ' + frontier_path);
		}
		
		LOG.warn('relative frontier_path does not exist, try absolute. PATH_USERBASE: ' + SR.Settings.PATH_USERBASE, l_name);				
		path = SR.path.join(SR.Settings.PATH_USERBASE, args.owner, args.project);
		frontier_path = SR.path.join(path, args.name, 'frontier.js');
		LOG.warn('absolute frontier path: ' + frontier_path, l_name);
		
		SR.fs.stat(frontier_path, function (err) {
			if (err) {
				return onDone('frontier not found: ' + frontier_path);
			}
			exec_frontier();
		});
	});	
})

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
var l_stop = exports.stop = function (list, onDone) {

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
		
		// check if this is process_id and needs translation to serverID
		if (l_id2server.hasOwnProperty(id))
			id = l_id2server[id];
			
		var stat = undefined;
		
		// get server info
		SR.Call('reporting.getStat', id, function (list) {
			if (list.length === 0) {
				LOG.warn('server info for id [' + id + '] does not exist', l_name);				
				return;
			}
			stat = list[0];
			
			LOG.warn('info for server to be shutdown: ', l_name);
			LOG.warn(stat, l_name);
			
			shut_count++;
					
			// check if server to be shutdown is a lobby
			// TODO: have a more unified approach?
			if (stat.type === 'app') {
				
				// record id to list of pending deletion
				l_pendingDelete[id] = true;
			
				// to shutdown app servers, notify the app server directly
				SR.AppConn.sendApp(id, 'APP_SHUTDOWN', {});			
			}
			else {
				
				var info = stat;
				var url = 'http://' + info.IP + ':' + (info.port + SR.Settings.PORT_INC_HTTP) + '/shutdown/self';
				LOG.warn('stop a lobby, url: ' + url, l_name);
				UTIL.HTTPget(url, function () {
					LOG.warn('stop lobby HTTP request done', l_name);
				});
			}
		});		
	}
	
	UTIL.safeCall(onDone, shut_count + ' servers shutdown');
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
var l_query = exports.query = function (server_info, onDone) {
	
	SR.Call('reporting.getStat', server_info, function (list) {
		UTIL.safeCall(onDone, list);
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
	//LOG.warn('an app server has started:', l_name);
	//LOG.warn(info);
	
	// store server info to SR.Report (so app server info is stored consistently regardless at lobby or monitor)
	//SR.Report.storeStat({server: info});	

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
	//LOG.warn('an app server has stopped:', l_name);
	//LOG.warn(info, l_name);
	
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
	var log_path = exec_path;
	
	LOG.warn(info, l_name);
	LOG.warn('exec_path: ' + exec_path, l_name);
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
		//var cmd = SR.path.join('.', 'run');
		//LOG.warn('spawn cmd: ' + cmd, l_name);
		var exe_file = info.name + '/frontier.js';
		var new_proc = spawn('node',
							 [exe_file, '--CONNECT_MONITOR_ONSTART=true'],
							 {cwd: exec_path}
		);
		
		var onStdData = function (data) {

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
	
	// filename, onSuccess, onFail, to_cache
	// NOTE: why log_file is important here is because we want to capture ALL stdout output during starting a server
	// not just those the server writes by itself if executing successfully	
	log_file = new SR.File();
	//log_file.open(	id + '.log',
	log_file.open('output.log',
				  	onLogOpened, 
					false,
					log_path);
}

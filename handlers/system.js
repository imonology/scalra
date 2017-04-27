//
//  system.js
//
//	system-related message handlers (automatically loaded?)
//
//	handlers:
//		SR_ERROR				handling of evnet handle errors returned by other server
// 		SR_SYS_QUERY_SERVER		query for currently connected app servers
//		SR_GET_CONFIG			download Scalra config file

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

// get a reference to system states
var l_states = SR.State.get(SR.Settings.DB_NAME_SYSTEM);


// 
// obtain app server/port from user servers
// 

// TODO: put this as an API function in SR.AppConn ?
var l_pendingQueryRequests = {};

var l_queryAppServer = function (server_name, onDone) {

	// look for IP & port info and respond with first available
    var app = SR.AppConn.getAvailableApp(server_name);
    var ip_port = "";

	var capacity = SR.AppConn.getServerCapacity(server_name);
	LOG.warn('server capacity (how many servers can we start): ' + capacity, 'handlers.system');
	
	// if a server is found
	if (Object.keys(app).length > 0)
		ip_port = app.IP + ':' + app.port;
	// if no server found, and cannot start more
	else if (capacity === 0)
		LOG.error('no App Server [' + server_name + '] available.. but capacity reached, cannot start new servers', 'handlers.system');
	// if no server found, but can still start some... 
	else {
		
		// record request
		if (l_pendingQueryRequests.hasOwnProperty(server_name) === false)
			l_pendingQueryRequests[server_name] = [];
		l_pendingQueryRequests[server_name].push(onDone);
		
		LOG.warn('waiting for App Server [' + server_name + '] to start...', 'handlers.system');

		SR.Execute.start({owner: SR.Settings.SERVER_INFO.owner, project: SR.Settings.SERVER_INFO.project, name: server_name}, 1, function (result) {
			LOG.warn('start app server [' + server_name + '] done, result: ', 'handlers.system');
			LOG.warn(result, 'handlers.system');
		});
		return;
	}

	UTIL.safeCall(onDone, ip_port);
}


//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------


// if error is received simply print out and stop responding, otherwise two servers keep sending
// unrecongized messages between may enter infinite event loops
l_handlers.SR_ERROR = function (event) {
	LOG.error('SR_ERROR called, parameter:', 'handlers.system');
	LOG.error(event.data, 'handlers.system');

	event.done();
}

// send back basic server info
l_handlers.SR_PING = function (event) {
	// return IP:port & some basic info of this host
	LOG.debug(event);
	var info = SR.Settings.SERVER_INFO;
	delete info.id;
	event.done('SR_PONG', info);	
}

// query for currently connected app servers
l_checkers.SR_SYS_QUERY_SERVER = {
    server:   'string'
};

l_handlers.SR_SYS_QUERY_SERVER = function (event) {
	LOG.warn('SR_SYS_QUERY_SERVER called', 'handlers.system');
	
  	var server_name = event.data.server;

	l_queryAppServer(server_name, function (ip_port) {
		LOG.sys('server_name to lookup: ' + server_name + ' respond with IPport: ' + ip_port, 'handlers.system');	
	    event.done('SRR_SYS_QUERY_SERVER', {server: server_name, IPport: ip_port});
	});
}

// download config.js as a file
l_handlers.SR_GET_CONFIG = function (event) {

	// NOTE: readFile path is relative to Scalra's core files such as /dev/core
	UTIL.readSystemConfig(function (file) {
		if (file) {
			event.done('SR_DOWNLOAD', {filename: 'config.js', data: file});
			
			// modify content and write back (for testing purpose)
			file = file.replace('var mode = \'src\';', 'var mode = \'src\';' + ' // read once');
			UTIL.writeSystemConfig(file, function (result) {
				LOG.sys('write config result: ' + result, 'handlers.system');
			});
		}
		else
			event.done('SR_GET_CONFIG', {result: false});
	});
}

/******************************************
// system-wide server start/stop procedures
******************************************/

//
// check socket policy server
//

SR.Callback.onStart(function () {
	
	// store system start time
	SR.Stat.startTime = new Date();
	
	// TODO: pull this out as independent check/module?
	// check if socket policy server exists	
	if (SR.Settings.WARN_SOCKET_POLSRY_SERVER === true) {
		UTIL.isPortOpen(843, function (result) {
			if (result === true) {
				var msg = 'socket policy server not found at port 843, please check with admin or set SR.Settings.WARN_SOCKET_POLSRY_SERVER = false';
				LOG.error(msg, 'handlers.system');					
			}
			else {
				LOG.warn('port 843 occupied, socket policy server in effect...', 'handlers.system');
			}
		});	
	}
	
});


//
// load and backup system parameters
//

// initialize certain system info (such as projectID, projectSecret)
var l_initSystemParameters = function (name, default_value) {
	if (l_states.hasOwnProperty(name) === false) {
		LOG.warn('[' + name + '] initialized to: ' + default_value, 'handlers.system');
		l_states[name] = default_value;
	}
}

SR.Callback.onStart(function () {
	
	// skip the init procedure if not lobby server
	if (SR.Settings.SERVER_INFO.type !== 'lobby')
		return;
	
    // check existing users
	SR.DB.getData(SR.Settings.DB_NAME_SYSTEM, {}, 
				  	// success
				  	function (data) {
					
						LOG.sys('loading system parameters from DB...', 'handlers.system');						
						if (data !== null) {
							LOG.sys(data, 'handlers.system');						
							for (var key in data)
								l_states[key] = data[key];
						}
						
						l_initSystemParameters('projectID', UTIL.createUUID());
						l_initSystemParameters('projectSecret', UTIL.createToken());
		
						// add sync function to l_states
						l_states.sync = function (onDone) {
							// store back to DB
							// check existing users
							l_states.lastUpdate = new Date();
							SR.DB.setData(SR.Settings.DB_NAME_SYSTEM, l_states, 
								// success
								function (data) {
									onDone(null);
								},
								// fail
								function () {
									onDone('store system para failed');
								}
							);
						}
				  	},
				  	// fail
				  	function () {
						LOG.error('load system parameters from DB error', 'handlers.system');
				  	});
});

SR.Callback.onAppServerStart(function (info) {
	
	// check pending queryServer requests to return, if any
	if (l_pendingQueryRequests.hasOwnProperty(info.name)) {
		
		LOG.warn('server request found for [' + info.name + '], respond to client requests...', 'handlers.system');
		var callbacks = l_pendingQueryRequests[info.name];
		
		var ip_port = info.IP + ':' + info.port;
		LOG.warn('ip_port to return: ' + ip_port + ' client to notify: ' + callbacks.length, 'handlers.system');
		for (var i=0; i < callbacks.length; i++)
			UTIL.safeCall(callbacks[i], ip_port);
		
		delete l_pendingQueryRequests[info.name];
	}
});

SR.Callback.onStop(function () {
	
	// skip the init procedure if not lobby server
	if (SR.Settings.SERVER_INFO.type !== 'lobby' || Object.keys(l_states).length === 0)
		return;	
	
	LOG.warn('storing system parameters to DB...', 'handlers.system');
	
    // store states back to DB	
	l_states.sync(function (err) {
		if (err) {
			LOG.error('store system parameter to DB error...', 'handlers.system');
		} else {
			LOG.warn('store system parameter to DB success...', 'handlers.system');
		}
	});
});

//
//	record server start/shutdown time
//

SR.Callback.onStart(function () {
	// perform event log
	var onSuccess = function (latest_log) {
		if (latest_log !== null && latest_log.type !== "SYSTEM_DOWN") {
			LOG.warn("server crashed last time", 'handlers.system');
			LOG.event("SYSTEM_CRASHED", SR.Settings.SERVER_INFO);
		}

		LOG.event("SYSTEM_UP", SR.Settings.SERVER_INFO);
	};

	var onFail = function () {
		LOG.error("query system log fail", 'handlers.system');
	};
	SR.DB.getData(SR.Settings.DB_NAME_SYS_EVENT, {}, onSuccess, onFail);
});

SR.Callback.onStop(function () {
	// record system shutdown event
	LOG.event('SYSTEM_DOWN', SR.Settings.SERVER_INFO);
});


////////////////////////////////////////////////////
l_handlers.SR_SYSEVENT = function (event) {
	console.log("in systemEventLog event.data");
	console.log(event.data);

	if ( ! event.data ) {
		console.log("no event.data");
	 	event.done('event log', {error: "no event.data"});
		return;
	}

	var s = event.data.start;
	var e = event.data.end;
	var startDate = new Date(s.year, parseInt(s.month) -1, s.day, s.hour, s.minute, s.second, 1);
	var endDate = new Date(e.year, parseInt(e.month) -1, e.day, e.hour, e.minute, e.second, 1);
	var obj = {};
    
    if (event.data.obj && typeof(event.data.obj) === 'object') {
        //obj = JSON.parse(JSON.stringify(event.data.obj));
        obj = event.data.obj;
    }
    obj.start= startDate;
    obj.end= endDate;
	//console.log(obj);
	//event.done('event log', {});
	LOG.query(obj, function (result) {
		console.log(result.length);
	 	event.done('event log', result);
    });
}


////////////////////////////////////////////////////////
l_handlers.systemEventLog = function (event) {
	console.log("in systemEventLog event.data");
	console.log(event.data);

	if ( ! event.data ) {
		console.log("no event.data");
	 	event.done('event log', {error: "no event.data"});
		return;
	}

	if ( ! event.data.start ) {
		console.log("no start");
	 	event.done('event log', {error: "no event.data.start"});
		return;
	}

	if ( ! event.data.end ) {
		console.log("no end");
	 	event.done('event log', {error: "no event.data.end"});
		return;
	}

	var s = event.data.start;
	var e = event.data.end;
	var startDate = new Date(s.year, parseInt(s.month) -1, s.day, s.hour, s.minute, s.second, 1);
	var endDate = new Date(e.year, parseInt(e.month) -1, e.day, e.hour, e.minute, e.second, 1);
	//console.log(startDate);
	//console.log(endDate);
	var obj = {start: startDate, end: endDate};
	if (event.data.typeExclude && typeof event.data.typeExclude === 'object') {
		obj.type = {"$nin": event.data.typeExclude};
	}
	if (event.data.typeInclude && typeof event.data.typeInclude === 'object') {
		obj.type = {"$in": event.data.typeInclude};
	}
	if (event.data.data_camera_idExclude && typeof event.data.data_camera_idExclude === 'object') {
		obj.data = {};
		obj.data.camera_id = {"$nin": event.data.data_camera_idExclude};
	}
	if (event.data.data_camera_idInclude && typeof event.data.data_camera_idInclude === 'object') {
		obj.data = {};
		obj.data.camera_id = {"$in": event.data.data_camera_idInclude};
	}
	console.log(obj);
			LOG.query(obj, function (result) {
				console.log(result.length);
			 	event.done('event log', result);
		  });
	//event.done("",{});
}


//////////////////////////////////////////////
// to get system event log 
// event/systemLog?action=getEventLog&startYear=2014&startMonth=10&startDay=10&startHour=10&startMinute=10&startSecond=10&endYear=2014&endMonth=12&endDay=12&endHour=12&endMinute=12&endSecond=12
//type=
//camera_id=
/////////////////////////////////////////////
l_handlers.systemLog = function (event) {
    //event.done("xx",{});
	console.log("event.data");
	console.log(event.data);
	console.log(typeof event.data.camid);
	
	switch (event.data.action) {
		case 'getEventLog':
			var camera_id = [];
			if (typeof camera_id === 'string') {
			  camera_id.push(event.data.camid);
			}
			else if (typeof camera_id === 'object') {
			  camera_id = event.data.camid;
			}

			var dateStart = new Date();
			var dateEnd = new Date();

			if (event.data.startYear && event.data.startMonth && event.data.startDay && event.data.startHour && event.data.startMinute && event.data.startSecond){ 
			dateStart = new Date(event.data.startYear, event.data.startMonth - 1, event.data.startDay, event.data.startHour, event.data.startMinute, event.data.startSecond, 1);
			} else {
				event.done("start date error", {});
				return;
			}

			if (event.data.endYear && event.data.endMonth && event.data.endDay && event.data.endHour && event.data.endMinute && event.data.endSecond ) {
				dateEnd = new Date(event.data.endYear, event.data.endMonth -1, event.data.endDay, event.data.endHour, event.data.endMinute, event.data.endSecond, 1);
			} else {
				event.done("end date error", {});
				return;
			}
	
			console.log("dateStart " + dateStart.toString() );
			console.log("dateEnd" + dateEnd.toString() );

			var obj = {start: dateStart, end: dateEnd};
			if (event.data.type) obj.type = event.data.type;
			//if (camera_id.length > 0) {
			  //obj["data.camera_id"] = {"$nin": camera_id};
			  //obj.data = {};
			  //obj["data.camera_id"] = "7CD21CfC-2598-4C0B-9285-9DF93D9987AB";
		    //}
			//console.log("obj %j", obj);
			LOG.query(obj, function (result) {
				//console.log(result);
			 	event.done('event log', result);
		  });
		case '':
			break;
		default:
			break;
	}
}


////////////////////////////////////////////
// export/import system settings and database 
// 要先開一個 /web/systemSettings.html 包含檔案上傳/再執行此 import; export 之後再檔案下載 
// 
////////////////////////////////////////////
l_handlers.systemSettings = function (event) {
	console.log(event.data);
	switch (event.data.action) {
		case 'import':
			
		break;
		case 'export':
			// mongodump 

			// Hydra/settings.js
			
			event.done(event.data.action, {"settings": "http://xxxxx/web/xxxx.tgz" });
		break;
		default:
		break;
	}
}



///////////////////////////
// 取得最後上傳狀態 
//
///////////////////////////
l_handlers.SR_FILE_UPLOAD  = function (event) {
	console.log(event.data.action);
	switch (event.data.action) {
		case 'getLatestUploaded':
			setTimeout(function () {
			if (SR.Status && SR.Status.latestUploadedFile ) 
				event.done('get latest uploaded', SR.Status.latestUploadedFile);
			else
				event.done('get latest uploaded', {});
			},3000);
		break;
		default:
		break;
	}
}



l_handlers.SR_SYSINFO = function (event) {
    //console.log(event);
    var xx = UTIL.getSystemInfo();
    console.log(xx);
    event.done('SR_SYSINFO', xx);
}

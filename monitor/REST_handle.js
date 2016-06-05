/*

//
//  REST_web.js
//
//	a RESTful handler for request handling in monitor
//
	supported_handles:

getPort
report
run

*/


var l_handles = exports.REST_handles = {};

//
// local private variables to keep track of created data
//

// list of ports already assigned
var l_ports = {};

//
// helper code
//

// send back response to client
var l_reply = function (res, res_obj) {

    // return response if exist, otherwise response might be returned 
    // AFTER some callback is done handling (i.e., response will be returned within the handler)
    if (typeof res_obj === 'string') {
        LOG.sys('replying a string: ' + res_obj);
        res.writeHead(200, {'Content-Type': 'text/plain'});                     
        res.end(res_obj);            
    }
    else {
        LOG.sys('replying a JSON: ' + JSON.stringify(res_obj));
        res.writeHead(200, {'Content-Type': 'application/json'});                     
        res.end(JSON.stringify(res_obj));        
    }
}


// recycle an app port
var l_recyclePort = function (ports) {
	
	var port = ports[0];

	var list = '';
	for (var i=0; i < ports.length; i++) {
		list += (ports[i] + ', ');
		delete l_ports[ports[i]];
	}

	LOG.warn('release ports: ' + list, 'SR.Monitor');
	
	// remove all other ports associated with this port
	for (var i in l_ports) {
		if (l_ports[i] === port) {
			LOG.warn('release port: ' + i, 'SR.Monitor');
			delete l_ports[i];
		}
	}
}

// record an existing port
// 'parent_port' indicats the which port, if released, will also release the current port
var l_recordPort = function (port, parent_port) {

	// check if the port wasn't reported
	if (l_ports.hasOwnProperty(port) === false) {
		
		LOG.warn('recording used port [' + port + ']...', 'SR.Monitor');	
		l_ports[port] = parent_port || port;
	}
}

// assign a unique application port
var l_assignPort = function (size) {

	size = size || 1;
	LOG.warn('trying to assign ' + size + ' new ports...', 'SR.Monitor');
	
	// find first available port
	var port = SR.Settings.PORT_APP_RANGE_START;
	var last_port = SR.Settings.PORT_APP_RANGE_END;

	// first port found
	var first_port = undefined;
	var results = [];
	
	while (port <= last_port) {
		
		if (l_ports.hasOwnProperty(port) === false || l_ports[port] === null) {
			// found a unique port
			if (!first_port)
				first_port = port;
			
			// mark the port as assigned
			l_ports[port] = first_port;
			results.push(port);
			
			LOG.warn('assigning port: ' + port, 'SR.Monitor');	
			
			if (--size === 0)
				break;
		}
		port++;
	}

	// no available ports found, or not enough ports found
	if (port > last_port)
		return 0;
	
	if (results.length > 1)
		return results;
	else
		return results[0];
}


//
//  internal functions
//

// periodic checking liveness of app servers
var l_checkAlive = function () {

	var currTime = new Date();
	var overtime = (SR.Settings.INTERVAL_STAT_REPORT * 2);

	// remove servers no longer reporting
	for (var serverID in SR.Report.servers) {
		var stat = SR.Report.servers[serverID];
		
		if (!stat || !stat.reportedTime)
			continue;
		
		// server considered dead
		if (currTime - stat.reportedTime > overtime) {
			var ip_port = stat.server.IP + ':' + stat.server.port;
			LOG.sys(ip_port + ' overtime: ' + overtime + ' last: ' + stat.reportedTime);

			LOG.error('server: ' + ip_port + ' (' + stat.server.type + ') not responding after ' + overtime + ' ms, mark dead...', 'SR.Monitor');
			SR.Report.removeStat(serverID);
			
			// recycle port if it's from a local server
			if (stat.server.IP === SR.Settings.SERVER_INFO.IP) {
				LOG.warn('server is a local server, re-cycle its ports...', 'SR.Monitor');
				l_recyclePort(stat.ports);
			}
		}
	}
}


//
//  REST handlers
//

// custom request handlers
l_handles.getPort = function (path_array, res, para, req) {

	var size = 1;
	
	if (para && typeof para['size'] !== 'undefined') {
		var n = parseInt(para['size']);
		if (typeof n === 'number')
			size = n;
	}
	
	LOG.warn('request ' + size + ' new ports...', 'SR.Monitor');
	var ports = l_assignPort(size);

	// NOTE: return value may be a single number (if requesting only one) or an array of ports
	var res_obj = {
		port: ports
	};

	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(res_obj));
}
/*
// process server stat report
l_handles.report = function (path_array, res, para, req) {
	
	if (typeof para === 'undefined') {
		LOG.error('POST data is empty', 'SR.Monitor');
	}
	else {
		var stat_array = para;
		for (var i=0; i < stat_array.length; i++) {
			var stat = stat_array[i];
	
			// check if the reporting server is locally on the same machine, if so,
			// mark its port as 'already used'
			// TODO: this only works if the reporting server & monitor are at the same physical host
			// a better approach?
			if (stat.server && stat.server.IP === SR.Settings.SERVER_INFO.IP &&
				stat.ports instanceof Array &&
			    stat.ports.length > 0) {
				for (var i=0; i < stat.ports.length; i++)
					l_recordPort(stat.ports[i], stat.ports[0]);
			}
			
			// store stat 
			// NOTE: if the stat is a shutdown, port may be recycled afterwards
			// so SR.Report.storeStat should be called AFTER _reportPort is checked
			SR.Report.storeStat(stat);
			
			// notify other nodes in DHT ring about update
			//UTIL.contactMonitor('update', {id: stat.server.id});
		}
	}
	res.end();
}

// new server added to DHT ring
l_handles.update = function (path_array, res, para, req) {

	LOG.warn('update received, update server list:', 'SR.Monitor');
	LOG.warn(para);
	SR.Report.updateServer(para.id);
	res.end();
}
*/

// redirect to the URI of a particular app
l_handles.run = function (path_array, res, para, req) {

	var app_name = path_array[2];
	var app = SR.Report.redirects[app_name];
	
	// check if app is registered
	if (app === undefined) {
		var msg = '[' + app_name + '] not reported, cannot redirect to server...';
		LOG.warn(msg);
		l_reply(res, msg);
		return false;
	}
	
	var alive = false;
	var redirect_uri = undefined;

	if (app.hasOwnProperty('live_url') === false) {
		LOG.error('no live_url found for [' + app_name + ']');
	}
	// get live or dead URL
	else if (app.alive) {
		alive = true;
		redirect_uri = app.live_url;
	}
	else		
		redirect_uri = app.dead_url;

	// check liveness and redirection URL	
	LOG.warn('app [' + app_name + '] liveness: ' + alive + ', redirect to: ' + redirect_uri);

	res.writeHead(302, {
		'Location': redirect_uri
	});

	res.end();
	return true;
}


//-----------------------------------------
// Start/Stop procedures
//
//-----------------------------------------

var l_timer = undefined;

SR.Callback.onStart(function () {
	/*
	var list = undefined;
	LOG.warn('IP_MONITOR:', 'SR.Monitor');
	LOG.warn(SR.Settings.IP_MONITOR, 'SR.Monitor');
	
	if (SR.Settings.IP_MONITOR instanceof Array) {
		list = SR.Settings.IP_MONITOR;
	}
	else 
		list = [SR.Settings.IP_MONITOR];
	
	// init DHT 
	SR.Report.init({hosts: list}, function () {
		LOG.warn('DHT init done, monitor ring joined...', 'SR.Monitor');	
	});
	*/
	// start periodic probing for app servers
	//l_timer = setInterval(l_checkAlive, SR.Settings.INTERVAL_LIVENESS_CHECK);

	/*
	// register callback to recycle port when server shutdown	
	// TODO: better way to do this than put here?
	SR.Report.onShutdown(function (stat) {
		
		// recycle port if it's from a local server
		if (stat.server.IP === SR.Settings.SERVER_INFO.IP) {
			LOG.warn('server is a local server, re-cycle its ports...', 'SR.Monitor');
			l_recyclePort(stat.ports);
		}
	});
	*/
});

// stop check-alive timer when server stops
SR.Callback.onStop(function () {
	if (l_timer) {
		clearInterval(l_timer);
		l_timer = undefined;
	}
});

SR.REST.addHandler(l_handles);
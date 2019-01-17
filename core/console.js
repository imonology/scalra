
//
//  console.js
//
//  customizable handler for console messages 
//
//  history:
//  2014-02-17  extracted from frontier.js
//

var l_handlers = SR.State.get('SR.Console');

// add a new handler with a given description and usage text
// usage please follow the style in: http://en.wikipedia.org/wiki/Usage_message
var l_add = exports.add = function (command, desc_text, handler, usage_text) {
    
	if (typeof handler !== 'function') {
		LOG.warn('handler must be a function for command [' + command + ']', 'SR.Console');
		return false;   
	}
    
	// warn if already exists
	if (l_handlers.hasOwnProperty(command)) {
		LOG.warn('console command [' + command + '] already registered, replace existing...', 'SR.Console');
	}
    
	// add handler
	l_handlers[command] = {
		desc: desc_text,
		usage: usage_text,
		handler: handler
	};
    
	return true;
};

l_add('quit', 'quit current server instance', function (para) {
	SR.Settings.FRONTIER.dispose();
	return true;
});

l_add('list', 'show live app servers', function (para) {
	console.log('list current apps');
    
	var appList = SR.AppConn.queryAppServers();

	var count = 1;
	for (var appID in appList) {
        
		console.log(count + ': ' + appList[appID].IP + ':' +appList[appID].port + 
                  ' [' + appList[appID].name + '] users: ' + appList[appID].usercount);
	    count++;
	}	
	return true;
});

l_add('start', 'start app server of a type', function (para) {
		
	var name = para[0];
	
	if (name === '')
		return false;
	
	var num = 1;
	if (para.length > 2 && para[1] !== '')
		num = parseInt(para[1]);
	
	var owner = para[2];
	var project = para[3];
	
	var server_info = {
		owner: owner,
		project: project,
		name: name
	};
							
	LOG.warn('starting ' + num + ' servers of type [' + name + ']', 'SR.Console');
	SR.Execute.start(server_info, num, function (list) {
		if (typeof list === 'string')
			LOG.warn(list, 'SR.Console');
		else {
			LOG.warn(list.length + ' servers started', 'SR.Console');
			for (var i=0; i < list.length; i++)
				LOG.sys(list[i], 'SR.Console');
		}
	});
	return true;
},
'type [size] [owner] [project]');

l_add('stop', 'stop an app server of a given appID', function (para) {
	var appID = para[0];
	SR.Execute.stop(appID, function (result) {
		LOG.warn(result, 'SR.Console');				
	});
	return true;
},
'appID');

l_add('stopall', 'stop all live project servers', function (para) {
	SR.Execute.stopAll();
},
'');

l_add('startall', 'restart all stopped project servers', function (para) {
	SR.Execute.startAll();
},
'');

l_add('query', 'query a list of info for live servers', function (para) {
	var owner = para[0];
	var project = para[1];
	var name = para[2];
	
	SR.Execute.query({owner: owner, project: project, name: name}, function (list) {
		LOG.warn(list, 'SR.Console');
	});
},
'[owner] [project] [name]');

l_add('log', 'set different display levels', function (para) {
	var level = parseInt(para[0]);
	if (isNaN(level)) {
		console.log('current level: ' + LOG.getLevel() + ' (4: system, 3: debug, 2: warning, 1: error)');	
	} else if (level > 4 || level <= 0)
		return false;
	else {
		console.log('set error level to: ' + level);
		LOG.setLevel(level);
	}
	return true;
},
'errorlevel (4: system, 3: debug, 2: warning, 1: error)');

l_add('info', 'display current server info [channel, cpu, server, disks, settings]', function (para) {

	switch (para[0]) {
	case 'channel':
		console.log('total subscribers: ' + SR.Comm.count());
		// get a list of channels & get their count
		var list = SR.Comm.list();
		for (var i=0; i < list.length; i++) 
			console.log(list[i] + ': ' + SR.Comm.count(list[i]));
		break;
			
	case 'cpu':
		var info = UTIL.getSystemInfo();	
		console.log(info.cpu_load);
		console.log(info.cpus);
		break;
			
	case 'server':
		var info = SR.Settings.SERVER_INFO;
		console.log(info);
		break;

	case 'disks':
		var info = UTIL.getSystemInfo();
		console.log(info.additional.disks);
		break;
			
	case 'settings':
		console.log(SR.Settings);
		break;
						
	default:
		var info = UTIL.getSystemInfo();	
		console.log(info);	
		break;
	}

	return true;
});

// list all current channels
l_add('ch', 'show all currently subscribed channels', function (para) {
	var list = SR.Comm.list();
	var output = '';
	for (var i=0; i < list.length; i++)
		output += list[i] + ' ';
	
	if (output !== '')
		console.log(output);
	else
		console.log('no channels subscribed');
	return true;
});

// show current server's config
l_add('config', 'show current server\'s config', function (para) {
	switch (para[0]) {
	case 'project':
		console.log(SR.Settings.Project);
		break;
			
	default:
		console.log(SR.Settings);
		break;
	}
	return true;
});

// show a global variable's states
l_add('show', 'show a global variable\'s states', function (para) {
	var name = para[0];
	if (!name)
		console.log(SR.State.list());
	else {
		console.log(SR.State.get(name));
	}
	console.log('\n');
	
	return true;
});

// evaluate an expression at the current server
l_add('eval', 'evaluate an expression at the current server', function (para, raw) {
	console.log('command to execute: ' + raw);

	try {
		eval(raw);
	} catch (e) {
		console.error(e);
	}
	console.log('\n');
	
	return true;
});


/*
l_add('stat', 'display current system stat', function () {

	var net_out = SR.Stat.get('net_out');
	var net_in = SR.Stat.get('net_in');
	
	console.log('network_out: ' + net_out);
	console.log('network_in: ' + net_in);
	
    return true;
});
*/

l_add('help', 'help message', function () {
	// show all help texts and their respective handler names
	for (var name in l_handlers) {
		console.log('  ' + name + '\t\t' + l_handlers[name].desc);
	}
	return true;
});

//-----------------------------------------
// handles keyboard event (including Ctrl-C)
var stdinHandler = function (data) {
	//console.log(data);
	data = data.toString();
	
	var para = data.replace('\n', ' ').split(' ');
	var command = para[0];
	var raw_para = data.replace(command, '');
	
	// remove first element as command
	para.splice(0, 1);
	
	// check if the command is registered
	if (l_handlers.hasOwnProperty(command)) {
		// prevent crashing from executing command
		if (UTIL.safeCall(l_handlers[command].handler, para, raw_para) === false) {
			console.log('  usage: ' + command + ' ' + l_handlers[command].usage);
			return;
		}
	} else
		console.log('type \'help\' for a list of commands');
};

// handle console messages
exports.init = function () {

	LOG.warn('console input handler installed, total commands: ' + Object.keys(l_handlers).length, 'SR.Console');
    
	// nodejs. 0.8.0+
	process.stdin.resume();
	process.stdin.on('data', stdinHandler);
};

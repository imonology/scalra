//
//  owner_switcher.js
//
//	switch process owner/group to regular level
//
//	history:
//		2017-07-05	init
//
// module object
var l_module = exports.module = {};
var l_name = 'Module.owner_switcher';

//-----------------------------------------
// API definitions
//
//-----------------------------------------


//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

SR.Callback.onStart(function () {
	// tasks when server starts
});

SR.Callback.onStop(function () {
	// tasks when server stops
});

// when a client connects
SR.Callback.onConnect(function (conn) {
	// do some config checking & init
});

// when a client disconnects
SR.Callback.onDisconnect(function (conn) {
	// handle disconnect
});

// module init
l_module.start = function (config, onDone) {
	// process config & verify correctness here

	// change processing running user/group to allow icpm to write as user 'imoncloud' (specified in CONFIG.uid)
	if (process.getuid && process.setuid && typeof SR.Settings.Project.process_id === 'object') {
						
		var onOwnerChanged = function () {
		
			try {
				console.log(`Current gid: ${process.getgid()}`, l_name);
				process.setgid(SR.Settings.Project.process_id.gid);
			}
			catch (err) {
				LOG.error(`Failed to set gid: ${err}`, l_name);
			}
		
			try {
				console.log(`Current uid: ${process.getuid()}`, l_name);			
				process.setuid(SR.Settings.Project.process_id.uid);
			}
			catch (err) {
				LOG.error(`Failed to set uid: ${err}`, l_name);
			}
			LOG.warn(`New gid: ${process.getgid()}`, l_name);
			LOG.warn(`New uid: ${process.getuid()}`, l_name);

			UTIL.safeCall(onDone);
		}
		
		var child_process = require('child_process');
		child_process.exec('chown -R ' + SR.Settings.Project.process_id.uid + ' log', {cwd: SR.Settings.PROJECT_PATH}, 
		function (err) {
			child_process.exec('chgrp -R ' + SR.Settings.Project.process_id.gid + ' log', {
				cwd: SR.Settings.PROJECT_PATH
			}, onOwnerChanged);			
		});	
	} else {
		UTIL.safeCall(onDone);
	}
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}

//
//  key_loader.js
//
//	load the key files upon server start, then will switch process owner to regular level
//
//	history:
//		2017-07-05	init
//
// module object
var l_module = exports.module = {};
var l_name = 'Module.key_loader';

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

	// load keys to memory (if any)
	if (typeof SR.Settings.Project.keys === 'object') {
		var keys = SR.Settings.Project.keys;
		LOG.warn('loading keys...', l_name)
		try {
			SR.Keys = {
				privatekey: SR.fs.readFileSync(keys.privatekey),
				certificate: SR.fs.readFileSync(keys.certificate)
			}

			if (keys.ca) {
				SR.Keys.ca = SR.fs.readFileSync(keys.ca)
			}			
		} catch (e) {
			LOG.error(e, l_name);
			SR.Keys = undefined;
		}
	}
	/*
	// change processing running user/group to allow icpm to write as user 'imoncloud' (specified in CONFIG.uid)
	if (process.getuid && process.setuid && typeof SR.Settings.Project.process_id === 'object') {
		try {
			LOG.warn(`Current gid: ${process.getgid()}`, l_name);
			process.setgid(SR.Settings.Project.process_id.gid);
			LOG.warn(`New gid: ${process.getgid()}`, l_name);
		}
		catch (err) {
			LOG.error(`Failed to set gid: ${err}`, l_name);
		}
	
		try {
			LOG.warn(`Current uid: ${process.getuid()}`, l_name);			
			process.setuid(SR.Settings.Project.process_id.uid);
			LOG.warn(`New uid: ${process.getuid()}`, l_name);
		}
		catch (err) {
			LOG.error(`Failed to set uid: ${err}`, l_name);
		}
	}		
	*/
	UTIL.safeCall(onDone);
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}

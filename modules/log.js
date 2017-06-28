//
//  log.js
//
//	module for building and handling LOG files
//
//	history:
//		2017-06-29	extracted from /core/component.js and /core/log_manager.js
//

// module object
var l_module = exports.module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

var l_name = 'SR.Module.log';

SR.Callback.onStart(function () {
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
	var log_name = SR.Settings.SERVER_INFO.name;
	
	if (log_name.match(/[a-z]*$/) && log_name.match(/[a-z]*$/)[0]) {
		log_name = log_name.match(/[0-9a-zA-Z]*$/)[0];
	}			

	//create log name
	// universal ISO format
	//var log_id = new Date().toISOString();
	// use local ISO format
	var log_id = UTIL.localISOString(new Date());
	log_id = log_id.replace(/:/g, '-');

	// build path to log directory
	SR.Settings.LOG_PATH = SR.path.resolve(SR.Settings.PROJECT_PATH, 'log');

	//var fullpath = SR.path.join(path, '..', 'log');
	LOG.warn('set LOG_PATH: ' + SR.Settings.LOG_PATH, l_name);
	
	// ensure path exists (or create directory if not)
	UTIL.validatePath(SR.Settings.LOG_PATH);
	
	// store for later use (useful in notifying monitor)
	SR.Settings.SERVER_INFO.log = log_name + '.' + log_id;

	var debug_file = SR.Settings.SERVER_INFO.log + '.log';
	var error_file = SR.Settings.SERVER_INFO.log + '.err';

	SR.Log.createLog(SR.Settings.LOG_PATH, debug_file,
		function (pID) {

			LOG.setLogHandle(pID);

			SR.Log.createLog(SR.Settings.LOG_PATH, error_file,
				function (id) {
					LOG.setLogHandle(id, 'error'); 
					UTIL.safeCall(onDone);
				},
				function () {
					UTIL.safeCall(onDone);
				}
			);
		},
		onDone
	);	
	
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	// dispose log file
	SR.Log.disposeAllLogs(onDone);	
}


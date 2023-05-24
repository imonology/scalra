/* cSpell:disable */
/* global SR, LOG, UTIL */
/*
//  frontier.js
//
//  common app to init / stop a server with socket handling
//
//  history:
//  2012-04-09  initial version
//  2012-04-22  aere_game_frontier also adopts this class
//  2012-05-10  include connection handling mechanism (conn)
//  2013-09-13  extract out socket server into 'listener'

	functions:

*/

//
// main frontier
//
// ip_port contains ip & port
//
/*
    conn_handler: {
        onConnect: 'function',
        onDisconnect: 'function'
    }

    config: {
        path:           'string',       // path where the frontier is located
        conn_handler:   'object',       // optional connection handler
		handlers:		'array',
		components:		'array',
		modules:		'object'
    }

	a module should be specified in frontier's config in the following way:
	modules: {
		cloud_connector: {server: {IP: 'src.scalra.com', port: 37070},
							 name: 'LocalServer',
							 serial: UTIL.createUUID()}
	}
*/

var l_name = 'SR.Frontier';

exports.icFrontier = function (config) {

	// check for port only config
	if (typeof config === 'number') {
		config = {lobbyPort: config, components: []};
	}

	// default to empty config
	config = config || {components: []};

	LOG.debug('path in SR: ' + __dirname, l_name);

	// reference to still access current object despite going into callbacks
	var that = this;

	// load project settings
	// NOTE: previously we assume that global.g_settings is defined inside the project 'setting.js' file
	// now all settings should belong to SR.Settings
	var setting_file = ((process.argv[2] === undefined || process.argv[2].indexOf('settings') === -1) ? 'settings.js' : process.argv[2]);

	// NOTE: we assume setting file is one level above the frontier directory
	var setting_path = SR.path.join(SR.FRONTIER_PATH, '..', setting_file);

	if (SR.fs.existsSync(setting_path)) {
		LOG.sys('requiring: ' + setting_path, l_name);

		// storing setting path so we may access later (for example, when updating DB config in settings.js)
		// TODO: this needs to be fixed, not a clean approach
		SR.Settings.PATH_SETTINGS = setting_path;
		SR.Settings.Project = require(setting_path).settings;

		// use previous assumption of a global setting variable
		// NOTE: this is obsolete usage and should be discouraged
		if (global.hasOwnProperty('g_settings')) {
			LOG.warn('global variable g_settings exists, use as project settings (NOTE: this is obsolete usage)', l_name);
			SR.Settings.Project = global.g_settings;
		}
	}

	// TODO: should provide better defaults
	if (typeof SR.Settings.Project !== 'object') {
		LOG.warn('project settings not found at \'' + setting_path + '\', use defaults...', l_name);
		SR.Settings.Project = {};
	}

	// set lobby port
	SR.Settings.Project.lobbyPort = config.lobbyPort || SR.Settings.Project.lobbyPort || 37070;

	// override system settings if there are project-specific settings of same names
	for (let key in SR.Settings.Project) {
		if (SR.Settings.hasOwnProperty(key) === false) {
			continue;
		}

		if ((typeof SR.Settings.Project[key] === 'string' && SR.Settings.Project[key] === '')
			|| (typeof SR.Settings.Project[key] === 'object' && Object.keys(SR.Settings.Project[key]).length === 0)) {
			continue;
		}

		// augmnet the setting if it's an object, replace directly for strings
		if (typeof SR.Settings.Project[key] === 'string') {
			SR.Settings[key] = SR.Settings.Project[key];
		} else {
			for (var setting_key in SR.Settings.Project[key]) {
				SR.Settings[key][setting_key] = SR.Settings.Project[key][setting_key];
			}
		}
	}

	// override system & project-specific settings with command line settings
	var argv = require('minimist')(process.argv.slice(2));
	//console.dir(argv);
	for (let key in argv) {
		if (key === '_' || SR.Settings.hasOwnProperty(key) === false) {continue;}
		LOG.warn('[' + key + ']: ' + argv[key], l_name);
		SR.Settings[key] = argv[key];
	}

	// set unique ID for this frontier
	this.id = UTIL.createUUID();

	var l_frontierName = undefined;

	// build module path from a root path
	var l_buildModulePath = function (root_path, default_prefix) {
		var arr = SR.Settings.SR_PATH.split(SR.path.sep);
		var prefix = arr[arr.length-1] + '-';
		var dirs = UTIL.getDirectoriesSync(root_path);
		//LOG.warn('root_path: ' + root_path, l_name);
		//LOG.warn(dirs, l_name);

		if (default_prefix) {prefix = default_prefix;}

		//LOG.warn('default_prefix: ' + default_prefix + ' prefix: ' + prefix + ' paths to check:', l_name);
		for (var i in dirs) {
			//LOG.warn(dirs[i]);
			if (dirs[i].startsWith(prefix)) {
				SR.Settings.MOD_PATHS.push(SR.path.join(root_path, dirs[i]));
			}
		}
	};

	// determine proper server info
	// lobby_port_opened: true/false
	var l_createServerInfo = function () {

		// extract frontier name from path, avoid unusable characters
		var words = SR.Settings.FRONTIER_PATH.replace(':', ']').split(SR.path.sep);

		//LOG.debug('path split:', l_name);
		//LOG.debug(words, l_name);

		var owner   = words[words.length-3];
		var project = words[words.length-2];
		var name    = words[words.length-1];

		// get one level deeper for scalra system servers (monitor, entry...)
		if (owner === 'scalra' && (name === 'monitor' || name === 'entry')) {
			owner = words[words.length-4];
			project = words[words.length-3];
		}

		LOG.warn('extracting server info from path... \n[owner]:  ' + owner + '\n[project]: ' + project + '\n[name]:  ' + name, l_name);

		// store as server_info
		SR.Settings.SERVER_INFO = {
			id:			that.id,
			owner:		owner,
			project:	project,
			name:		name
		};

		// we use type as name
		// NOTE: this will be the default DB name used by this frontier as well
		l_frontierName = (owner + '-' + project + '-' + name);

		// determine server type
		if (project === 'scalra') {
			// for monitor or entry servers
			// NOTE: we take only the name before the first '.' as type
			SR.Settings.SERVER_INFO.type = name.split('.')[0];
		} else if (name === 'lobby' && process.argv[2] !== 'app') {	// for 'lobby' or 'app'
			SR.Settings.SERVER_INFO.type = 'lobby';
		} else {
			SR.Settings.SERVER_INFO.type = 'app';
		}

		LOG.warn('server: ' + l_frontierName + ' type: ' + SR.Settings.SERVER_INFO.type, l_name);
	};

	// store frontier path
	SR.Settings.FRONTIER_PATH = SR.FRONTIER_PATH;

	// store path to project's base directory
	SR.Settings.PROJECT_PATH = SR.path.resolve(SR.FRONTIER_PATH, '..');

	l_createServerInfo();

	// TODO: remove this if possible/
	// right now is used by SR.Component
	SR.Settings.FRONTIER = this;
	SR.Settings.SR_PATH = SR.path.resolve(__dirname, '..');
	LOG.warn('set SR.Settings.FRONTIER_PATH to: ' + SR.Settings.FRONTIER_PATH, l_name);
	LOG.warn('set SR.Settings.PROJECT_PATH to: ' + SR.Settings.PROJECT_PATH, l_name);
	LOG.warn('set SR.Settings.SR_PATH to: ' + SR.Settings.SR_PATH, l_name);

	// store paths to modules
	SR.Settings.MOD_PATHS = [];

	var root_path = SR.path.join(SR.Settings.SR_PATH, '..');
	var project_module_path = SR.path.join(SR.Settings.PROJECT_PATH, 'node_modules');

	// NOTE: we give priority for project modules before others
	l_buildModulePath(project_module_path, 'scalra');
	l_buildModulePath(root_path);

	// we search for modules one-level deeper
	// NOTE: appears to be not necessary now
	//l_buildModulePath(SR.path.join(root_path, '..'), 'scalra');

	// add project's 'modules' directory to it
	SR.Settings.MOD_PATHS.push(SR.path.join(SR.Settings.FRONTIER_PATH, '..'));

	LOG.debug('module paths:', l_name);
	LOG.debug(SR.Settings.MOD_PATHS, l_name);

	//
	// local variables
	//

	// flag to indicate shutdown
	var l_shutting_down = false;

	// flag to indicate if server is ready
	var l_ready = false;

	//
	// public functions
	//

	// get connection handler
	this.getConnectionHandler = function () {
		LOG.error('getConnectionHandler: this method is obsolete, please remove its usage..', l_name);
		LOG.stack();

		var server = SR.Call('socketserver.get');
		return (server ? server.getConnectionHandler() : undefined);
	};

	// get frontier's name
	this.getName = function () {
		return l_frontierName;
	};

	// enable logging
	//var stepLog = SR.Component.Log(SR.Settings.FRONTIER_PATH, SR.Settings.SERVER_INFO.name);

	// init necessary data for server execution
	this.init = function (onDone) {

		// actually execute the steps
		SR.Module.start(() => {

			// call other registered callbacks upon server start
			LOG.warn('calling all onStart functions...', l_name);
			SR.Callback.notify('onStart');
			UTIL.safeCall(onDone);
		});
	};

	//-----------------------------------------
	// shutdown all connected sockets (clients)
	// NOTE: this can also be called from outside via 'dispose' method
	var l_dispose = this.dispose = function (onDone) {

		LOG.warn('trigger dispose (close all sockets and shutdown)...', l_name);

		// if we're already shutting down (e.g., Ctrl-C is pressed again)
		// then perform force shutdown
		if (l_shutting_down === true) {
			LOG.warn('already shutting down, force close-down in 3 seconds', l_name);
			setTimeout(() => {
				process.exit();
			}, 3000);
			return;
		}

		l_shutting_down = true;

		// let app-level stop steps be executed
		SR.Callback.notify('onStop');

		SR.Module.stop(() => {
			UTIL.safeCall(onDone);
			process.exit();
		});
	};

	// check whether server is successfully created
	this.isServerReady = function () {
		return l_ready;
	};

	// get ip & port info for this frontier
	this.getHostAddress = function () {
		return SR.Settings.SERVER_INFO;
	};

	// get ip & port info for this frontier
	this.setHostAddress = function (addr) {
		LOG.error('setHostAddress: this method is obsolete, please remove its usage..', l_name);
		LOG.stack();
		//ip_port = addr;
	};


	//
	// steps to init/dispose
	//

	SR.Module.load('log', config);
	SR.Module.load('key_loader', config);
	SR.Module.load('socketserver', config);

	//SR.Module.addStep(stepLog);

	// load application handlers
	if (config.handlers) {
		LOG.warn('load handlers specified in config, size: ' + config.handlers.length, l_name);

		// add handlers, if available
		for (let i=0; i < config.handlers.length; i++) {SR.Handler.addByFile(config.handlers[i], SR.Settings.FRONTIER_PATH);}
	}

	// NOTE: this has to be loaded here (cannot load in initServer, because Log needs to be init before initServer)
	// TODO: change this...

	// load default components
	SR.Module.addStep(SR.Component.REST());
	SR.Module.addStep(SR.Component.SockJS());

	// determine if we should load AppManager or AppConnector components depending on server type
	if (SR.Settings.ENABLE_CLUSTER_MODE) {
		if (SR.Settings.SERVER_INFO.type === 'lobby') {SR.Module.addStep(SR.Component.AppManager());} else if (SR.Settings.SERVER_INFO.type === 'app') {SR.Module.addStep(SR.Component.AppConnector());}
	} else {
		// force this server as a standalone 'lobby' (for single-file servers)
		SR.Settings.SERVER_INFO.type = 'lobby';
	}

	// add components, if available
	if (config.components && config.components instanceof Array) {
		LOG.warn('loading components from Frontier config...', l_name);
		for (let i = 0; i < config.components.length; i++) {
			// usage of user-specified AppManager or AppConnector is obsolete
			// ignore & provide warning
			if (config.components[i].name === 'AppManager') {
				LOG.warn(
					'AppManager is now auto-loaded, please remove it from config.components',
					l_name
				);
				continue;
			}
			if (config.components[i].name === 'AppConnector') {
				LOG.warn(
					'AppConnector is now auto-loaded, please remove it from config.components',
					l_name
				);
				continue;
			}
			if (config.components[i].name === 'REST-HTTP') {
				LOG.warn(
					'REST (HTTP) is now auto-loaded, please remove it from config.components',
					l_name
				);
				continue;
			}
			if (config.components[i].name === 'SockJS-HTTP') {
				LOG.warn(
					'SockJS (HTTP) is now auto-loaded, please remove it from config.components',
					l_name
				);
				continue;
			}

			SR.Module.addStep(config.components[i]);
		}
	}

	// add modules, if available
	// NOTE: config.modules contains module 'name' and 'config' ONLY
	if (config.modules) {
		for (var name in config.modules) {
			SR.Module.load(name, config.modules[name]);
		}
	}

	// load default modules
	SR.Module.load('system', config);
	SR.Module.load('account', config);
	//SR.Module.load('gmail', config);

	// load monitor-related functions if specified
	if (SR.Settings.CONNECT_MONITOR_ONSTART) {
		SR.Module.load('reporting', config);
	}

	// change process / group id in the end (if another identity is desired for server execution)
	SR.Module.load('owner_switcher', config);

}; // end icFrontier

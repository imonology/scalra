
//
// settings.js
//
// global definitions of common settings
// 2012-07-02 initial version 
// 2013-07-25 add all src/dev/test/prod settings
// 2014-01-13 add version number starting from 0.0.4.1
// 2014-02-20 move version to global.js
// 2014-07-24 extract local-specific settings to ../config.js

//-----------------------------------------
// define global variables
//
//-----------------------------------------
var merge = require('merge'), original, cloned;
var local_config = require('./config.js').config;

// default settings
var settings = exports.settings = { 
	
	// mode can be 'dev', 'prod'
	MODE: 'prod',
	
	// IP & Domainname for Lobby
	IP_LOBBY	: '127.0.0.1',
	DOMAIN_LOBBY	: 'localhost',

	// 
	// DB
	// 
	DB_IP		: '127.0.0.1',
	DB_PORT		: 27017,
	DB_ADMIN	: {account: '', pass: ''},
	
	// default to show error & warning only
	LOG_LEVEL	: 2,
	
	// Internal DB collection name
	DB_NAME_STAT		: '__stat',
	DB_NAME_SYSTEM		: '__system',
	DB_NAME_ACCOUNT		: '__account',
	DB_NAME_PAYMENT		: '__payment',
	DB_NAME_SYNC		: '__sync',
	DB_NAME_SYS_EVENT	: '__sysevent',
	
	//
	// monitor setting
	//
	//~ IP_MONITOR           : local_config.IP_MONITOR || local_config.IP_LOBBY,
	PORT_MONITOR         : 37000,
	PORT_EDITOR          : 443,
	PORT_PROJECTS        : 37030,
	PORT_APP_RANGE_START : 40000,				// start of the assigned port range for monitor
	PORT_APP_RANGE_END   : 41000,				// end of assigned port range for monitor
	PORT_RESERVED_SIZE   : 10,				// how many ports should a server reserve for itself
	EMAIL_ADMIN          : '',				// default to none, but may be override for different server types

	// interval to report app server stat to monitor server
	INTERVAL_STAT_REPORT : 5000,
	
	// interval to remove non-reporting (i.e., dead) servers from monitor's live server list
	INTERVAL_LIVENESS_CHECK : 1000,
	
	// port increment for various servers
	// NOTE: PORT_INC_APP_MANAGER may be hard-coded by client's net layer
	// TODO: need to fix this to make it more flexible
	PORT_INC_HTTP		: 0,
	PORT_INC_HTTPS		: 1,
	PORT_INC_WEBSOCKET	: 2,
	PORT_INC_SOCKETIO	: 2,
	PORT_INC_SOCKET		: 3,
	PORT_INC_APP_MANAGER	: 4,
	PORT_INC_LOG		: 5,
	PORT_INC_STREAM_IN	: 6,
	PORT_INC_STREAM_OUT	: 7,
	PORT_INC_EXPRESS	: 8,

	//
	//	entry server settings
	//
	PORT_ENTRY		: 8080,
	PORT_ENTRY_ACTUAL	: 8080,		// actual entry server port started

	//
	// G-Entry settings
	//

	IP_G_ENTRY		: '127.0.0.1',

	// port to listen for S-entry connections
	PORT_G_ENTRY_PRIVATE	: 31000,

	// port to answer external proxy queries from clients
	PORT_G_ENTRY_PUBLSR	: 30000,

	
	//
	// S-entry settings
	//
	// NOTE: needs to specify Sproxy IP as otherwise will need to parse 'ipconfig' result
	//~ IP_S_ENTRY		: local_config.IP_LOBBY,
	
	// range of ports available to S-entry
	S_ENTRY_PORTRANGE	: 999,

	// default port of S-entry
	PORT_S_ENTRY		: 30001,        
	
	// # of seconds considered as TCP timeout         
	TIMEOUT_TCP		: 30,       
	
	// # of seconds to send G-entry send stat    
	TIMEOUT_REPORT		: 5,

	//
	// Settings
	//
	
	// whether to shutdown app servers if their lobby dies (default to false)
	// TODO: consider to turn this in 'true' in some environments?
	APPSERVER_AUTOSHUT	: false,
	
	// whether to display text stream in HTML format (for server execution log display)
	REFORMAT_HTML_TEXT	: false,
	
	// default encryption type for user passwords
	ENCRYPT_TYPES		: ['sha512'],
	
	// # of seconds to reload a modified script
	TIMEOUT_RELOAD_SCRIPT	: 1,
	
	// # of milliseconds before an event is considered timeout
	//TIMEOUT_EXECUTE		: 10000,
	
	// millisecond limit before an incoming client event is considered timeout (combined with TIMEOUT_EXECUTE?)
	TIMEOUT_EVENTHANDLE	: 10000,
	
	// # of milliseconds before an app server re-try to connect to AppManager
	TIMEOUT_RECONNECT	: 5000,
	
	// # of seconds before removing an unused channel in pub/sub
	TIMEOUT_UNUSED_CHANNEL_REMOVAL:	300,
	
	// # of seconds to backup to DB (used in SR.Sync)
	TIMEOUT_SYNC_PERIOD:	5,
	
	// whether to warn against socket policy server not started at port 843
	WARN_SOCKET_POLSRY_SERVER : false,
	
	// how long a string to output when showing packets sent by server
	LENGTH_OUTMSG : 250,
	
	// list of event types excluded from showing in debug messages 
	HIDDEN_EVENT_TYPES : {'SR_PUBLISH' : true},
	
	// automatically connect to localhost monitor server for clustering and liveness check
	CONNECT_MONITOR_ONSTART:	false,
	
	// whether to enable app/lobby mode (default to false)
	ENABLE_CLUSTER_MODE:		false,
	
	// 
	// email server config
	//
	EMAIL_CONFIG: {
		user		: "",
		password	: "",
		host		: "smtp.gmail.com",
		ssl		: true
	},

	//
	// web server config (TODO: move elsewhere?)
	//
	DEFAULT_FILES: ['index.htm', 'index.html', 'default.htm', 'default.html'],
};


// OS Specific
console.log("process.platform: " + process.platform);
settings.SLASH = SR.path.sep;

//if (process.platform === 'linux') {
//	settings.SLASH = '/';
//} else if (process.platform === 'win32') {
//	settings.SLASH = '\\';
//} else if (process.platform === 'darwin') {
//	settings.SLASH = '/';
//} else {
//	console.log('Unknown or incompatible OS. Currently support: linux, win32, darwin');
//	process.exit(99);
//}

// merge system default (should not change easily) with local config (may be machine-specific)
// NOTE: this needs to happen before the following environment-specific defaults are applied
// otherwise settings.MODE may be incorrect
settings = merge(settings, local_config);

//
// Environment-specific settings
//

//console.log("settings.MODE: " + settings.MODE);
if (settings.MODE === 'dev') {
	settings.SAFE_CALL				= false;
	settings.NOTIFY_SERVER_DOWN		= false;
	settings.NOTIFY_SCRIPT_RELOAD	= false;
	settings.LOG_LEVEL = 4;
}
else if (settings.MODE === 'prod') {
	settings.SAFE_CALL				= true;
	settings.NOTIFY_SERVER_DOWN		= true;
	settings.NOTIFY_SCRIPT_RELOAD	= true;
	settings.LOG_LEVEL 				= 2;
};

settings.IP_MONITOR	= settings.IP_MONITOR || settings.IP_LOBBY;
settings.IP_S_ENTRY	= settings.IP_S_ENTRY || settings.IP_LOBBY;

// Module-specific settings
// TODO: should move this elsewhere?
//settings.PHP_BASE		= 'http://' + settings.DOMAIN_LOBBY + '/';


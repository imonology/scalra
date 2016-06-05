//
// global.js
//
// global definitions of common variables and helper functions
//

// Scalra version number
var SR_version = '1.0.0';
var NODE_version = '4.4.3 (LTS)';

//-----------------------------------------
// define global variables
//
//-----------------------------------------

var BASE_DIR   = __dirname + '/./';
var CORE_DIR   = BASE_DIR + './core/';
var EXT_DIR    = BASE_DIR + './extension/';
var VAST_DIR   = EXT_DIR + 'VAST/';

//
// define message formats
//

//
// define apps
//

global.SR = {};

SR.Tags = {
	EVENT:			'E',
	UPDATE:			'U',
	PARA:			'P',
	GREEN:			'\033[32m',
	RED:			'\033[31m',
	WHITE:			'\033[m',
	YELLOW:			'\033[33m',
	RES_ERROR:		'SR_ERROR'		// update name for error responses	
}

SR.Tags.ERR =		SR.Tags.RED;
SR.Tags.ERREND =	SR.Tags.WHITE;
SR.Tags.END =		SR.Tags.WHITE;
SR.Tags.WARN =   	SR.Tags.YELLOW;
SR.Tags.RCV =    	SR.Tags.GREEN + '[RCV] ';
SR.Tags.SND =    	SR.Tags.GREEN + '[SND] ';

SR.version = 				SR_version;
SR.Settings =               require(BASE_DIR + 'settings').settings;
//SR.systemPath = __dirname;

// wrappers to node.js modules
SR.net =                    require('net'); 
SR.sys =                    require('util');
SR.assert =                 require('assert');
SR.fs =                     require('fs');
SR.path = 					require('path');
SR.http = 					require('http');
SR.https = 					require('https');
SR.mongo =                  require('mongodb'); // node_modules old version

SR._kit =                   require(CORE_DIR + '_basekit');
SR._uuid =                  require(CORE_DIR + 'uuid');

// basic tools
SR.Callback =               require(CORE_DIR + 'callback');

// in-memory state access (may be needed by other classes)
SR.State =                  require(CORE_DIR + 'state');

// objects
//SR.Queue =                  require(CORE_DIR + 'queue').Queue;	
SR.AdvQueue =               require(CORE_DIR + 'queue').icQueue;

// the following relies on SR.AdvQueue 
SR.Log =                    require(CORE_DIR + 'log_manager');
global.LOG = new SR.Log.logger();
global.UTIL = SR.Utility = require(CORE_DIR + 'utility');

SR.File =                   require(CORE_DIR + 'file').icFile;  
SR.AppConn =                require(CORE_DIR + 'app_conn');

// APIs
SR.AppConnector =           require(CORE_DIR + 'app_connector');
SR.AppManager =             require(CORE_DIR + 'app_manager');
SR.Component =              require(CORE_DIR + 'component');
SR.Module = 				require(CORE_DIR + 'module');
SR.Comm =                   require(CORE_DIR + 'comm');
SR.Conn =                   require(CORE_DIR + 'conn');
SR.Console =                require(CORE_DIR + 'console');
SR.Execute =                require(CORE_DIR + 'execute');
SR.Handler =                require(CORE_DIR + 'handler');
SR.JobQueue =               require(CORE_DIR + 'job_queue');
SR.Require =                require(CORE_DIR + 'require');
SR.RPC =                    require(CORE_DIR + 'RPC');
SR.Script =                 require(CORE_DIR + 'script');
SR.Standalone =             require(CORE_DIR + 'standalone.js');
SR.Storage =                require(CORE_DIR + 'storage');
//SR.DHT = 					require(CORE_DIR + 'DHT');
SR.REST =                   require(CORE_DIR + 'REST/REST');
SR.REST.Handler =           require(CORE_DIR + 'REST/handler');
SR.Event = 					require('events').EventEmitter;

// following needs SR.mongo to be defined
SR._storage =               require(CORE_DIR + '_storage');
SR.Load = 					require(CORE_DIR + 'load');
SR.DB =                     require(CORE_DIR + 'DB');
SR.ORM =                    require(CORE_DIR + 'ORM');
SR.DS =                     require(CORE_DIR + 'datastore');
SR.Schedule =               require(CORE_DIR + 'schedule'); // depend on SR.DB

// the following relies on SR.AdvQueue & SR.Handler to init
SR.EventManager =           require(CORE_DIR + 'event_manager');

// following needs SR.Conn
SR.Socket =                 require(CORE_DIR + 'socket').icSocket;
SR.Listener =               require(CORE_DIR + 'listener').icListener;
SR.Connector =              require(CORE_DIR + 'connector').icConnector;
SR.Frontier =               require(CORE_DIR + 'frontier').icFrontier;

// generic API interface
SR.API = 					require(CORE_DIR + 'API');

// extensions 
// objects
SR.MsgQueue =               require(EXT_DIR + 'msgqueue').icMsgQueue;
SR.Stream =                 require(EXT_DIR + 'stream').icStream;

// API
SR.Location =               require(EXT_DIR    + 'location');
SR.SocketIO =               require(EXT_DIR    + 'socketio');
SR.SockJS =                 require(EXT_DIR    + 'sockjs');
SR.Notify =                   require(EXT_DIR    + 'notify');
SR.Stat = 					require(EXT_DIR    + 'stat');
SR.StreamManager =          require(EXT_DIR    + 'stream');
SR.Sync = 					require(EXT_DIR    + 'sync');
SR.Proxy = 					require(EXT_DIR    + 'proxy');
SR.User =                   require(EXT_DIR    + 'user');
//SR.NotificationHub =                   require(EXT_DIR    + 'notification_hub');



//
// define flags & settings
//

// how deep recursive ticks can be (default to 1000)
// see =  https = //github.com/LearnBoost/monk/issues/33
process.maxTickDepth = 1000000;
// NOTE =  this will limit how big a cursor item can perform toArray(), if # of items returned by cursor in
// DB query exceeds this depth, then recursive process.nextTick() will happen


console.log(SR.Tags.YELLOW + 'Scalra ' + SR_version + ' (Node.js ' + NODE_version + ' required)' + SR.Tags.WHITE);

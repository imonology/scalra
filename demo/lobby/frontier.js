//
//  frontier.js
//
//  code for main lobby server (basic demo for Scalra's functions)
//

// Scalra allows specifying a particular version number, for example:
//require('scalra')('0.2.2');
require('scalra')('dev');

// show debug / warning / error messages
LOG.setLevel(3);

// show non-categorized messages
LOG.show('all');
LOG.track('all');


//-----------------------------------------
// define local variables
//
//-----------------------------------------

SR.Console.add('t', 'show current time', function (para) {
	var curr = new Date();
	LOG.warn(curr);
	LOG.debug(curr.toLocaleString(), '');	
}, 
'');

// a list of names for all collections to be created
var collections =  ['test_db'];

var config = {
    path:               __dirname,
	//console:			false,				// turn off console if you don't want it
    handlers: [
        {file: 'handler.js'},
		{file: 'login.js', owner: 'SR'},
		{file: 'system.js', owner: 'SR'},
		{file: 'log.js', owner: 'SR'},
		{file: 'example/DB_file.js'},
		{file: 'example/cloud_server.js'},
		{file: 'example/verify_email.js'},
		{file: 'example/version_checking.js'},
		{file: 'example/user_roles.js'},
		{file: 'example/shared_states.js'},
		{file: 'example/LOG.js'},
		{file: 'example/upload.js'},
		{file: 'example/API.js'},
		{file: 'example/chat.js'},
		//{file: 'example/DHT.js'},
    ],
	// TODO: init core SR functions without using components		
    components: [
		//SR.Component.REST(),                    // start a HTTP server,
		//SR.Component.REST('HTTPS'),             // start a HTTPS server,
		//SR.Component.SockJS(),					// start a sockjs HTTP server
		//SR.Component.SockJS('HTTPS'),			// start a sockjs HTTPS server
		//SR.Component.SocketIO(),					// start a socketio HTTP server
		//SR.Component.SocketIO('HTTPS'),			// start a socketio HTTPS server		
    ],
	modules: {
		// disable DB usage by default, uncomment if DB (currently MongoDB) is installed
		'DB': {collections: collections, shutdown_if_fail: true},
		'chat': {limit: 1000, backup: true},
		'pubsub': {},
		'express': {router: 'router.js'},
		'flexform': {},	
		'swagger': {}
	}
};

// TODO: wish-list (to init a SR function without using Frontier)
//SR.Module.init('DB', {collections: collections, shutdown_if_fail: true}, onDone);

// create frontier
var l_frontier = new SR.Frontier(config);
                           
// execute all the steps for running a server
l_frontier.init();

SR.Callback.onConnect(function (conn) {
	LOG.warn('onConnect called');		
	LOG.warn(conn);
});
		
SR.Callback.onDisconnect(function (conn) {
	LOG.warn('onDisconnect called');
	LOG.warn(conn);
});

SR.Callback.onCrash(function (onDone) {
	LOG.warn('onCrash called');
}, 3000);

SR.Callback.onStart(function () {
	LOG.warn('server info:');
	LOG.warn(SR.Settings.SERVER_INFO);
});

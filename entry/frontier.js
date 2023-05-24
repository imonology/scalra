/* global SR, LOG, UTIL */

//
//  frontier.js
//
//  main lobby server
//

require('scalra')('dev');

LOG.show('all');
LOG.setLevel(3);

//-----------------------------------------
// define local variables
//
//-----------------------------------------

// a list of names for all collections to be created
var collections =  ['log'];

SR.Callback.onStart(() => {
	// callback when lobby is started
	LOG.warn('entry server started successfully', 'Entry');
	LOG.warn(SR.Settings.SERVER_INFO);
});

function startServer (base_port) {

	// store actual port used to start entry server
	LOG.warn('base_port received: ' + base_port, 'Entry');
	SR.Settings.PORT_ENTRY_ACTUAL = base_port;

	// NOTE: handlers' name will become a global variable
	var config = {
		path:               __dirname,
		handlers: [
			{file: 'handler.js', name: 'g_handler'}
		],
		components: [
			SR.Component.DB(collections),             // init DB
			SR.Component.REST('HTTP', ['REST_handle.js'], base_port),    	// start a HTTP entry server
			//SR.Component.REST('HTTPS', ['REST_handle.js'], base_port + 1)    // start a HTTPS entry server
		]
	};

	// create frontier
	var l_frontier = new SR.Frontier(config);

	// execute all the steps for running a server
	l_frontier.init();
}

// check if port is open, if not then query for new port
UTIL.isPortOpen(SR.Settings.PORT_ENTRY, (is_open) => {

	if (is_open) {
		return startServer(SR.Settings.PORT_ENTRY);
	}

	// otherwise get a local port for the entry server
	// NOTE: we get two ports for HTTP & HTTPS
	UTIL.getLocalPort((port) => {
		LOG.warn('get assigned entry port from monitor: ' + port, 'Entry');
		startServer(port);
	});
});

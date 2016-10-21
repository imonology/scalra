//
//  frontier.js
//
//  main lobby server
//

require('scalra')('dev');

// show debug / warning / error messages
LOG.setLevel(2);
LOG.show('all');

var l_name = 'Monitor';

//-----------------------------------------
// define local variables
//
//-----------------------------------------

// a list of names for all collections to be created
var collections =  ['log'];

var config = {
    path:               __dirname,
    handlers: [
		{file: 'log.js', owner: 'SR'}
    ],
    components: [
        //SR.Component.REST('HTTP', ['REST_handle.js']),      // start a HTTP server
		//SR.Component.REST('HTTPS', ['REST_handle.js']),     // start a HTTPs server
    ],
	modules: {
		'reporting': {}
	}
};

// create frontier
var l_frontier = new SR.Frontier(config);
		
// set custom REST handlers
SR.REST.addHandler('REST_handle.js');

//
// define API
//

// API to get system paths
SR.API.add('_SYS_PATH', {
	type:	'string'
}, function (args, onDone) {
	switch (args.type) {
		case 'demo': {
			var path = SR.path.resolve(SR.Settings.SR_PATH, 'demo');
			return onDone(null, path);
		}
		default: {
			// check if the requested path exists in settings
			if (SR.Settings.hasOwnProperty(args.type)) {
				return onDone(null, SR.Settings[args.type]);	
			}
			return onDone('unknown type [' + args.type + ']');
		}
	}
});

// API to set system paths
SR.API.add('_SET_SYS_PATH', {
	type:	'string',
	path:	'string'
}, function (args, onDone) {
	
	if (SR.Settings.hasOwnProperty(args.type) === true) {
		return onDone('[' + args.type + '] already set');
	}
	SR.Settings[args.type] = args.path;
	l_buildPaths();
	onDone(null);
});

var l_buildPaths = function () {
	
	// (re-)build path settings
	if (SR.Settings.PATH_USERBASE) {
		SR.Settings.PATH_LIB = SR.path.join(SR.Settings.PATH_USERBASE, 'lib');	
	}	
}

// execute all the steps for running a server
l_frontier.init(function () {
		
    // callback when lobby is started
    LOG.warn('monitor started successfully', l_name);
});

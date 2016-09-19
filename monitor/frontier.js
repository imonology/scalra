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

// execute all the steps for running a server
l_frontier.init(function () {
    // callback when lobby is started
    LOG.warn('monitor started successfully', l_name);
});

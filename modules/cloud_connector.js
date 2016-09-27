/*
	cloud_connector.js (designed as module)

	a Communication Channel between Local and Cloud server	

	functions
		init(ip_port, register_name, serial)
		dispose(onDone)

*/

// module object
var l_module = {};

const l_timeoutConnectRetry = 3000;

// init connection to cloud server
var l_connector = undefined;

var l_config = {
	onConnect: function () {
		LOG.warn('Cloud Server connected');
	},
	onDisconnect: function () {
		LOG.warn('Cloud Server disconnected'); 
		// re-init connection
		LOG.warn('attempt to re-connect in: ' + l_timeoutConnectRetry + 'ms');
		setTimeout(l_connect, l_timeoutConnectRetry);
	}
};

var l_para = undefined; 
var l_ip_port = undefined;

// connect to cloud server
var l_connect = function () {

	if (l_ip_port === undefined) {
		LOG.warn('not init (or already disposed), cannot connect to server');
		return;
	}

	if (l_connector === undefined)    
		l_connector = new SR.Connector(l_config);

    // establish connection
	LOG.warn('connecting to: ' + l_ip_port);
	l_connector.connect(l_ip_port, function (err, socket) {
		
		if (err) {
			// try-again later
			LOG.warn('attempt to re-connect in: ' + l_timeoutConnectRetry + 'ms');
			setTimeout(l_connect, l_timeoutConnectRetry);
			return;
		}
				
		LOG.warn('connection to: ' + socket.host + ':' + socket.port + ' established');
        l_connector.send('SR_REGISTER_SERVER', l_para, 'SR_REGISTER_SERVER_R', function (res) {
            console.log(res.data);
        });
	});    
}

// initiate connection to cloud server
l_module.start = function (config, onDone) {
    
	LOG.warn('module starting...config: ');
	LOG.warn(config);
	
	var ip_port = config.server;
	var register_name = config.name;
	var serial = config.serial;
	
	LOG.warn('serial: ' + serial);
	
	// prepare register parameters
	l_para = {name: register_name, info: SR.Settings.SERVER_INFO, serial: serial};
	
	// store IP-port
	l_ip_port = ip_port;
	
	// register my own server info locally
	SR.RPC.registerLocal(l_para);
	
	// init connection to cloud server
	l_connect();
	
	UTIL.safeCall(onDone);
}

// stop / shutdown cloud connection
l_module.stop = function (onDone) {

	// clean ip_port info
	l_ip_port = undefined;

	// disconnect from cloud
	if (l_connector) {
		l_connector.dispose(function () {
			l_connector = undefined;	
			UTIL.safeCall(onDone);
		});	
	}
}

LOG.warn('cloud_connecotr called', 'SR.Module');

// register this module
SR.Module.add('cloud_connector', l_module);

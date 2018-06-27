//
//	Common script for using Scalra
//
// global variables that may affect init:
//	connectType:	'string'		(options: 'http' 'sockjs' 'socketio')
//	connectHost:	'string'		(example: 'dev.imoncloud.com')
//	securedConn:	'boolean'		(example: true/false)
//	basePort:		'number'		(example: 8080)
//

function addScriptJs (js_file) {
	
	// see if it's secured connection
	var secured = false;
	if (typeof securedConn !== 'undefined' && securedConn === true)
		secured = true;
	
	// build url if optional parameters exist (to allow remote access of scalra.js still works)
	var url_head = '';
	if (typeof connectHost === 'string') {
		url_head = (secured ? 'https' : 'http') + '://' + connectHost;
		if (typeof basePort === 'number') {
			url_head += (':' + (secured ? basePort+1 : basePort));	
		}
	}	
	var fullpath = url_head + js_file;
	console.log('fullpath to add js: ' + fullpath);
	
	document.write('<script type="text/javascript" src="' + fullpath + '"></script>');
}

addScriptJs("/lib/sockjs/sockjs.min.js");
addScriptJs("/lib/SR_REST.js");
addScriptJs("/web/config.js");
//addScriptJs("/lib/SR_Video.js");

// perform action only after page is loaded
document.addEventListener ("DOMContentLoaded", function () {
	console.log('document.location:');
	console.log(document.location);
	var onConnected = undefined;

	console.log('checking SR.onConnect: ' + typeof SR.onConnect);	
	if (typeof SR.onConnect === 'function') {
		onConnected = SR.onConnect;
	}
	else if (typeof onConnect === 'function')
		onConnected = onConnect;
	else
		onConnected = (function () {console.log('server connected')});
	
	var onSocketEvent = (typeof onSocketEvent === 'function' ? onSocketEvent : undefined);
	var type = (typeof connectType === 'string' ? connectType : 'http');
	var host = (typeof connectHost === 'string' ? connectHost : document.location.hostname);
	// FIXME:
	const location_host = document.location.host.split(':');
	let port = parseInt(location_host[location_host.length - 1]) - 8;
	if (typeof(basePort) !== 'number') {
		basePort = port;
	}
	// var port = (typeof basePort === 'number' ? basePort : document.location.host.split(':'));
	
	console.log('connectType: ' + type);
	console.log('connectHost: ' + host);
	console.log('basePort: ' + basePort);
		
	SR.init({
		hostname:	host,
		port: 		basePort,
		type:		type,			// can be 'sockjs' 'socketio' 'http'
		onEvent:	onSocketEvent,
		onDone:		onConnected
	});
});

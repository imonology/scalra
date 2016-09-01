//
//	Common script for using Scalra
//
// global variables that may affect init:
//	connectType:	'string'		(options: 'http' 'sockjs' 'socketio')
//	basePort:		'number'
//


function addScriptJs (js_file) {
	document.write('<script type="text/javascript" src="' + js_file + '"></script>');
}

// make sure jQuery is here ?
//if (!window.jQuery)
//{
//	addScriptJs("/lib/kurento_tools/jquery/dist/jquery.min.js");
//}

//addScriptJs("config.js");
addScriptJs("/lib/sockjs/sockjs.min.js");
addScriptJs("/lib/SR_REST.js");
addScriptJs("/web/config.js");
//addScriptJs("/lib/SR_Video.js");

// perform action only after page is loaded
document.addEventListener ("DOMContentLoaded", function () {

	var onConnected = (typeof onConnect === 'function' ? onConnect : function () {console.log('server connected'); });
	var onSocketEvent = (typeof onSocketEvent === 'function' ? onSocketEvent : undefined);
	var type = (typeof connectType === 'string' ? connectType : 'http');
	
	console.log('connectType: ' + type);
	
	SR.init({
		port: 		basePort,
		type:		type,			// can be 'sockjs' 'socketio' 'http'
		onEvent:	onSocketEvent,
		onDone:		onConnected
	});	
});

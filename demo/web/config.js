
// set base port
var base_port = 37070;
var mode = 'dev';

// perform action only after page is loaded
document.addEventListener ("DOMContentLoaded", function () {

	var onConnected = (typeof onConnect === 'function' ? onConnect : function () {console.log('server connected'); });
	var onSocketEvent = (typeof onSocketEvent === 'function' ? onSocketEvent : undefined);
		
	SR.init({
		port: 		base_port,
		type:		'sockjs',			// can be 'sockjs' 'socketio' 'http'
		onEvent:	onSocketEvent,
		onDone:		onConnected
	});
	
	//SR.setSocketServer({port: base_port, onEvent: onSocketEvent, onDone: onConnected});
});

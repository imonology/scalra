//
//
// settings.js
//
//

var settings = exports.settings = {

	projectName:	'Demo',						// unique project name under this user 
	lobbyPort: 		37070,						// port for main lobby server
	domain: 		SR.Settings.DOMAIN_LOBBY,	// external domain name for lobby server
	adminMail: 		'<admin@domain.com>',
	
	// password reset path
	reset_url:		'http://' + this.domain + ':' + (this.lobbyPort + SR.Settings.PORT_INC_HTTP) + '/web/demo-setpass.html',

	// app server's settings
	apps: {
		'app': {
			local_name: 'AppServer'
		},
		'lobby': {
			local_name: 'LobbyServer'
		}	
	},

	// file paths to secure keys (needed by HTTPS services, etc)
	keys: {
		privatekey: __dirname + '/keys/privatekey.pem',
		certificate: __dirname + '/keys/certificate.pem'
	},

	// whether to connect to monitor server by default		
	CONNECT_MONITOR_ONSTART:	false,

	// settings for load balancing servers
	servers: {
		min: 0,
		max: 3,
		overload:  100,
		//underload: 0
	}	
};

// project-specific MongoDB settings
settings.mongoAccess = {"DB_name":"scalra-demo","username":"scalra-demo","password":"scalra-demo"};

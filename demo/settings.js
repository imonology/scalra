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
		
	// default admin account/password to MongoDB
	// NOTE: this is needed if you want to allow Scalra to create the project DB for you,
	// otherwise if DB account/pass can be configured same as 'DB_AUTH', then this is not needed
	// see: https://docs.mongodb.com/v2.6/tutorial/add-user-administrator/
//	DB_ADMIN: {
//		account:  'dbadmin',
//		pass:     'dbadmin-pass'
//	},
	
	// type of DB to use ('mongodb' or 'mysql')
	DB_TYPE: 'mongodb',

	// file paths to secure keys (needed by HTTPS services, etc)
	keys: {
		privatekey: __dirname + '/keys/privatekey.pem',
		certificate: __dirname + '/keys/certificate.pem'
	},

	// whether to connect to monitor server by default		
	CONNECT_MONITOR_ONSTART:	true,

	// settings for load balancing servers
	servers: {
		min: 0,
		max: 3,
		overload:  100,
		//underload: 0
	}
};

// project-specific MongoDB settings
settings.DB_AUTH = {"DB_name":"scalra-demo","username":"scalra-demo","password":"scalra-demo"};

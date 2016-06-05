/*
	NOTE: this file is machine-specific,
		  and should be changed when Scalra is deployed to different servers
*/

var servers = {};

exports.config = {
	
	// current modes are: 'dev', 'prod'
	MODE: 'dev',
	
	DOMAIN_LOBBY:	'localhost',
	IP_LOBBY:	'127.0.0.1',
	IP_MONITOR:	'127.0.0.1',
	DB_IP:		'127.0.0.1',
	DB_PORT:	27017,
	
	// DB admin settings (to create DB for projects automatically)
	DB_ADMIN: {
		account:  'dbadmin',
		pass:     'dbadmin-pass'
	},
	
	// mail server config
	EMAIL_CONFIG: {
		user:    "<account>", 
		password:"<password>", 
		host:    "smtp.gmail.com", 
		ssl:     true
	},
	
	DEFAULT_FILES:	['index.htm', 'index.html', 'default.htm', 'default.html'],
	EMAIL_ADMIN:	'',
	
}

const mysql = require('mysql');

var l_module = exports.module = {};
var l_name = 'Module.MySQLUser';

//-----------------------------------------
// API definitions
//
//-----------------------------------------

SR.API.add('_mysql_user_login', {
	username: 'string',
	password: 'string'
}, (args, onDone, extra) => {
	const {username, password} = args;
	const dbconfig = {
		"test": {
			user: username,
			password: password,
			server: 'localhost',
			// database: settings.DB_AUTH.DB_name,
			requestTimeout: 320000,
			pool: {
				max: 20,
				min: 12,
				idleTimeoutMillis: 30000
			}
		}
	};
	const connection = new mysql.createConnection(dbconfig.test);
	connection.connect(function (err) {
		if (err) {
			// console.log(err.stack);
			return onDone(err.code);
		} else {
			connection.query(`show databases;`, function (error, results, fields) {

				if (error) {
					LOG.error('error ' + error);
					connection.end();
					return onDone(error.code);
				}

				// LOG.warn(fields);
				connection.end();
				if (results.length > 0) {
					for (let i = 0; i < result.length; i++) {
						if (results[i].Database !== undefined
						    && results[i].Database !== 'information_schema'
						    && results[i].Database !== 'performance_schema'
						    && results[i].Database !== 'mysql') {
							return onDone(null, results[i]);
						}
					}
				}
				return onDone('no database results');
			});
		}
	});
});

//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

// module init
l_module.start = function (config, onDone) {
};

l_module.stop = function (onDone) {
};

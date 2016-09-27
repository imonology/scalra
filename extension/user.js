//
//  user.js
//
//  basic user management functions
//
//    methods:
//      register(account, password, user_data)					// create a new user account
//		login(account, password, onDone, requester, conn)		// login by account
//		loginByID(login_id, data, onDone, conn)		// login by guest
//		logout(account, onDone)						// logout of an existing account
//		getPass(type, data)							// retrieve password by email		
//		setPass(password, token)					// set a new password for a given token
//		getUser(account, onDone)					// get user data for a given user (by account name)
//		setUser(account, data, onDone)				// set user data back to DB
//		getEmail(account, onDone)					// get user's email
//		setEmail(account, email, onDone)			// set user's email
//		loginLocal(server, account, password, onDone, requester)	// login to a local server
//		addLocal(account, local, onDone)			// add an access account to a local (non-cloud) server
//		createToken(uid, token_source, onDone)		// create a new token for a given uid
//		revokeToken(uid, token, onDone)				// revoke an existing token for a given uid

//	return code:
//		0 		operation success
//		1		operation fail
//		2		operation error
//

// default encryption type (0 is 'sha512', see SR.Settings.ENCRYPT_TYPES)
var l_enc_type = 0;

// list of logined accounts (account -> user's full data)
var l_logins = SR.State.get('user.logins');

// get a reference to system states
var l_states = SR.State.get(SR.Settings.DB_NAME_SYSTEM);

// keep track of password resest requests (token to uid mapping)
var l_resets = SR.State.get('user.resets');

//
// init functions
//

var l_validateUID = function () {
	
	// check if data exists or will init it
	if (l_states.hasOwnProperty('uid_count') === false) {
		LOG.warn('no users found, user id (uid) counter init to 0', 'user.js');
		l_states['uid_count'] = 0;
	}
	else
		LOG.warn('accounts created so far: ' + l_states['uid_count'], 'user.js');	
};

//
// helper functions
//

// generate a next unique ID for user
// TODO: get it from memory
var l_getUID = function (onDone) {
		
	l_validateUID();	
	var uid = ++l_states['uid_count'];	
	
	// store back to DB
    // check existing users
	SR.DB.setData(SR.Settings.DB_NAME_SYSTEM, l_states, 
				  	// success
				  	function (data) {
						LOG.warn('uid generated: ' + uid);
						onDone(uid);
				  	},
				  	// fail
				  	function () {
						LOG.error('uid generation failed with DB');
						onDone(undefined);
				  	});	
}

var l_encryptPass = exports.encryptPass = function (original, salt) {
	//salt = salt || UTIL.createUUID();
	var salt = 'hydra';
	return UTIL.hash(original + salt, SR.Settings.ENCRYPT_TYPES[l_enc_type]);
}

// store & remove user data to cache
var l_addLogin = function (account, data, conn) {

	//if (l_logins.hasOwnProperty(account) === true)
		//return false;
	
	// check if user's unique data exists
	if (typeof data.data !== 'object') {
		LOG.error('data field does not exist, cannot add login data');
		return false;
	}
	
	LOG.warn('account: ' + account + ' data:', 'addLogin');
	LOG.warn(data);
	
	// attach login name to connection
	// NOTE: we attach connection object to the data stored in memory (not clean?)
	if (conn) {
		// NOTE: we use session because this request could come from an HTTP request
		// that does not have a persistent connectino record in SR.Conn
		SR.Conn.setSessionName(conn, account);
		data._conn = conn;
	}
	
	l_logins[account] = data;
	LOG.warn('user [' + account + '] login success, total count: ' + Object.keys(l_logins).length, 'user');

	delete data._conn;
	//console.log(data);
	
	// error check: make sure lastStatus field exists
	if (data.hasOwnProperty('lastStatus') === false || data.lastStatus === null) 
		data.lastStatus = {loginCount: 0};
	
	data.lastStatus.loginIP = conn.host;
	data.lastStatus.loginCount = data.lastStatus.loginCount + 1;
	data.lastStatus.time = conn.time;

	SR.DB.updateData(SR.Settings.DB_NAME_ACCOUNT, {account: account}, data,
					 	function () {
					 	},
					 	function () {
					 	});	

	return true;
}

var l_removeLogin = function (account) {
	if (l_logins.hasOwnProperty(account) === false)
		return false;
	
	// remove login name from connection (if any)
	var data = l_logins[account];
	if (data.hasOwnProperty('_conn')) {
		//SR.Conn.setConnName(data._conn.connID, '');
		SR.Conn.unsetSessionName(data._conn);
		delete data['_conn'];
	}
	
	delete l_logins[account];
	LOG.warn('user [' + account + '] logout success, total count: ' + Object.keys(l_logins).length, 'user');
	return true;
}

// update a given user's data field, returns true/false for result
var l_updateUser = function (query, field, data, onDone) {

	var action = {};
	action[field] = (typeof data === 'string' ? data : data.data);
	
	if (typeof data === 'object' && data.login_id) {
		delete data.login_id;
	}
	
	SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, {account: data.account}, function (dat) {
		
		// TODO: remove lastStatus here? 
		if (dat) {
			action.lastStatus = dat.lastStatus;
		}
		SR.DB.updateData(SR.Settings.DB_NAME_ACCOUNT, query, action,
					 	function () {
							UTIL.safeCall(onDone, null);
					 	},
					 	function () {
							var err = new Error("updataData fail");
							err.name = "l_updateUser Error";
							UTIL.safeCall(onDone, err);
					 	});	


	}, function(dat) {
		//LOG.warn("no existing data");
	});
}





//
// public methods
//
// /*account, password, email, user_data, onDone*/
// register new account
exports.register = function (arg) {
	
	// print basic info to confirm
	LOG.warn('register new account: ' + arg.account + ' pass: ' + arg.password + ' e-mail: ' + arg.email, 'user.register');
	
    // check existing users
    SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, {account: arg.account},
	
        // DB query success
        function (data) {
			
            if (data !== null) {
				var err = new Error("ACCOUNT_EXISTS: " + arg.account);
				err.name = "register Error";
				err.code = 1;
				return UTIL.safeCall(arg.onDone, err);
            }
			
			// generate unique user_id
			l_getUID(function (uid) {
            
				// encode password
				var enc_pass = l_encryptPass(arg.password);
				
				// NOTE: by default a user is a normal user, user 'role' can later be customized
				var store_data = {
					uid: uid, 
					account: arg.account, 
					password: enc_pass, 
					pass_tokens: {}, 
					enc_type: l_enc_type, 
					email: arg.email, 
					groups: arg.groups, 
					permissions: arg.permissions,
					data: arg.data, //application-level cannot modify except this data
					lastStatus: arg.lastStatus
				};

				LOG.warn('store new account entry for: ' + arg.account);
				SR.DB.setData(SR.Settings.DB_NAME_ACCOUNT, store_data,
							  function (data) {
								  LOG.warn('register success, data:');
								  LOG.warn(data);
								  UTIL.safeCall(arg.onDone, null, {code: 0, msg: 'ACCOUNT_REGISTER_SUCCESS: ' + store_data.account});
							  },
							  function () {
								  var err = new Error("ACCOUNT_REGISTER_ERROR: " + store_data.account);
								  err.name = "register Error";
								  err.code = 2;
								  UTIL.safeCall(arg.onDone, err);
							  });
            });			
        },
		// fail
        function () {
			var err = new Error("ACCOUNT_REGISTER_ERROR: " + store_data.account);
			err.name = "register Error";
			err.code = 2;
			return UTIL.safeCall(arg.onDone, err);
        }
	);
}


// login an existing account
// NOTE: account & password can either be a string/string pair or number/string pair,
// 		 in the latter case it's actuall checked against uid + pass_tokens
// 'requester' is an optional parameter, indicating which server is asking for this login
exports.login = function (account, password, onDone, requester, conn) {
	
	LOG.warn('login request: ' + account + ' pwd: ' + password + ' requester: ' + requester);

	var by_account = (typeof account === 'string');
	var query = (by_account ? {account: account} : {uid: account});
	
	//LOG.warn('by_account: ' + by_account + ' query: ');
	//LOG.warn(query);
	
    // check existing users
    SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, query,
		// success, data already exists
		function (data) {
			//console.log("login_data");
			//console.log(data);
			if (data === null) {
				var err = new Error("ACCOUNT_NOT_FOUND " + account);
				err.name = "login Error";
				err.code = 1;
				return UTIL.safeCall(onDone, err);
			}

			// by default we assume authentication fails and return token does not exist
			var result = false;
			var token = undefined;		
			
			// determine to check password or check token
			if (by_account)
				result = (l_encryptPass(password) === data.password);
			else
				// NOTE: check if the requester of the token was the same as the one logined previously
				result = (data.pass_tokens.hasOwnProperty(password));
				
			// check login is success or fail
			if (result === true) {
				l_addLogin(account, data, conn);
				
				// generate unique token and store it if requested
				if (requester) {
					var l_createTokenDone = function (l_createToken_err, token) {
						if (l_createToken_err) {
							var err = new Error("ACCOUNT_LOGIN_TOKENSTORE_FAIL: " + account);
							err.name = "login Error";
							err.code = 1;
							UTIL.safeCall(onDone, err);
						}
						else {
							UTIL.safeCall(onDone, null, {code: 0, msg: 'ACCOUNT_LOGIN_SUCCESS: ' + account, uid: data.uid, token: token, data: data});
						}
					};
					l_createToken(data.uid, requester, l_createTokenDone);
				}
				else {
					return UTIL.safeCall(onDone, null, {code: 0, msg: 'ACCOUNT_LOGIN_SUCCESS: ' + account, data: data});
				}
			}
			else {
				var err = new Error("ACCOUNT_LOGIN_PASSFAIL: " + account);
				err.name = "login Error";
				err.code = 1;
				return UTIL.safeCall(onDone, err);
			}
		},
		function () {
			var err = new Error("ACCOUNT_LOGIN_DBERROR: " + account);
			err.name = "login Error";
			err.code = 2;
			UTIL.safeCall(onDone, err);
		}
	);
}

// login an existing account
exports.loginByID = function (temp_id, data, onDone, conn) {
	
	if (l_addLogin(temp_id, data, conn) === false) {
		var err = new Error("ACCOUNT_LOGIN_EXISTS: " + temp_id);
		err.name = "loginByID Error";
		err.code = 1;
		UTIL.safeCall(onDone, err);
	}
	else {
		UTIL.safeCall(onDone, null, {code: 0, msg: 'ACCOUNT_LOGIN_SUCCESS: ' + temp_id});
	}
}

// logout of an existing account
exports.logout = function (account, onDone) {
	if (l_removeLogin(account) === false) {
		var err = new Error("ACCOUNT_LOGOUT_NOT_LOGIN: " + account);
		err.name = "logout Error";
		err.code = 1;
		UTIL.safeCall(onDone, err);
	}
	else {
		// TODO: save modified account data to DB ?
		// or.. it's always been saved to DB continously
		UTIL.safeCall(onDone, null, {code: 0, msg: 'ACCOUNT_LOGOUT_SUCCESS: ' + account});
	}
}

// get password for an existing account
exports.getPass = function (type, name, onDone) {
	
	// NOTE ignore type for now, assume 'email' always
    // check existing users
	var query = (type === 'account' ? {account: name} : {email: name});
	
    SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, query,
        // success, data already exists
        function (data) {
            if (data !== null) {
				
				var projectName = UTIL.userSettings('projectName');
				var token = UTIL.createToken();
				var url = UTIL.userSettings('reset_url') + '?token=' + token;
				
				// store token for this user account
				LOG.warn('storing password reset token [' + token + '] for account: ' + data.account + ' uid: ' + data.uid);
				l_resets[token] = data.uid;

				// send to user's email account
				// NOTE: customize this
				UTIL.emailText({	to: data.email,
									  	type: 'html',
										subject: '[' + projectName + '] Password Reset',
									  	text: 	 'Password reset requested. Please click: <a href="' + url + '">' + url + '</a>'});

				return UTIL.safeCall(onDone, null, {code: 0, msg: 'ACCOUNT_GETPASS_SUCCESS: ' + data.email});
            }

			var err = new Error("ACCOUNT_GETPASS_NOT_REGISTERED: " + name);
			err.name = "getPass Error";
			err.code = 1;
			UTIL.safeCall(onDone, err);
        },
		function () {
			var err = new Error("ACCOUNT_GETPASS_DB_ERROR");
			err.name = "getPass Error";
			err.code = 1;
			UTIL.safeCall(onDone, err);
		}
	);
}

// set new password for a given token
exports.setPass = function (password, token, onDone) {
	
	// check if reset was requested & registered previously
	if (l_resets.hasOwnProperty(token) === false) {
		var err = new Error("ACCOUNT_SETPASS_INVALID_TOKEN: " + token);
		err.name = "setPass Error";
		err.code = 1;
		UTIL.safeCall(onDone, err);
	}
	else {

		// get uid
		var uid = l_resets[token];
		var enc_pass = l_encryptPass(password);

		var onUpdated = function (error) {
			if (error) {
				var err = new Error("ACCOUNT_SETPASS_ERROR: " + uid);
				err.name = "setPass Error";
				err.code = 2;
				LOG.warn('setPass error for: ' + uid, 'user.setPass');
				UTIL.safeCall(onDone, err);
			}
			else {
				LOG.warn('setPass success for: ' + uid, 'user.setPass');
				// success, remove token
				delete l_resets[token];
				UTIL.safeCall(onDone, null, {code: 0, msg: 'ACCOUNT_SETPASS_SUCCESS: ' + uid});		
			}	
		};
		l_updateUser({uid: uid}, 'password', enc_pass, onUpdated);
	}
}

// get login data
exports.getLogin = function (account, onDone) {

	if (l_logins.hasOwnProperty(account) === true) {
		UTIL.safeCall(onDone, null, l_logins[account]);
		return l_logins[account];		
	} else {
		UTIL.safeCall(onDone, 'account not found');
		return undefined;
	}
}

// get user data for a given logined user (by account name)
exports.getUser = function (account, onDone) {
	
	if (l_logins.hasOwnProperty(account) === true) {
		UTIL.safeCall(onDone, null, l_logins[account].data);		
	}
	else {
		var onSuccess = function (data) {
			//LOG.warn('query result: ', 'SR.User');
			//LOG.warn(data);

			if (data !== null) {
				if (account instanceof Array) {
					var results = {};
					for (var i=0; i < data.length; i++) {
						if (data[i] && data[i].hasOwnProperty('data')) {
							results[data[i].account] = data[i].data;
						}
					}
					UTIL.safeCall(onDone, null, results);
				}
				else {
					// return user's data
					UTIL.safeCall(onDone, null, data.data);
				}
			}
			else {
				var err = new Error("account [" + account + "] does not exist, cannot get account data");
				err.name = "getUser Error";
				LOG.warn('account [' + account + '] does not exist, cannot get account data');
				UTIL.safeCall(onDone, err);
			}
		};

		// query DB for the user

		// check for single query or multiple query
		// ref: https://groups.google.com/forum/#!topic/mongodb-user/o3C4_E4Ig7k
		if (account instanceof Array) {
			SR.DB.getArray(SR.Settings.DB_NAME_ACCOUNT, onSuccess, onDone, {account: {$in: account}});
		}
		else {
			SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, {account: account}, onSuccess, onDone);	
		}
	}
	
}

// store user data back to DB
exports.setUser = function (account, data, onDone) {

	if (l_logins.hasOwnProperty(account) === false) {
		var err = new Error("account [" + account + "] not login, cannot set account data");
		err.name = "setUser Error";
		LOG.warn('account [' + account + '] not login, cannot set account data');
		UTIL.safeCall(onDone, err);
	}
	
	if (typeof data !== 'object') {
		var err = new Error("user data not provided as an object");
		err.name = "setUser Error";
		LOG.error('user data not provided as an object');
		UTIL.safeCall(onDone, err);
	}	
	
	console.log("============data");
	console.log(data);

	// update to memory
	if (l_logins[account] && l_logins[account].data) 
	l_logins[account].data = data;
	
	// perform DB write-back
	var onUpdated = function (error) {

		if (error) {
			var err = new Error("set custom data for account [" + account + "] fail");
			err.name = "setUser Error";
			LOG.error('set custom data for account [' + account + '] fail', 'user');
			UTIL.safeCall(onDone, err);
		}
		else {
			LOG.warn('set custom data for account [' + account + '] success', 'user');
			UTIL.safeCall(onDone, null);
		}	
	};
	l_updateUser({account: account}, 'data', l_logins[account], onUpdated);
}

// get user e-mail
exports.getEmail = function (account, onDone) {
	if (l_logins.hasOwnProperty(account) === true) {
		UTIL.safeCall(onDone, null, l_logins[account].email);
	}
	else {

		// TODO: combine query with getUser?	
		// query DB for the user
		var query = {account: account};
		var onSuccess = function (data) {
			if (data !== null) {
				// return user's data
				UTIL.safeCall(onDone, null, data.email);
			}
			else {
				var err = new Error("account [" + account + "] does not exist, cannot get email");
				err.name = "getEmail Error";
				LOG.warn('account [' + account + '] does not exist, cannot get email');
				UTIL.safeCall(onDone, err);
			}
		};

		var onFail = function () {
			var err = new Error("accessing DB fail");
			err.name = "getEmail Error";
			UTIL.safeCall(onDone, err);
		};

		SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, query, onSuccess, onFail);
	}
}

// set user e-mail
exports.setEmail = function (account, new_email, onDone) {
	if (l_logins.hasOwnProperty(account) === false) {
		var err = new Error("account [" + account + "] not login, cannot set user email");
		err.name = "setEmail Error";
		LOG.warn('account [' + account + '] not login, cannot set user email');
		return UTIL.safeCall(onDone, err);
	}
	
	l_logins[account].email = new_email;
	
	// store to DB
	l_updateUser({account: account}, 'email', new_email, onDone); 
}

// get user permission
exports.getGroups = function (account, onDone) {

	if (typeof account !== 'string' || account === '') {
		return UTIL.safeCall(onDone, 'account not provided');
	}	
	
	if (l_logins.hasOwnProperty(account) === true) {
		UTIL.safeCall(onDone, null, l_logins[account].groups);
	} else {

		// TODO: combine query with getUser?
		// query DB for the user
		var query = {account: account};
		var onSuccess = function (data) {
			if (data !== null) {
				// return user's data
				UTIL.safeCall(onDone, null, data.groups);
			} else {
				var err = new Error("account [" + account + "] does not exist, cannot get email");
				err.name = "getEmail Error";
				LOG.warn('account [' + account + '] does not exist, cannot get email');
				UTIL.safeCall(onDone, err);
			}
		};

		var onFail = function () {
			var err = new Error("accessing DB fail");
			err.name = "getEmail Error";
			UTIL.safeCall(onDone, err);
		};

		SR.DB.getData(SR.Settings.DB_NAME_ACCOUNT, query, onSuccess, onFail);
	}
}

// set user permission
exports.setGroups = function (account, new_groups, onDone) {
/*	if (l_logins.hasOwnProperty(account) === false) {
		var err = new Error("account [" + account + "] not login");
		err.name = "setGroups Error";
		LOG.warn('account [' + account + '] not login');
		return UTIL.safeCall(onDone, err);
	}*/

	// l_logins[account].groups = new_groups;
	// check for correctness
	if (typeof account === 'undefined' || account === '') {
		return onDone('account not provided');
	}
	
	if (new_groups instanceof Array === false) {
		return onDone('no groups provided');
	}
	
	// remove empty groups
	var groups = [];
	for (var i=0; i < new_groups.length; i++) {
		if (new_groups[i] !== '')
			groups.push(new_groups[i]);
	}
	
	var onUpdated = function (err) {
		if (err) {
			LOG.error(err);
			onDone(err);
		} else {			
			UTIL.safeCall(onDone);
		}
	}

	// store to DB
	l_updateUser({account: account}, 'groups', {
		account: account,
		data: groups
	}, onUpdated);
}


// login to a local server
// return 'undefined' for error, or actual response from remote server
// TODO: change knowledge of SR_LOCAL_ACCOUNT at this level, as user is used by login.js handler
var l_loginLocal = exports.loginLocal = function (server, account, password, onDone, requester) {

	// try to login to local server first to verify account correctness
	var login_id = UTIL.createUUID();
	
	var login_info = {account: account, password: password, requester: requester};
	
	SR.RPC.remoteEvent(server, 'SR_LOGIN_ACCOUNT', {login_id: login_id, data: login_info}, onDone);
}

// add an access account to a local (non-cloud) server
// account: 	which user to login
// local:		{account: 'string', password: 'string'}		login crediential for remote local server
exports.addLocal = function (account, local, onDone) {

	var server = local.server;
	delete local.server;
	
	// build callback to store local account if it's verified
	var storeLocal = function (uid, token) {
		
		// TODO: check if local account already exists, or replace existing one
		
		// multiple accounts storable for one local server
		// NOTE: field name is a variable
		// ref: http://stackoverflow.com/questions/11133912/how-to-use-a-variable-as-a-field-name-in-mongodb-native-findandmodify		
		var field = 'data.accounts.' + server + '.' + uid;
		
		var onUpdated = function (error) {
			if (error) {
				var err = new Error("ADD_LOCAL_ACCOUNT_FAIL: " + account);
				err.name = "addLocal Error";
				err.code = 1;
				UTIL.safeCall(onDone, err);
			}
			else {
				UTIL.safeCall(onDone, null, {code: 0, msg: 'ADD_LOCAL_ACCOUNT_SUCCESS: ' + account});
			}
		};
		l_updateUser({account: account}, field, token, onUpdated);
	}	
	
	// NOTE: by sending the optional 'requester' at the end, this will enable remote server to return a login token back
	// NOTE: the authentication passed can be either account/password or uid/token
	// in which the latter 'uid' is a number
	l_loginLocal(server, local.account, local.password, function (response) {

		// if login is successful, store local account info, otherwise return error
		// TODO: store login_id as well (?)
		LOG.warn('l_loginLocal response: ');
		LOG.warn(response);
        
        // generate failure response if remoteEvent fails
        if (response === undefined) {
			var err = new Error("ADD_LOCAL_ACCOUNT_FAIL: server [" + server + "] not online");
			err.name = "addLocal Error";
			err.code = 1;
            return UTIL.safeCall(onDone, err);
        }

		if (response.code === 0) {
			LOG.warn('local login success for [' + server + '], store local account info');
			storeLocal(response.uid, response.token);	
		}
        
		UTIL.safeCall(onDone, null, response);
	},
	account + '@' + SR.Settings.IP_LOBBY);
}

// add/revoke a pass token
// returns the token or undefined if token store fail
var l_createToken = function (uid, token_source, onDone) {
	
	// generate a valid token to be returned
	var token = UTIL.createToken();
	
	// store token back to DB
	var onUpdated = function (error) {
		if (error) {
			var err = new Error(error.toString());
			err.name = "l_createToken Error";
			UTIL.safeCall(onDone, err);
		}
		else {
			LOG.warn('pass_token [' + token + '] stored');
			UTIL.safeCall(onDone, null, token);			
		}
	};
	l_updateUser({uid: uid}, 'pass_tokens.' + token, token_source, onUpdated);
}

var l_revokeToken = exports.revokeToken = function (uid, token, onDone) {
	var query = {uid: uid};
	var field = 'pass_tokens.' + token;
	
	SR.DB.removeField(SR.Settings.DB_NAME_ACCOUNT, query, field, 
						function () {
							LOG.warn('pass_token [' + token + '] removed');
							UTIL.safeCall(onDone, null, token);
					 	},
					 	function () {
							var err = new Error("accessing DB fail");
							err.name = "revokeToken Error";
							UTIL.safeCall(onDone, err);
					 	});
}

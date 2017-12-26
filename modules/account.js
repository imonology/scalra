/*
	account management (module-based)

	API:
		_ACCOUNT_REGISTER	// create a new user account
		_ACCOUNT_LOGIN		// login by account
		_ACCOUNT_LOGOUT		// logout by account
		_ACCOUNT_RESETPASS	// reset password by email
		_ACCOUNT_SETPASS	// set new password by token
		_ACCOUNT_SETDATA	// set user data by account name & type:value mapping
		_ACCOUNT_GETDATA	// get user data by account name		
		
	history:
		2016-09-27		start
*/

// module name
// NOTE: use it also as DB & in-memory datastore name
var l_name = '_account';

// cache reference of accounts
var l_accounts = undefined;

// list of logined accounts (account -> user's full data)
var l_logins = SR.State.get('user.logins', 'map');

// default encryption type (0 is 'sha512', see SR.Settings.ENCRYPT_TYPES)
var l_enc_type = 0;

// get a reference to system states
var l_states = SR.State.get(SR.Settings.DB_NAME_SYSTEM);


//
// helper functions
//

// check if an account is valid
var l_validateAccount = function (account) {
	// check if DB is initialized
	if (typeof l_accounts === 'undefined') {
		LOG.error('DB module is not loaded, please enable DB module', l_name);	
		return false;
	}
			
	if (l_accounts.hasOwnProperty(account) === false) {
		LOG.error('[' + account + '] not found', l_name);
		return false;
	}
		
	return true;
}

var l_validateUID = function () {
	
	// check if data exists or will init it
	if (l_states.hasOwnProperty('uid_count') === false) {
		LOG.warn('no users found, user id (uid) counter init to 0', 'user.js');
		l_states['uid_count'] = 0;
	}
	else
		LOG.warn('accounts created so far: ' + l_states['uid_count'], 'user.js');	
};

// generate a next unique ID for user
// TODO: use SR.DS for l_states instead
var l_getUID = function (onDone) {
		
	l_validateUID();
	var uid = ++l_states['uid_count'];
	
	l_states.sync(function (err) {
		if (err) {
			return onDone(err);
		}
		LOG.warn('uid generated: ' + uid);
		onDone(null, uid);
	});
}

var l_encryptPass = exports.encryptPass = function (original, salt) {
	salt = salt || 'scalra';
	return UTIL.hash(original + salt, SR.Settings.ENCRYPT_TYPES[l_enc_type]);
}

// email validator
// ref: https://stackoverflow.com/questions/46155/validate-email-address-in-javascript
var l_validateEmail = function (email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}



// // store & remove user data to cache
// var l_addLogin = function (account, conn, onDone) {
				
	// if (l_accounts.hasOwnProperty(account) === false) {
		// return onDone('INVALID_ACCOUNT', account);	
	// }
	
	// var data = l_accounts[account];
	// LOG.warn('[' + account + '] login success, total logins: ' + Object.keys(l_logins).length, l_name);
	
	// // record login session	
	// data.login.IP = conn.host;
	// data.login.time_in = new Date();
	// data.login.time_out = null;	
	// data.login.count++;

	// // store to DB
	// data.sync(function (err) {
		// if (err) {
			// LOG.error(err, l_name);
			// return onDone(err);
		// }

		// // attach login name to connection
		// // NOTE: we attach connection object to the data stored in memory (not clean?)
		// // NOTE: we use session because login could come from an HTTP request
		// // that does not have a persistent connection record in SR.Conn
		// SR.Conn.setSessionName(conn, account);
		
		// // store connID for logout purpose
		// l_logins[account] = conn.connID;			
		
		// return onDone(null);
	// });
// }


// returns the token or undefined if token store fail

// var l_createToken = function (account, from, onDone) {
	
	// // generate a valid token to be returned
	// var token = UTIL.createToken();
	// var data = {tokens: {pass: {}}};
	// data.tokens.pass[token] = from;	
	// SR.API._ACCOUNT_SETDATA({account: account, data: data},	
							// function (err) {
								// if (err) {
									// return onDone(err);	
								// }
								// onDone(null, {account: account, token: token});
							// });
// }

// var l_revokeToken = function (account, token, onDone) {
	// var query = {uid: uid};
	// var field = 'pass_tokens.' + token;
	
	// SR.DB.removeField(SR.Settings.DB_NAME_ACCOUNT, query, field, 
						// function () {
							// LOG.warn('pass_token [' + token + '] removed');
							// UTIL.safeCall(onDone, null, token);
					 	// },
					 	// function () {
							// var err = new Error("accessing DB fail");
							// err.name = "revokeToken Error";
							// UTIL.safeCall(onDone, err);
					 	// });
// }


// // initialize session content based on registered or logined user data
// var l_initSession = function (login_id, session, data) {

	// // acknowledge as 'logined'	
	// l_loginID[login_id] = data.account;
	
	// // init session
	// session['_account'] = data.account;
	
	// // TODO: needs to fix this, should read "groups" from DB
	// session['_groups'] = data.groups;
	// session['_permissions'] = data.permissions;
	// session['lastStatus'] = data.lastStatus;
	
	// // TODO: centralize handling of logined users?
	// //SR.User.addGroup(user_data.account, ['user', 'admin']);
// }


//
// main API
//

// create a new user account
SR.API.add('_ACCOUNT_REGISTER', {
	account:	'string',
	password:	'string',
	email:		'string',
	data:		'+object'
}, function (args, onDone, extra) {
	
	// check if DB is initialized
	if (typeof l_accounts === 'undefined') {
		return onDone('DB_NOT_LOADED');	
	}
		
	// print basic info to confirm
	LOG.warn('register new account: ' + args.account + ' pass: ' + args.password + ' e-mail: ' + args.email, l_name);

	// check existing users
	if (l_accounts.hasOwnProperty(args.account)) {
		return onDone('ACCOUNT_EXISTS', args.account);
	}
	
	// check email correctness
	if (l_validateEmail(args.email) === false) {
		return onDone('INVALID_EMAIL', args.email);
	}
	
	// generate unique user_id
	l_getUID(function (err, uid) {
		if (err) {
			return onDone('UID_ERROR');
		}
		var ip = (extra) ? extra.conn.host : "server";
		// NOTE: by default a user is a normal user, user 'groups' can later be customized
		var reg = {
			uid: 		uid, 
			account:	args.account, 
			password:	l_encryptPass(args.password), 
			email:		args.email,
			tokens: 	{reset: '', pass: {}},
			enc_type:	l_enc_type,
			control:	{groups: [], permissions: []}, 
			data: 		args.data || {},
			login: 		{IP: ip, count: 1}
		};
		
		// special handling (by default 'admin' account is special and will be part of the 'admin' group by default
		if (reg.account === 'admin') {
			reg.control.groups.push('admin');
		}
				
		LOG.warn('creating new account [' + args.account + ']...', l_name);	
		l_accounts.add(reg, function (err) {
			if (err) {
				return onDone('DB_ERROR', err);	
			}
			// register success
			LOG.warn('account register success', l_name);
			onDone(null);
		});
	});
});

// login by account
// NOTE: account & password can either be a string/string pair or number/string pair,
// 		 in the latter case it's actuall checked against uid + pass_tokens
// (unused) 'requester' is an optional parameter, indicating which server is asking for this login
SR.API.add('_ACCOUNT_LOGIN', {
	account:	'string',
	password:	'string',
	from:		'+string'		// which server relays this login request
}, function (args, onDone, extra) {

	// check if DB is initialized
	if (typeof l_accounts === 'undefined') {
		return onDone('DB_NOT_LOADED');
	}
		
	var account = args.account;	
	LOG.warn('login: [' + account + '] pass: ' + args.password + (args.from ? ' from: ' + args.from : ''), l_name);
	
	// check if account exists
	if (l_accounts.hasOwnProperty(account) === false) {
		return onDone('INVALID_ACCOUNT', account);	
	}
	
	// check if already logined
	// NOTE: we allow multiple logins to exist for now
	if (l_logins.hasOwnProperty(account)) {
		LOG.warn('account [' + account + '] already logined', l_name);
	}
	
	var user = l_accounts[account];

	// perform password or token verification	
	if (l_encryptPass(args.password) !== user.password &&
		user.tokens.pass.hasOwnProperty(args.password) === false) {
		return onDone('INVALID_PASSWORD_OR_TOKEN');
	}

	var ip = (extra) ? extra.conn.host : "server";
	// update login time
	user.login = {
		IP: ip,
		time_in: new Date(),
		time_out: null,
		count: user.login.count+1
	}
	
	// generate unique token if the request is relayed from a server
	var token = undefined;
	if (args.from) {
		token = UTIL.createToken();
		user.tokens.pass[token] = args.from;
	}
	
	// save data
	user.sync(function (err) {
		if (err) {
			LOG.error(err, l_name);
			return onDone('DB_ERROR', err);
		}

		// attach login (account) to connection
		// NOTE: we use session because login could come from an HTTP request
		// that does not have a persistent connection record in SR.Conn
		SR.Conn.setSessionName(extra.conn, account);

		// init session by recording login-related info
		// NOTE: 'control' info may change during the session
		extra.session._user = {
			account: account,
			control: user.control,
			login: user.login
		}
				
		// record current login (also the conn object for logout purpose)
		l_logins[account] = extra.conn;	
						
		// return login success
		LOG.warn('[' + account + '] login success, total online accounts: ' + Object.keys(l_logins).length, l_name);	
		onDone(null, {account: account, token: token});
	});	
});

// logout by account
SR.API.add('_ACCOUNT_LOGOUT', {
	_login:		true,
	account:	'+string'
}, function (args, onDone, extra) {
	
	var account = (extra && extra.session && extra.session._user ? extra.session._user.account : args.account);

	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', account);
	}
	
	// record logout time
	var user = l_accounts[account];
	user.login.time_out = new Date();
	user.sync(function (err) {
		if (err) {
			LOG.error(err, l_name);
			return onDone('DB_ERROR', err);	
		}
		
		// remove login name from connection (if any)	
		var conn = l_logins[account];
		SR.Conn.unsetSessionName(conn);
		delete l_logins[account];
			
		// clear session
		// NOTE: extra might become invalid after sync is done
		if (extra) {
			delete extra.session['_user'];
		}
							
		LOG.warn('[' + account + '] logout success, total logins: ' + Object.keys(l_logins).length, l_name);
		onDone(null);
	});
});

// auto-logout when disconnect
SR.Callback.onDisconnect(function (conn) {
	// NOTE: if we auto-logout when socket disconnects, when using websockets and page refreshes, 
	// user will auto-logout as well (undesirable). 
	
	//var account = SR.Conn.getSessionName(conn);
	//if (!account) {
	//	return;
	//}
	
	//SR.API._ACCOUNT_LOGOUT({account: account}, function (err) {
	//	if (err) {
	//		LOG.error(err);	
	//	}
	//	LOG.warn('[' + account + '] auto-logout', l_name);
	//});
});

// reset password by email
SR.API.add('_ACCOUNT_RESETPASS', {
	email:		'string',
	account:	'+string'			// optional e-mail to check
}, function (args, onDone) {

	// send reset mail
	
	onDone(null);	
});

// set new password by token
SR.API.add('_ACCOUNT_SETPASS', {
	_login:			true,
	original_password:		'string',
	password:				'string',
	token:			'+string',
	account:		'+string'
}, function (args, onDone, extra) {
	var account = (extra && extra.session && extra.session._user ? extra.session._user.account : args.account);
	SR.API._ACCOUNT_GETDATA({account: account, type: 'password' }, function (err, result) {
		// _ACCOUNT_SETDATA
		LOG.warn('密碼修改');
		
		if (result.password !== l_encryptPass(args.original_password)) 
			return onDone(null, {success:0, desc:'密碼不正確'});
		var data = l_accounts[account];
		data.password = l_encryptPass(args.password);
		data.sync(function (err) {
			if (err) {
				LOG.error(err, l_name);
				return onDone('DB_ERROR', err);	
			}
			return onDone(null, {success:1, desc:'修改密碼成功'});
		});
	});
	// l_encryptPass
});

// which fields are not allowed to be modified directly
var l_protected_fields = {'uid': true, 'account': true, 'password': true};

// set user data by account name & type:value mapping
SR.API.add('_ACCOUNT_SETDATA', {
	_login:			true,
	account:		'+string',
	data:			'object'
}, function (args, onDone, extra) {

	var account = (extra && extra.session && extra.session._user ? extra.session._user.account : args.account);
	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', account);
	}
	
	// iterate each item and set value while recording errors
	var errmsg = '';
	var data = l_accounts[account];
	
	for (var key in args.data) {
		if (data.hasOwnProperty(key) === false) {
			errmsg += 'field [' + key + '] not found\n';
			continue;
		}
		
		if (l_protected_fields[key]) {
			errmsg += 'field [' + key + '] is protected\n';
			continue;	
		}
		
		// simple replacement for string / numbers
		var type = typeof args.data[key];
		if (type === 'string' || type === 'number') {
			data[key] = args.data[key];
			continue;			
		}
		
		// update/merge value for objects
		data[key] = UTIL.merge.recursive(true, data[key], args.data[key]);
	}
	
	// store back
	data.sync(function (err) {
		if (err) {
			LOG.error(err, l_name);
			return onDone('DB_ERROR', err);	
		}
		onDone(errmsg === '' ? null : errmsg);
	});
});

// get user data by account name
SR.API.add('_ACCOUNT_GETDATA', {
	_login:			true,
	account:		'+string',
	type:			'+string',		// type: ['login', 'data', 'control', 'email', 'uid']
	types:			'+array'		// same as type but in array form
}, function (args, onDone, extra) {
	
	var account = (extra && extra.session && extra.session._user ? extra.session._user.account : args.account);
	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', account);
	}
		
	var data = l_accounts[account];
	
	// convert needed types into array form
	var types = args.types || [];
	if (args.type) {
		types.push(args.type);
	}

	// prepare return value, including 'account'
	var value = {account: account};	
	var errmsg = '';
	for (var i=0; i < types.length; i++) {
		if (data.hasOwnProperty(types[i]) === false) {
			errmsg += ('field [' + types[i] + '] invalid\n'); 
		} else {
			value[types[i]] = data[types[i]];	
		}
	}
	
	if (errmsg !== '') {
		onDone('INVALID_DATA', errmsg);
	} else {
		onDone(null, value);
	}
});

// get group info (array form) for a given account
SR.API.add('_ACCOUNT_GETGROUP', {
	_login: true,
	account: 'string',
}, function (args, onDone, extra) {

	var account = args.account;
	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', account);
	}
	
	onDone(null, l_accounts[account].control.groups);
});


// set all groups for an account, by proving a group string
SR.API.add('_ACCOUNT_SETGROUP', {
	_admin: true,
	account: 'string',
	groups: 'string'
}, function (args, onDone) {

	var account = args.account;
	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', account);
	}
	
	// split input into array
	var arr = args.groups.split(/[\s\b\n\t,;]+/);

	var user = l_accounts[account];
	user.control.groups = arr;
	user.sync(onDone);	
});

// add an account to a given group membership
SR.API.add('_ACCOUNT_ADDGROUP', {
	//_admin: true,
	account: 'string',
	group: 'string'
}, function (args, onDone) {

	var account = args.account;
	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', args.account);
	}
	
	var user = l_accounts[account];
	for (var i=0; i < user.control.groups.length; i++) {
		if (user.control.groups[i] === args.group) {
			return onDone('GROUP_EXISTS', args.group);
		}
	}
	
	// add the group
	user.control.groups.push(args.group);
	user.sync(onDone);
});

// add an account to a given group membership
SR.API.add('_ACCOUNT_REMOVEGROUP', {
	_admin: true,
	account: 'string',
	group: 'string'
}, function (args, onDone) {

	var account = args.account;
	if (l_validateAccount(account) === false) {
		return onDone('INVALID_ACCOUNT', account);
	}
	
	var user = l_accounts[account];
	for (var i=0; i < user.control.groups.length; i++) {
		if (user.control.groups[i] === args.group) {
			user.control.groups.splice(i, 1);
			user.sync(onDone);	
			return;
		}
	}
	onDone('GROUP_ERROR', 'account [' + account + '] does no belong to group [' + args.group + ']');
});



var l_models = {};
l_models[l_name] = {
	uid:			'number',			// unique system-wide id to identify a user
	account:		'*string',			// user account name, also the key to the in-memory map
	password:		'string',			// encrypted login password, method specified by 'enc_type'
	email:			'string',			// email used for both contact and password reset purpose
	tokens:			'object',			// include: 1. pass tokens (can used for login) 2. reset tokens (used to auth password reset)
	enc_type:		'number',			// encryption method used
	control:		'object',			// include: groups & permissions arrays
	login:			'object',			// login record
	data:			'object'			// custom account-specific data
};

SR.Callback.onStart(function () {
	LOG.warn('account module onStart called, init DS...');
	SR.DS.init({models: l_models}, function (err, ref) {
		if (err) {
			LOG.error(err, l_name);	
			return;
		}
		
		l_accounts = ref[l_name];	
		LOG.warn('l_accounts initialized with size: ' + l_accounts.size());
	});
});

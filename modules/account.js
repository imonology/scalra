/*
	account management (module-based)

	history:
		2016-09-27		start
*/

// module name
// NOTE: use it also as DB & in-memory datastore name
var l_name = '_account';

// cache reference of accounts
var l_accounts;

// list of logined accounts (account -> user's full data)
var l_logins = SR.State.get('user.logins', 'map');

// default encryption type (0 is 'sha512', see SR.Settings.ENCRYPT_TYPES)
var l_enc_type = 0;

// get a reference to system states
var l_states = SR.State.get(SR.Settings.DB_NAME_SYSTEM);


//
// helper functions
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

// generate a next unique ID for user
// TODO: use SR.DS for l_states instead
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
	salt = salt || 'scalra';
	return UTIL.hash(original + salt, SR.Settings.ENCRYPT_TYPES[l_enc_type]);
}


// // store & remove user data to cache
// var l_addLogin = function (account, conn, onDone) {
				
	// if (l_accounts.hasOwnProperty(account) === false) {
		// return onDone('[' + account + '] not found');	
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

	// print basic info to confirm
	LOG.warn('register new account: ' + args.account + ' pass: ' + args.password + ' e-mail: ' + args.email, l_name);

	// check existing users
	if (l_accounts.hasOwnProperty(args.account)) {
		return onDone('account [' + args.account + '] exists');
	}
	
	// generate unique user_id
	l_getUID(function (uid) {
		if (!uid) {
			return onDone('cannot generate uid');
		}
				
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
			login: 		{IP: extra.conn.host, time: extra.conn.time, count: 1}
		};
		
		// special handling (by default 'admin' account is special and will be part of the 'admin' group by default
		if (reg.account === 'admin') {
			reg.control.groups.push('admin');
		}
				
		LOG.warn('creating new account [' + args.account + ']...', l_name);	
		l_accounts.add(reg, function (err) {
			if (err) {
				return onDone('storage error for [' + args.account + ']');	
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

	var account = args.account;	
	LOG.warn('login [: ' + account + '] pass: ' + args.password + (args.from ? ' from: ' + args.from : ''), l_name);

	// check if account exists
	if (l_accounts.hasOwnProperty(account) === false) {
		return onDone('account [' + account + '] not found');	
	}
	
	// check if already logined
	if (l_logins.hasOwnProperty(account)) {
		return onDone('account [' + account + '] already logined');		
	}
	
	var user = l_accounts[account];

	// perform password or token verification	
	if (l_encryptPass(args.password) !== user.password &&
		user.tokens.pass.hasOwnProperty(args.password) === false) {
		return onDone('password/token incorrect');
	}

	// update login time
	user.login = {
		IP: extra.conn.host,
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
			return onDone(err);
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
		LOG.warn('[' + account + '] login success, total logins: ' + Object.keys(l_logins).length, l_name);	
		onDone(null, {account: account, token: token});
	});	
});

// logout by account
SR.API.add('_ACCOUNT_LOGOUT', {
	account:	'string'
}, function (args, onDone, extra) {

	var account = args.account;
	if (l_logins.hasOwnProperty(account) === false) {
		return onDone('[' + account + '] not logined');	
	}
	
	if (l_accounts.hasOwnProperty(account) === false) {
		return onDone('[' + account + '] not found');	
	}
	
	// record logout time
	var user = l_accounts[account];
	user.login.time_out = new Date();
	user.sync(function (err) {
		if (err) {
			LOG.error(err, l_name);
			return onDone(err);	
		}
		
		// remove login name from connection (if any)	
		var conn = l_logins[account];
		SR.Conn.unsetSessionName(conn);
		delete l_logins[account];
			
		// clear session
		delete extra.session['_user'];
							
		LOG.warn('[' + account + '] logout success, total logins: ' + Object.keys(l_logins).length, l_name);
		onDone(null);
	});
});

// reset password by email
SR.API.add('_ACCOUNT_RESETPASS', {
	email:		'string',
	account:	'+string'			// optional e-mail to check
}, function (args, onDone) {
	
});

// set new password by token
SR.API.add('_ACCOUNT_SETPASS', {
	password:		'string',
	token:			'string'
}, function (args, onDone) {
	
});

// which fields are not allowed to be modified directly
var l_protected_fields = {'uid': true, 'account': true, 'password': true};

// set user data by account name & type:value mapping
SR.API.add('_ACCOUNT_SETDATA', {
	account:		'string',
	data:			'object'
}, function (args, onDone) {
	if (l_accounts.hasOwnProperty(args.account) === false) {
		return onDone('[' + args.account + '] not found');	
	}
	
	// iterate each item and set value while recording errors
	var errmsg = '';
	var data = l_accounts[args.account];
	
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
			return onDone(err);	
		}
		onDone(errmsg === '' ? null : errmsg);
	});
});

// get user data by account name
SR.API.add('_ACCOUNT_GETDATA', {
	account:		'string',
	type:			'string'		// type: ['login', 'data', 'control', 'email', 'uid']
}, function (args, onDone) {
	if (l_accounts.hasOwnProperty(args.account) === false) {
		return onDone('[' + args.account + '] not found');	
	}
	
	var data = l_accounts[args.account];
	if (data.hasOwnProperty(args.type) === false) {
		return onDone('field [' + args.type + '] invalid');
	}	
	
	// prepare return value, including 'account'
	var value = {account: args.account};
	value[args.type] = data[args.type];
	onDone(null, value);
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
	SR.DS.init({models: l_models}, function (err, ref) {
		if (err) {
			LOG.error(err, l_name);	
			return;
		}
		
		l_accounts = ref[l_name];	
		//LOG.warn('l_accounts initialized with size: ' + l_accounts.size());
	});
});
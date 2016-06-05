//
//  login.js
//
//	login/account related message handlers
//

// include access to user API (/extension/user.js)
//var l_users = SR.Require.ext('user.js');

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

// loginID to account mapping
var l_loginID = {};


var groupPermissionDB = 'groupPermission';
SR.DB.useCollections([groupPermissionDB]);

//
// helpers
//

// perform remote login (at cloud server) of accounts at local servers
var l_login_local_accounts = function (account) {
	
	// get all local accounts & perform login
	var onDone = function (err, data) {
		if (err) {
			LOG.warn(err.toString());
		}
		else {
			for (var server in data.accounts) {
				LOG.warn('local server: ' + server);

				var user_list = data.accounts[server];
				for (var uid in user_list) {
					var token = user_list[uid];
					LOG.warn('local uid: ' + uid + ' token: ' + token);
					l_send_remote_login(server, uid, token);	
				}
			}
		}
	};
	SR.User.getUser(account, onDone);
}

// send login info for local server
var l_send_remote_login = function (server, uid, token) {
	
	try {
		// convert uid to number if not already
		if (typeof uid === 'string')
			uid = parseInt(uid);
	}
	catch (e) {
		LOG.error('uid cannot be parsed as integer...', 'login.send_remote_login');
		return false;
	}
	
	SR.User.loginLocal(server, uid, token, function (result) {
		// NOTE: if local server is not registered, will return 'undefined' as result
		if (result) {
			// NOTE: result has U and P fields
			LOG.warn('local login result for [' + uid + ']: ' + (result.code === 0));
		}
		else
			LOG.warn('local login result for [' + uid + ']: remote server not online');
	});
	
	return true;
}


//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

//
//	Login System
//

// set the upper limit of the message queue's size
l_checkers.SR_LOGIN_QUERY_ACCOUNT = {
    //login_id:   'string'
};


l_handlers.SR_LOGIN_QUERY_ACCOUNT = function (event) {
	LOG.warn('SR_LOGIN_QUERY_ACCOUNT called, session:');
	LOG.warn(event.session);
	console.log(event.session);

	if (event.session['_account']) {
		
		// get email
		var account = event.session['_account'];
		//var email = SR.User.getEmail(account);
		event.done('SR_LOGIN_RESPONSE', {code: 0, msg: account, session: event.session});
	}
	else
		event.done('SR_LOGIN_RESPONSE', {code: 1, msg: 'account not logined'});
	
	/*	
  	var login_id = event.data.login_id;
	
	if (l_loginID.hasOwnProperty(login_id))
		event.done('SR_LOGIN_RESPONSE', {code: 0, msg: l_loginID[login_id]});
	else
		event.done('SR_LOGIN_RESPONSE', {code: 1, msg: 'no account found for login_id: ' + login_id});
	*/
}

// retrieve a given user's data
l_checkers.SR_QUERY_USERDATA = {
};

l_handlers.SR_QUERY_USERDATA = function (event) {
	
	LOG.warn(event);
	
	var account = event.session['_account'];
	
	if (typeof account === 'undefined') {
		event.done('SR_QUERY_USERDATA', {code: 1, msg: 'account not logined'});
		return;
	}
	
	var getEmailDone = function (getEmail_err, email) {
		if (getEmail_err) {
			LOG.warn(getEmail_err.toString());
			event.done("SR_QUERY_USERDATA", {code: 1, msg: "account email does not exist"});
		}
		else {
			var getUserDone = function (err, data) {
				console.log("SR_QUERY_USERDATA");
				console.log(data);
				if (err) {
					LOG.warn(err.toString());
					event.done('SR_QUERY_USERDATA', {code: 1, msg: 'cannot query user data for: ' + account});
				}
				else {
					event.done('SR_QUERY_USERDATA', {code: 0, msg: 'query user data success for: ' + account, data: {account: account, email: email, data: data}, lastStatus: event.session['lastStatus']});		
				}
			};
			SR.User.getUser(account, getUserDone);
		}
	};
	SR.User.getEmail(account, getEmailDone);
		
	/* sample for query an array of user accounts
	SR.User.getUser(['tt', account, 'abc'], function (data) {
		LOG.warn(data);
		if (data === undefined) {
			return event.done('SR_QUERY_USERDATA', {code: 1, msg: 'cannot query user data for: ' + account});
		}
		
		event.done('SR_QUERY_USERDATA', {code: 0, msg: 'query user data success for: ' + account, data: {account: account, email: email, data: data[account]}});				
	});
	*/
	
}

// retrieve a given user's data
l_checkers.SR_UPDATE_USERDATA = {
};

l_handlers.SR_UPDATE_USERDATA = function (event) {

	var account = event.session['_account'];
	
	if (typeof account === 'undefined') {
		return event.done('SR_UPDATE_USERDATA', {code: 1, msg: 'account not logined'});
	}
		
	// store back
	var onDone = function (err) {
		if (err) {
			LOG.warn(err.toString());
			event.done('SR_UPDATE_USERDATA', {code: 1, msg: 'user data update failed'});
		}
		else {
			event.done('SR_UPDATE_USERDATA', {code: 0, msg: 'user data updated'});
		}
	};
	SR.User.setUser(account, event.data, onDone);
}


// NOTE:
// if testing SR_LOGIN_REGISTER by URL in browser, need to put parameters into following format:
// ex.
// 	http://src.scalra.com:37194/event/SR_LOGIN_REGISTER?_data={"login_id": "xxx", "data": {"account": "syhu", "password": "abc", "email": "jjj"}}

// register
l_checkers.SR_LOGIN_REGISTER = {
    login_id:   'string',
	data:		'object'
};

l_handlers.SR_LOGIN_REGISTER = function (event) {

	//var data = event.data;
	var user_data = SR._kit.clone(event.data.data);
	
	//var account = user_data.account;
	//var password = user_data.password;
	//var email = user_data.email;
	//var groups = user_data.groups;
	
	delete user_data.account;
	delete user_data.password;
	delete user_data.email;
	delete user_data.groups;
	
	//console.log(data);
	//LOG.warn('register new user: ');
	//LOG.warn(user_data);

	// try to register new account
	var reg = {
		account:	event.data.data.account, 
		password:	event.data.data.password, 
		email:		event.data.data.email, 
		groups:		event.data.data.groups, 
		data:		user_data, 
		lastStatus: {loginIP: event.conn.host, time: event.conn.time, loginCount: 1}, 
		onDone: function (err, result) {

			if (err) {
				LOG.warn(err.toString());
				result = {code: err.code, msg: err.message};
			}
			else {
				// if success, record login_id to account mapping
				if (result.code === 0) {
					l_loginID[event.data.login_id] = event.data.data.account;

					// acknowledge as 'logined'
					event.session['_account'] = event.data.data.account;
				}
			}
			event.done('SR_LOGIN_RESPONSE', result);
		}
	};
	SR.User.register(reg);
}


// login 
/*
	data: {account:  'string',
		   password: 'string',
		   server:   'string'
		}
*/

l_checkers.SR_LOGIN_ACCOUNT = {
    login_id:   'string',
	data:		'object'
};

l_handlers.SR_LOGIN_ACCOUNT = function (event) {

	//console.log(event);
	
	var data = event.data;
	var user_data = data.data;
	user_data.lastStatus = {loginIP: event.conn.host, time: event.conn.time, loginCount: 1};
	
	LOG.warn(data, 'SR_LOGIN_ACCOUNT');
	
	var server_name = event.data.data.server;
	LOG.sys(server_name);

	// if a local server is specified
	if (server_name && server_name !== '') {
		LOG.warn('check login with local server [' + server_name + ']');
		
		// TODO: cloud processing
		
		// if this is a remotely executable event, then stop execution from now
		// NOTE: if server is not registered, will also return true, event will be handled within SR.RPC
		if (SR.RPC.relayEvent(server_name, 'SR_LOGIN_ACCOUNT', event) === true)
			return;		
	}
	
	// otherwise perform local login
	var loginDone = function (err, result) {

		// if login is successful, we record the user's account in cache
		if (err) {
			LOG.warn(err.toString());
			result = {code: err.code, msg: err.message};
		}
		else {
			if (result.code === 0) {
				LOG.warn('login success, result: ');
				LOG.warn(result);
				l_loginID[event.data.login_id] = user_data.account;
				event.session['lastStatus'] = result.data.lastStatus;

				// TODO: centralize handling of logined users?
				//SR.User.addGroup(user_data.account, ['user', 'admin']);

				// acknowledge as 'logined'
				//event.session['_account'] = user_data.account;
				event.session['_account'] = user_data.account;

				// always provide 'user' group (for test purpose now)
				// TODO: needs to fix this, should read "groups" from DB
				//event.session['_groups'] = result.data.groups;
				event.session['_groups'] = result.data.groups;

				// todo: read permssion from DB
				//event.session['_permissions'] = result.data.permissions;
				//console.log("event.session['_groups']");
				//console.log(event.session['_groups']);
				var xx = [];
				var onSuccess = function(dat){
					//console.log(dat.permission);
					if (dat === null) {
						console.log("no permission");
					}
					else {
						for (var i in dat.permission) {
							//console.log("pushing: " + dat.permission[i]);
							xx.push(dat.permission[i]);
						}
					}
					//event.done("get group", {"status": "success", "data": data});
				};
				var onFail = function(dat){
					//event.done("get group", {"status": "failure", "data": data});
				};
				for (var i in event.session['_groups']) {
					//console.log("getting: " + event.session['_groups'][i]);
					SR.DB.getData(groupPermissionDB, {"group": event.session['_groups'][i], part: "group"}, onSuccess, onFail);
				}
				event.session['_permissions'] = xx;

				// TODO: login at once to all local accounts
				// NOTE: need to query all local login account name & password, then perform individual logins
				l_login_local_accounts(user_data.account);			
			}
		}

		LOG.warn('event before sending login response:');
		LOG.warn(event);
		
		//if (result.data) delete result.data;
		// return response regardless success or fail
		event.done('SR_LOGIN_RESPONSE', result);
	};
	SR.User.login(user_data.account, user_data.password, loginDone, user_data.requester, event.conn);
}

l_checkers.SR_LOGIN_TOKEN = {
    login_id:   'string',
	data:		'object'
};

l_handlers.SR_LOGIN_TOKEN = function (event) {
	
	var data = event.data;
	var user_data = data.data;
	
	var token = data.token;
	
	event.done('SR_LOGIN_RESPONSE', result);	
}

// login by guest
l_checkers.SR_LOGIN_GUEST = {
    login_id:   'string'
};

l_handlers.SR_LOGIN_GUEST = function (event) {
	
	var data = event.data;
	var user_data = data;
	
	var onDone = function (err, result) {
		if (err) {
			LOG.warn(err.toString());
			result = {code: err.code, msg: err.message};
		}
		else
		{
			if (result.code === 0) {
				l_loginID[data.login_id] = data.login_id;
			}
		}
		event.done('SR_LOGIN_RESPONSE', result);
	};
	SR.User.loginByID(data.login_id, user_data, onDone, event.conn);
}

// get password
l_checkers.SR_LOGIN_GETPASS = {
    email:   'string',
};

l_handlers.SR_LOGIN_GETPASS = function (event) {

	//var data = extractJSONPara(event.data);
	var data = event.data;
	
	var onDone = function (err, result) {
		if (err) {
			LOG.warn(err.toString());
			result = {code: err.code, msg: err.message};
		}
		else {
		}
		event.done('SR_LOGIN_RESPONSE', result);
	};
	SR.User.getPass('email', data.email, onDone);
}

// set password
l_checkers.SR_LOGIN_SETPASS = {
    password:   'string',
	token:		'string'
};

l_handlers.SR_LOGIN_SETPASS = function (event) {

	var data = event.data;
	console.log("---------------------");
	console.log(event.data);
	
	var onDone = function (err, result) {
		if (err) {
			LOG.warn(err.toString());
			result = {code: err.code, msg: err.message};
		}
		else {
		}
		event.done('SR_LOGIN_RESPONSE', result);
	};
	SR.User.setPass(data.password, data.token, onDone);
}

// get password
l_checkers.SR_LOGOUT = {
	//_group: ['user', 'admin'],
    account:   'string',
};

l_handlers.SR_LOGOUT = function (event) {
	var onDone = function (err, result) {
		if (err) {
			LOG.warn(err.toString());
			result = {code: err.code, msg: err.message};
		}
		// remove session
		// TODO: remove at one place only
		delete event.session['_account'];
		delete event.session['_groups'];
		delete event.session['_permissions'];
		
		event.done('SR_LOGOUT_RESPONSE', result);
	};
	SR.User.logout(event.data.account, onDone);
}

// add an account to local system
l_checkers.SR_ADDLOCAL = {
	account:		'string',
	local_account:	'object'
};

// TODO: can event perhaps directly call API? (for example, calling SR.User functions directly)
l_handlers.SR_ADDLOCAL = function (event) {
	LOG.warn(event.data);
	
	// store this to local user's account profile
	var onDone = function (err, result) {
		if (err) {
			LOG.warn(err.toString());
			result = {code: err.code, msg: err.message};
		}
		event.done('SR_LOGIN_RESPONSE', result);
	};
	SR.User.addLocal(event.data.account, event.data.local_account, onDone);
}


// revoke a token
l_checkers.SR_REVOKETOKEN = {
	token:			'string'
};

// TODO: can event perhaps directly call API? (for example, calling SR.User functions directly)
l_handlers.SR_REVOKETOKEN = function (event) {
	LOG.warn(event.data);
	
	var uid = (typeof event.data.uid === 'string' ? parseInt(event.data.uid) : event.data.uid);
	
	// store this to local user's account profile
	var onDone = function (err, result) {
		if (err) {
			event.done('SR_LOGIN_RESPONSE', {code: 1, msg: 'revokeToken fail: ' + event.data.token});
		}
		else {
			event.done('SR_LOGIN_RESPONSE', {code: 0, msg: 'revokeToken success: ' + event.data.token});
		}
	};
	SR.User.revokeToken(uid, event.data.token, onDone);
}

// update user's email
l_checkers.SR_UPDATE_EMAIL = {
	account:		'string',
	email:			'string'
};

// TODO: can event perhaps directly call API? (for example, calling SR.User functions directly)
l_handlers.SR_UPDATE_EMAIL = function (event) {
	LOG.warn(event.data);
	
	// store this to local user's account profile
	var onDone = function (err, result) {
		if (err) {
			event.done('SR_LOGIN_RESPONSE', {code: 1, msg: 'update email failed: ' + event.data.account});
		}
		else {
			event.done('SR_LOGIN_RESPONSE', {code: 0, msg: 'update email success: ' + event.data.account});
		}
	};
	SR.User.setEmail(event.data.account, event.data.email, onDone);
}



/////////////////////////////////////////
// extensions for group and permission
//
//
/////////////////////////////////////////

l_handlers.SR_GROUP_PERMISSION = function (event) {
  console.log(event.data); 
	switch (event.data.action) {
		case 'setGroup':
			SR.DB.getData(groupPermissionDB, {"group": event.data.group, part: "group"}, function(data){
				if (data) {
					//console.log("appending permission(s)");
					var appendPermission = function (arg) {
						if ( ! arg.permission ){
							console.log("error: no permission assigned");
							return;
						}

						var exist = false;
						for (var i in data.permission) {
							if (data.permission[i] === arg.permission) {
								//console.log("existing: " + arg.permission);
								exist = true;
							}
						}
						if ( exist === false ) {
							//console.log("adding: " + arg.permission);
							data.permission[data.permission.length] = arg.permission;
						}
					}

					switch (typeof event.data.permission) {
						case 'string':
							appendPermission({permission: event.data.permission});
							break;
						case 'object':
							for (var i in event.data.permission) {
								appendPermission({permission: event.data.permission[i]});
							}
							break;
						default:
							console.log("error: 729ff39587 please debug.");
							break;
					}
				}
				else {
					// does not exist, create a new one
					var data = {group: event.data.group};
					switch (typeof event.data.permission) {
						case 'string':
							data.permission = [event.data.permission];
						break;
					
						case 'object':
							data.permission = event.data.permission;
						break;
					}
				}
				console.log(data);
				SR.DB.updateData(groupPermissionDB, {"group": event.data.group, part: "group"}, data, function(dat){
					event.done("set group", {"status": "success", detail: dat});
				}, function(dat){
					event.done("set group", {"status": "failure", detail: dat});
				});
			}, function(data){
				event.done("set group stage1", {"status": "failure", "detail": data});
			});
			break;
			
		case 'getGroup':
			SR.DB.getData(groupPermissionDB, {"group": event.data.group, part: "group"}, function(data){
				event.done("get group", {"status": "success", "data": data});
			}, function(data){
				event.done("get group", {"status": "failure", "data": data});
			});
			break;
			
		case 'listGroup':
			SR.DB.getArray(groupPermissionDB, function(data){
				event.done("list group", {"status": "success", "data": data});
			}, function(data) {
				event.done("list group", {"status": "failure", "data": data});
			}, {part: "group"});
			break;
			
		case 'deleteGroup':
			SR.DB.getData(groupPermissionDB, {"group": event.data.group, part: "group"}, function(data){
				if (typeof data.permission === 'object') {
					for (var i in data.permission) {
						switch (typeof event.data.permission) {
							case 'string':
								if (data.permission[i] === event.data.permission) {
									delete data.permission[i];
								}
								break;
							case 'object':
								for (var j in event.data.permission) {
									if (data.permission[i] === event.data.permission[j])
										delete data.permission[i];
								}	
								break;
							default:
								break;
						}
					}
				}
				data.permission = UTIL.cleanArray(data.permission);
				console.log(data);
				if ( data && data.permission.length > 0 ) {
					SR.DB.updateData(groupPermissionDB,{"group": event.data.group, part: "group"}, data, function(dat){
						event.done("delete group", {"status": "success", "data": dat});
					}, function(dat){
						event.done("delete group", {"status": "failure", "data": dat});
					}, {"group": event.data.group, part: "group"});
				}
				else {
					SR.DB.deleteData(groupPermissionDB, function(data){
						event.done("delete event level", {"status": "success", "data": data});
					}, function(data){
						event.done("delete event level", {"status": "failure", "data": data});
					}, {group: event.data.group, part: "group"});
				}
			}, function(data){
				event.done("get group", {"status": "failure", "data": data});
			});
			break;
		///////////////////////////////////////////////
		case 'setPermission':
			SR.DB.getData(groupPermissionDB, {"permission": event.data.permission, part: "permission"}, function(data){
				if (data) {
					// level exists, to modify this level
					var appendAllow = function (arg) {
						if ( ! arg.allow ){
							return;
						}

						var exist = false;
						for (var i in data.allow) {
							if (data.allow[i] === arg.allow) {
								exist = true;
							}
						}
						if ( exist === false ) {
							data.allow[data.allow.length] = arg.allow;
						}
					}

					switch (typeof event.data.allow) {
						case 'string':
							appendAllow({allow: event.data.allow});
							break;
						case 'object':
							for (var i in event.data.allow) {
								appendAllow({allow: event.data.allow[i]});
							}
							break;
						default:
							console.log("error: 72939587 please debug.");
							break;
					}
				}
				else {
					// does not exist, create a new one
					var data = {permission: event.data.permission};
					switch (typeof event.data.allow) {
						case 'string':
							data.allow = [event.data.allow];
						break;
					
						case 'object':
							data.allow = event.data.allow;
						break;
					}
				}
				SR.DB.updateData(groupPermissionDB, {"permission": event.data.permission, part: "permission"}, data, function(dat){
					event.done("set permission", {"status": "success"});
				}, function(dat){
					event.done("set permission", {"status": "failure"});
				});
			}, function(data){
				event.done("set permission stage1", {"status": "failure", "data": data});
			});
			break;
			
		case 'getPermission':
			SR.DB.getData(groupPermissionDB, {"permission": event.data.permission, part: "permission"}, function(data){
				event.done("get permission", {"status": "success", "data": data});
			}, function(data){
				event.done("get permission", {"status": "failure", "data": data});
			});
			break;
			
		case 'listPermission':
			SR.DB.getArray(groupPermissionDB, function(data){
				event.done("list permission", {"status": "success", "data": data});
			}, function(data) {
				event.done("list permission", {"status": "failure", "data": data});
			}, {part: "permission"});
			break;
			
		case 'deletePermission':
			SR.DB.getData(groupPermissionDB, {"permission": event.data.permission, part: "permission"}, function(data){
				if (typeof data.allow === 'object') {
					for (var i in data.allow) {
						switch (typeof event.data.allow) {
							case 'string':
								if (data.allow[i] === event.data.allow) {
									delete data.allow[i];
								}
								break;
							case 'object':
								for (var j in event.data.allow) {
									if (data.allow[i] === event.data.allow[j])
										delete data.allow[i];
								}	
								break;
							default:
								break;
						}
					}
				}
				data.allow = UTIL.cleanArray(data.allow);
				console.log(data);
				if ( data && data.allow.length > 0 ) {
					SR.DB.updateData(groupPermissionDB,{"permission": event.data.permission, part: "permission"}, data, function(dat){
						event.done("delete permission", {"status": "success", "data": dat});
					}, function(dat){
						event.done("delete permission", {"status": "failure", "data": dat});
					}, {permission: event.data.permission, part: "permission"});
				}
				else {
					SR.DB.deleteData(groupPermissionDB, function(data){
						event.done("delete event level", {"status": "success", "data": data});
					}, function(data){
						event.done("delete event level", {"status": "failure", "data": data});
					}, {permission: event.data.permission, part: "permission"});
				}
			}, function(data){
				event.done("get permission", {"status": "failure", "data": data});
			});
			break;

		case 'deleteLevel':
			break;
		
		default:
			event.done("no action");
			break;
	}
}

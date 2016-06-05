//
//  notify.js
//
//  generic notification service based on 3rd party messaging (email, SMS, ... etc.)
//
//    functions
//		
//    history:
//        2014-02-20    init
//

//
//	API
//

// type: 'email', 'SMS', 'FTP' 'sound'
// send a message to a given service type
exports.send = function (type, data, onDone) {
	
	
}

var l_method_table = {
	SMS : function(info, user) {
		var onDone = function (err, MIR) {
			if (err) {
				LOG.warn(err.toString(), 'SR.Notify');
			}
			else {
				LOG.warn(MIR, 'SR.Notify');
			}
		};

		SR.Notify.sendSMS("+" + user.data.phone, info.msg, onDone);
	},

	email : function(info, user) {
		var content = {
			to : user.email, 
			subject : "[ " + info.name + " ]", 
			text : info.msg
		};
		UTIL.emailText(content);
	},

	client : function(info, user) {
	}
};

exports.customizeMethod = function (name, cb) {
	if (typeof cb === "function") {
		l_method_table[name] = cb;
		return true;
	}
	else {
		return false;
	}
};

exports.register = function (level, methods, account, cb) {
	if (arguments.length === 3) {
		cb = account;
		var clt = SR.DB.getCollection(SR.Settings.DB_NAME_ACCOUNT, function(){});
		var fields = {};
		fields["data.notification." + "lv_" + level + "_methods"] = {SMS : false, email : false, client : false};
		for (var i = 0; i < methods.length; i++) {
			fields["data.notification." + "lv_" + level + "_methods"][methods[i]] = true;
		}
		var update_cb = function (db_err) {
			if (db_err) {
				var err = new Error("updating DB fail");
				err.name = "register Error";
				UTIL.safeCall(cb, err);
			}
			else {
				UTIL.safeCall(cb, null);
			}
		};
		clt.update({}, {$set : fields}, {multi : true}, update_cb);
	}
	else
		if (arguments.length === 4) {
			var getUserDone = function (getUser_err, customizable_user_data) {
				if (getUser_err) {
					var err = new Error(getUser_err.toString());
					err.name = "register Error";
					UTIL.safeCall(cb, err);
				}
				else {
					if (customizable_user_data.notification === undefined) {
						customizable_user_data.notification = {};
					}

					customizable_user_data.notification["lv_" + level + "_methods"] = {SMS : false, email : false, client : false};

					for (var i = 0; i < methods.length; i++) {
						customizable_user_data.notification["lv_" + level + "_methods"][methods[i]] = true;
					}

					var setUserDone = function (setUser_err) {
						if (setUser_err) {
							var err = new Error(setUser_err.toString());
							err.name = "register Error";
							UTIL.safeCall(cb, err);
						}
						else {
							UTIL.safeCall(cb, null);
						}
					};
					SR.User.setUser(account, customizable_user_data, setUserDone);
				}
			};
			SR.User.getUser(account, getUserDone);
		}
};

exports.alert = function (name, info, level) {
	info.name = name;

	SR.Comm.publish(level, {level : level, event : name, msg : info.msg}, "SR_NOTIFY");
	
	var onSuccess = function (users) {
		for (var i = 0; i < users.length; i++) {
			for (var m in users[i].data.notification["lv_" + level + "_methods"]) {
				if (users[i].data.notification["lv_" + level + "_methods"][m] === true) {
					if (l_method_table[m]) {
						l_method_table[m](info, users[i]);
					}
					else {
						LOG.error("notification method \"" + m + "\" is undefined", 'SR.Notify');
					}
				}
			}
		}
	};
		
	var onFail = function () {
	};
	
	var query = {};
	query["data.notification." + "lv_" + level + "_methods"] = {$exists : true};
	
	SR.DB.getArray(SR.Settings.DB_NAME_ACCOUNT, onSuccess, onFail, query);
};

exports.subscribe = function (account, connection, cb) {
	var getUserDone = function (getUser_err, customizable_user_data) {
		if (getUser_err) {
			var err = new Error(getUser_err.toString());
			err.name = "subscribe Error";
			UTIL.safeCall(cb, err);
		}
		else {
			if (customizable_user_data.notification) {
				for (var level in customizable_user_data.notification) {
					if (customizable_user_data.notification[level]["client"] === true) {
						SR.Comm.subscribe(connection.connID, level.replace("lv_", "").replace("_methods", ""), connection);
					}
				}
			}
			UTIL.safeCall(cb, null);
		}
	};
	SR.User.getUser(account, getUserDone);
};


// map of token to result urls
var l_verifyURL = {};
var l_invalidURL = undefined;

var l_addToken = function (record) {
	
	// cache to memory
	l_verifyURL[record.token] = record;
	
	// store to DB
	SR.DB.setData(l_clt_name, record, 
				  	function (result) {
						LOG.warn('record token to DB success: ', 'SR.Notify');
						LOG.warn(result, 'SR.Notify');
					},
				  	function (result) {
						LOG.warn('record token to DB fail: ', 'SR.Notify');
						LOG.warn(result, 'SR.Notify');
					})	
}

var l_removeToken = function (token) {

	delete l_verifyURL[token];
	// deleteData(clt_name, onSuccess, onFail, id_or_obj)
	SR.DB.deleteData(l_clt_name,
		  	function (result) {
				LOG.warn('delete token from DB success: ', 'SR.Notify');
				//LOG.warn(result, 'SR.Notify');
			},
		  	function (result) {
				LOG.warn('delete token from DB fail: ', 'SR.Notify');
				LOG.warn(result, 'SR.Notify');
			},
			{token: token})
	
}


// get a verify URL that can re-direct to success / fail webpages
// onDone is called when the URL is clicked, returns true if verified, false if not verified
// TOFIX: if server gets shutdown / reboot, onDone will not be valid any more
exports.getVerifyURL = function (redirect_url, options, onDone) {

	LOG.warn(SR.Settings.SERVER_INFO, 'SR.Notify');
	
	var token = UTIL.createToken();
	
	var record = {
		token: token,
		successURL: redirect_url.successURL,
		failURL: redirect_url.failURL,
		invalidURL: redirect_url.invalidURL,
		onDone: onDone,
		accessed: false,
		// record current time
		time: new Date()
	};
	
	if (options) {
		for (name in options)
			record[name] = options[name];
	}
	
	// TODO: save global just once
	l_invalidURL = redirect_url.invalidURL;
	
	// add a new token
	l_addToken(record);
	
	// TODO: do not hard-wired server name in code
	var url = 'http://src.scalra.com:8080/' + SR.Settings.SERVER_INFO.owner + '/' + SR.Settings.SERVER_INFO.project + '/' + SR.Settings.SERVER_INFO.name + '/' +
			'event/SR_VERIFY_TOKEN?token=' + token;

	LOG.warn(url, 'SR.Notify');
	return url;
}

//
// init DB
//

var l_clt_name = '__token';

SR.DB.useCollections([l_clt_name]);

SR.Callback.onStart(function () {
	
	// getArray(clt_name, onSuccess, onFail, query, condition)
	// load all tokens from DB (?)
	SR.DB.getArray(l_clt_name, 
					function (result) {
						LOG.sys('token record size: ' + result.length, 'SR.Notify');
						for (var i=0; i < result.length; i++) {
							var token = result[i].token;
							l_verifyURL[token] = result[i];	
							// TODO: we now just pick any valid one. should make this store just once
							if (result[i].invalidURL)
								l_invalidURL = result[i].invalidURL;
						}
					})
});

SR.Callback.onStop(function () {
	
});

//
// handlers
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

// set the upper limit of the message queue's size
l_checkers.SR_VERIFY_TOKEN = {
	token: 'string'
};

l_handlers.SR_VERIFY_TOKEN = function (event) {
	var token = event.data.token;
	
	if (l_verifyURL.hasOwnProperty(token)) {
		LOG.warn('token valid: ' + token, 'SR.Notify');
		
		// check if first time accessed
		var tokenInfo = l_verifyURL[token];
		var result = undefined;
		if (tokenInfo.accessed === false) {
			tokenInfo.accessed = true;
			result = {result: true, url: tokenInfo.successURL};
			
			// update to DB
			// updateData(clt_name, query, data, onSuccess, onFail)
			SR.DB.updateData(l_clt_name, {token: token}, {accessed: true}, 
				  	function (result) {
						LOG.sys('update token info to DB success: ', 'SR.Notify');
						LOG.sys(result, 'SR.Notify');
					},
				  	function (result) {
						LOG.warn('update token info to DB fail: ', 'SR.Notify');
						LOG.warn(result, 'SR.Notify');
					})			
			
		}
		else {
			LOG.warn('token already accessed before', 'SR.Notify');
			result = {result: false, url: tokenInfo.failURL};
		}
		event.done('SR_REDIRECT', result);
		UTIL.safeCall(tokenInfo.onDone, result);
	}
	else {
		LOG.warn('token invalid: ' + token, 'SR.Notify');
		if (l_invalidURL)
			event.done('SR_REDIRECT', {result: false, url: l_invalidURL});
		else
			event.done('SR_VERIFY_TOKEN', {result: 'invalid token'});
	}
}


exports.daemon = function (arg) {
	switch (arg.action) {
		case 'startSetInterval':
			setInterval(l_setInterval, 0.1*60*1000);
		break;
		default:
		break;
	}
}

// periodically clean up timeout tokens (right now set to every 10 minutes)
var l_setInterval = function () {
	// go over each token
	for (var token in l_verifyURL) {
		
		var record = l_verifyURL[token];
		
		if (typeof record.timeout === 'undefined' || record.timeout === 0)
			continue;

		var now = new Date();
		var elapsed = (now - record.time) / 1000 / 60;
		LOG.sys('token: ' + record.token + ' eplased (in minutes): ' + elapsed, 'SR.Notify');
		if (elapsed > record.timeout) {
			LOG.warn('timeout! remove verify token: ' + token + ' elapsed (minutes): ' + elapsed, 'SR.Notify');
			l_removeToken(token);
		}
	}

};

// add handlers
SR.Handler.add(exports);

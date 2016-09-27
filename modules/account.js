/*
	account management (module-based)

	history:
		2016-09-27		start
*/

// module name
// NOTE: use it also as DB & in-memory datastore name
var l_name = '_account';

// create a new user account
SR.API.add('_ACCOUNT_REGISTER', {
	account:	'string',
	password:	'string',
	data:		'object'
}, function (args, onDone) {
	
});

// login by account
SR.API.add('_ACCOUNT_LOGIN', {
	account:	'string',
	password:	'string'
}, function (args, onDone) {
	
});

// logout by account
SR.API.add('_ACCOUNT_LOGOUT', {
	account:	'string'
}, function (args, onDone) {
	
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

// set user data by account name & type:value mapping
SR.API.add('_ACCOUNT_SETDATA', {
	account:		'string',
	data:			'object'
}, function (args, onDone) {
	
});

// get user data by account name
SR.API.add('_ACCOUNT_GETDATA', {
	account:		'string',
	type:			'string'		// type: ['login', 'data', 'permissions', 'groups', 'email', 'uid']
}, function (args, onDone) {
	
});


var l_models = {};
l_models[l_name] = {
	uid:			'number',			// unique system-wide id to identify a user
	account:		'*string',
	password:		'string',
	email:			'string',
	tokens:			'object',			// include: 1. pass tokens (can used for login) 2. reset tokens (used to auth password reset)
	enc_type:		'number',			// encryption method used
	groups:			'object',			// list of groups this user belongs to
	permissions:	'object',			// permissions granted to this user
	login:			'object',			// login record
	data:			'object'			// custom account-specific data
};

IC.DS.init({models: l_models}, function (err, ref) {
	if (err) {
		LOG.error(err, l_name);	
		return;
	}
	
	l_accounts = ref[l_name];	
	LOG.warn('l_accounts initialized with size: ' + l_accounts.size());
});

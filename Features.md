# Features

This page summarizes the usage of key Scalra features. Main ones include:

  * DataStore


## DataStore

A "datastore" is an in-memory reference to objects representating records in a database. 
Whether it's documents in NoSQL databases or records in SQL databases, when defined as objects
using Object Relational Mapping (ORM), they can be accessed as objects.

A datastore in Scalra allows the access of DB data purely as variables in memory, 
so query or update can be done quickly and intutively. Once data is updated, it can be
updated back to the DB simply with a "sync" function.


## Usage

For example, to define a datastore storing user accounts, we could define the following:

```js
var l_name = '_account';
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
```

Then it can be initialized as follows:

```js
// initialize the datastore when server starts
SR.Callback.onStart(function () {
	SR.DS.init({models: l_models}, function (err, ref) {
		if (err) {
			LOG.error(err, l_name);	
			return;
		}
		
		l_accounts = ref[l_name];	
		LOG.warn('l_accounts initialized with size: ' + l_accounts.size());
	});
});
```

A login check can then be done as follows with update to the login time:

```js
// list of logined accounts (account -> user's full data)
var l_logins = {};

SR.API.add('_ACCOUNT_LOGIN', {
	account:	'string',
	password:	'string',
}, function (args, onDone, extra) {

	var account = args.account;	
	
	// check if account exists
	if (l_accounts.hasOwnProperty(account) === false) {
		return onDone('account [' + account + '] not found');	
	}
		
	var user = l_accounts[account];

	// perform password or token verification	
	if (l_encryptPass(args.password) !== user.password) {
		return onDone('password incorrect');
	}

	// update login time
	user.login = {
		IP: extra.conn.host,
		time_in: new Date(),
		time_out: null,
		count: user.login.count+1
	}
		
	// save data to DB
	user.sync(function (err) {
		if (err) {
			LOG.error(err, l_name);
			return onDone(err);
		}
				
		// record current login (also the conn object for logout purpose)
		l_logins[account] = extra.conn;	
						
		// return login success
		LOG.warn('[' + account + '] login success, total online accounts: ' + Object.keys(l_logins).length, l_name);	
		onDone(null, {account: account});
	});	
}
```

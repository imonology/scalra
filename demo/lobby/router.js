
var l_cache = SR.State.get('cache');

// language setting
var l_lang = require('./language')('english');

SR.Callback.onStart(function () {
	
});

var l_form = SR.State.get('FlexFormMap');
var l_accounts;

SR.Callback.onStart(function () {
	l_form = SR.State.get('FlexFormMap');
	l_accounts = SR.State.get('_accountMap');
	
	// check if our form exists or create one if not
	LOG.warn('l_form size: ' + Object.keys(l_form).length);
});

// get session value based on request object's cookie
// TODO: make this SR function?
var l_getSession = function (req) {
	var cookie = SR.REST.getCookie(req.headers.cookie);
	var session = SR.EventManager.getSession(cookie);
	return session;
};

// pass in request object, returns session data if logined, otherwise returns null
var l_checkLogin = function (req) {
	var session = l_getSession(req);
	if (session.hasOwnProperty('_user')) {
		var login = session._user;
		login.admin = (session._user.account === 'admin');
		return login;
	}
	
	LOG.warn('user not yet logined...');
	return {control: {groups: [], permissions: []}};
};

module.exports = function (app) {

	// CORS header
	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
	});


	app.get('/api/menu', (req, res) => {
		const menu = [
			{
				"path": "/",
				"redirect": "/dashboard",
				"name": "Home",
				"hidden": true,
				"children": [
					{
						"path": "dashboard"
					}
				]
			},
			{
				"path": "/device",
				"redirect": "/device",
				"name": "Device Manege",
				"meta": {
					"title": "device",
					"icon": "device"
				},
				"children": [
					{
						"path": "create",
						"name": "create device",
						"type": "create",
						"meta": {
							"title": "create device",
							"icon": "device"
						}
					},
					{
						"path": "list",
						"name": "list device",
						"type": "list",
						"meta": {
							"title": "list",
							"icon": "edit"
						}
					}
				]
			},
			{
				"path": "external-link",
				"children": [
					{
						"path": "https://www.google.com/",
						"meta": {
							"title": "External Link",
							"icon": "link"
						}
					}
				]
			}
		];
		res.send(menu);
	});
};

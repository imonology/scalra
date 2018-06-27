
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
}

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
}

module.exports = function (app) {
	
	// home page (login)
	app.get('/', function (req, res) {
		var login = l_checkLogin(req);
		res.render('login', {login: login, language: l_lang});
	});
		
	// login
	app.get('/login', function (req, res) { 
		var login = l_checkLogin(req);		
		if (login.account)
			return res.redirect('/main');
		
		res.render('login', {language: l_lang});
	});	

	// account register
	app.get('/register', function (req, res) { 
		var login = l_checkLogin(req);
		res.render('register', {login: login, language: l_lang});
	});	
	
	// main
	app.get('/main', function (req, res) { 
		var login = l_checkLogin(req);		
		if (!login.account)
			return res.redirect('/');
	
		res.render('main', {login: login, language: l_lang});
	});	
	
	// view/create basic info
	app.get('/device', function (req, res) {
		var login = l_checkLogin(req);
		
		if (!login.account)
			return res.redirect('/');
							
		res.render('flexform/view', {login: login, language: l_lang, forms: [{name: req.query.form_name}]});	
	});	
	
	// list records
	app.get('/list', function (req, res) { 
		var login = l_checkLogin(req);
		if (!login.account)
			return res.redirect('/');
		
		var args = {login: login, language: l_lang, para: {form_name: req.query.form_name}};		
		res.render('flexform/list_filter', args);
	});	
	
	// connect a single device
	app.get('/connect', function (req, res) { 
		var login = l_checkLogin(req);
		if (!login.account)
			return res.redirect('/');
		
		var args = {login: login, language: l_lang};		
		res.render('connect', args);
	});

	app.get('/userList', (req, res) => {
		const login = l_checkLogin(req);
		if (!login.account) {
			res.redirect('/');
		}

		res.render('flexform/v2/view', {
			language: l_lang,
			title: 'User list',
			s_title: 'User list',
			mode: 'show',
			nav: [
				{
					name: 'Device list',
					link: '/deviceList'
				},
				{
					name: 'User list',
					link: '/userList'
				}
			],
			para: {
				form_query: { name: 'Users' }
			}
		});
	});

	app.get('/deviceList', (req, res) => {
		const login = l_checkLogin(req);
		if (!login.account) {
			res.redirect('/');
		}

		res.render('flexform/v2/list', {
			language: l_lang,
			title: 'Device list',
			s_title: 'Device list',
			nav: [
				{
					name: 'Device list',
					link: '/deviceList'
				},
				{
					name: 'User list',
					link: '/userList'
				}
			],
			para: {
				form_query: { name: 'DeviceInfo' }
			}
		});
	});
}

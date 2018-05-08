const request = require('request');

var l_module = exports.module = {};
var l_name = 'Module.wpUser';

const l_wpHost = 'https://wp.imoncloud.com';

//-----------------------------------------
// API definitions
//
//-----------------------------------------

SR.API.add('_wpGenerateAuthCookie', {
	username: 'string',
	password: 'string'
}, (args, onDone, extra) => {
	SR.API._wpGetNonce({}, (err, nonce) => {
		if (err) {
			onDone(err);
			return;
		}

		console.log(args);
		request.post(`${l_wpHost}/api/auth/generate_auth_cookie/`, {
			form: {
				nonce,
				username: args.username,
				password: args.password
			}
		}, (err, res, body) => {
			if (err) {
				onDone(err);
				return;
			}

			onDone(null, JSON.parse(body));
		})
	})
});

SR.API.add('_wpGetNonce', {}, (args, onDone, extra) => {
	request.get({
		url: `${l_wpHost}/api/get_nonce/?controller=auth&method=generate_auth_cookie`
	}, (err, res, body) => {
		if (err) {
			onDone(err);
			return;
		}

		const nonce = JSON.parse(body).nonce;
		onDone(null, nonce);
	});
});

SR.API.add('_wpValidateAuthCookie', {
	cookie: 'string'
}, (args, onDone, extra) => {
	request.post(`${l_wpHost}/api/auth/validate_auth_cookie/`, {
		form: {
			cookie: args.cookie
		}
	}, (err, res, body) => {
		if (err) {
			onDone(err);
			return;
		}

		const valid = JSON.parse(body).valid;
		onDone(null, valid);
	});
});

SR.API.add('_wpGetCurrentuserinfo', {
	cookie: 'string'
}, (args, onDone, extra) => {
	request.get({
		url: `${l_wpHost}/api/auth/get_currentuserinfo?cookie=${args.cookie}`
	}, (err, res, body) => {
		if (err) {
			onDone(err);
			return;
		}

		const user = JSON.parse(body).user;
		onDone(null, user);
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

setTimeout(() => {
	console.log('====');
	SR.API._wpGetCurrentuserinfo({
		cookie: 'x3388638|1526965418|8KMYzOrRBgMg7xQMomLGf83TcTuThzJlWIRqInPOm0m|4556646ca94d5d645d289bd8dcd02976f2e51f8fd9617e79aacfb2473d7b855f'
	}, (err, data) => {
		if (err) {
			console.log(err);
		}
	});
}, 5000);

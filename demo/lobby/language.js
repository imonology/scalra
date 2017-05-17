
var l_lang = {};

// english caption
l_lang['english'] = {
	project_name:		'Demo Project',
	copyright_holder:	'Demo Organization',
	madeby:				'Imonology Inc.',
	
	login_title:	'Login',
	login_account:	'account',
	login_password:	'password',
	login_email: 	'email',
	
	register_title:		'Register Account',
	register_subtitle:	'Please enter basic account info',
	register_account:	'account',
	register_password:	'password',
	register_email:		'email',
	register_password:	'password',
	register_checkpass:	'please enter password again',
	
	button_login:		'Login',
	button_register:	'Register Account',
	button_getpass:		'Forgot Password',
}


module.exports = function (type) {
	if (l_lang.hasOwnProperty(type))
		return l_lang[type];
	return l_lang['english'];
};
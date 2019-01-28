/*
	common logic
*/

var languages = {};

languages['chinese'] = {
	err_notfound:		'帳密不符或帳號不存在!',
	err_incomplete:		'請填寫完整註冊資料',
	err_exists:			'帳號已存在',
	err_email:			'e-mail 格式錯誤',
	register_success:	'註冊成功! 自動登入...',
	login_success:		'登入成功',	
	logout_success:		'登出成功',
	update_success:		'更新成功!',
};

// language
languages['english'] = {
	err_notfound:		'account or password incorrect',
	err_incomplete:		'please fill in full data',
	err_exists:			'account already exists',
	err_email:			'email format incorrect',
	register_success:	'register success! login automatically',
	login_success:		'login success!',	
	logout_success:		'logout success!',
	update_success:		'update success!',
};

var l_lang = languages['english'];

//
//	helpers
//

// allow string to check if it begins with something
// ref: http://stackoverflow.com/questions/1767246/javascript-check-if-string-begins-with-something
String.prototype.startsWith = function (needle) {
    return(this.indexOf(needle) == 0);
};


// retrieve account & password from HTML elements
function getInput() {

    var account = document.getElementById('account').value; 
	var email = (document.getElementById('email') ? document.getElementById('email').value : ''); 
    var password = document.getElementById('password').value;
	
	return {account: account, email: email, password: password};	
}

// types: 'register' 'account' 'getpass'
function login(type) {
	
	var input = getInput();
	
	var onDone = function (err, result) {
		if (err) {
			console.error(err);
			// switch for various errors
			switch (err) {				
				case 'ACCOUNT_EXISTS':
					alert(l_lang.err_exists);
					break;
				case 'INVALID_EMAIL':
					alert(l_lang.err_email);
					break;		
				case 'INVALID_ACCOUNT':
				case 'INVALID_PASSWORD_OR_TOKEN':
					alert(l_lang.err_notfound);
					break;					
				case 'INVALID_DATA':
				case 'UID_ERROR':
				case 'DB_ERROR':
				case 'GROUP_ERROR':
				default:
					alert(err);
					break;
			}
			return;
		}

		// do not redirect if it's just to reset password or register
		if (type === 'getpass')
			return;
		
		// try to login if register success
		if (type === 'register') {
			login('account');
			return;
		}
		
		alert(l_lang.login_success);
		window.location = '/main';		
	}
	
	switch (type) {
		case 'register':
			if (input.account === '' || input.password === '' || input.email === '') {
				return alert(l_lang.err_incomplete);	
			}
			SR.API._ACCOUNT_REGISTER(input, onDone);
			break;
		case 'account':
			console.log('calling _ACCOUNT_LOGIN');
			SR.API._ACCOUNT_LOGIN(input, onDone);
			break;
		case 'getpass':
			SR.API._ACCOUNT_RESETPASS(input, onDone);
			break;
		default:
			alert('unknown login type');
			break;
	}
}

function logout (account) {	

	SR.API._ACCOUNT_LOGOUT({account: account}, function (err, result) {
		if (err) {
			alert(err);
		} else {
			alert(l_lang.logout_success);	
		}
		
		var url = "/";
		window.location.href = url;		
	});	
}

function update_data(account, data) {
	SR.API._ACCOUNT_SETDATA({account: account, data: data}, function (err) {
		if (err) {
			alert(err);
		} else {
			alert(l_lang.update_success);
		}
	});
}


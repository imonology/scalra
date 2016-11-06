// types: 'register' 'account' 'getpass'
function login(type, page) {
	
	var input = getInput();
	
	var onDone = function (err, result) {
		if (err) {
			console.error(err);
			alert(err);
			return;
		}

		// do not redirect if it's just to reset password or register
		if (type === 'getpass')
			return;
		
		// try to login if register success
		if (type === 'register') {
			alert('register success! continue with login... \n註冊成功! 自動登入...');
			login('account', page);
			return;
		}
		
		alert('login success!\n登入成功!');
		window.location = (page || '/main');		
	}
	
	switch (type) {
		case 'register':
			if (input.account === '' || input.password === '' || input.email === '') {
				return alert('please fill in complete registeration data \n請填寫完整註冊資料');	
			}
			SR.API._ACCOUNT_REGISTER(input, onDone);
			break;
		case 'account':
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

function logout (page) {

	SR.API._ACCOUNT_LOGOUT(function (err, result) {
		if (err) {
			alert(err);
		} else {
			alert('logout success \n登出成功');	
		}
		
		var url = (page || "/");
		window.location.href = url;
	});	
}

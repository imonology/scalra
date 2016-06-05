// TODO: this may be too Hydra-specific, need to move it

// module object
var l_module = exports.module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};
var l_name = 'SR.Module.Account';

// module init
l_module.start = function (config, onDone) {
	LOG.warn('Account module started...', l_name);
	UTIL.safeCall(onDone);
}

// module shutdown
l_module.stop = function (onDone) {
	UTIL.safeCall(onDone);
}


//var camLib = require('./video/cameraLib.js');
// TODO: there should not be any dependency over video
//require('./video/Core/AeDatabase.js');
//require('./video/Core/AeDate.js');
//require('./video/Core/AeLog.js');
//require('./video/Core/AeObject.js');
//require('./video/Core/AeEventSender.js');
//require('./video/Core/SystemEvent.js');
//require("./video/Core/AeTimeTrigger.js");
//require("./video/Core/pw_recovery.js");
require("./EventTrigger.js");

/*
UserInfo
UserPermissions
AccountData
*/
//=======================================================================================
//使用者資料
function UserInfo() {
	//使用者帳號(索引用)
	this.strAccount = "";
	//電子信箱
	this.strEmail = "";
	//信箱通知勾選
	this.bEmailNotify = false;
	//電話資料
	this.strPhone = "";
	//簡訊通知勾選
	this.bSMSNotify = false;
	//使用者名稱(暱稱?)
	this.strUserName = "";
	//語系控制
	this.strLanguages = "";
	//系統保護
	this.bSystemAegis = false;
	//登入次數
	this.iLoginCount = 0;
	//登入時間
	this.iLogin = 0;
	//最後登出時間
	this.iLastLogout = 0;
};
//創造資料
UserInfo.prototype.create = function (i_strUserAccount, i_data, o_onDone, o_onFail) {
	//更新資料
	if (i_strUserAccount != undefined)
		this.strAccount = i_strUserAccount;
	aether.copyObj(this, i_data);

	var that = this;
	//新增會員資料
	DB.insertValue('UserInfo', that,
		function () {
			o_onDone(that);
		}, o_onFail);
};
//寫入資料
UserInfo.prototype.set = function (i_data, o_onDone, o_onFail) {
	//更新資料
	aether.copyObj(this, i_data);

	this.update(this, o_onDone, o_onFail);
};
//取得資料
//str i_strUserAccount: 使用者帳號
//function o_onDone(object i_data): 成功處理函式
//function o_onFail():              失敗處理函式
UserInfo.prototype.get = function (i_strUserAccount, o_onDone, o_onFail) {
	if (i_strUserAccount != undefined)
		this.strAccount = i_strUserAccount;
	//取得不到，就依現有資料直接新增
	DB.selectOrInsertValue('UserInfo', {
		'strAccount': i_strUserAccount
	}, this, o_onDone, o_onFail);
};
//更新資料
UserInfo.prototype.update = function (i_data, o_onDone, o_onFail) {
	aether.copyObj(this, i_data);
	DB.updateValue('UserInfo', {
		'strAccount': this.strAccount
	}, this, o_onDone, o_onFail);
};
//登入次數
UserInfo.prototype.addLoginNum = function (o_onDone, o_onFail) {
	++this.iLoginCount;
	this.update(this, o_onDone, o_onFail);
};
//
UserInfo.prototype.toPacket = function () {
	var l_obj = {
		'strEmail': this.strEmail, //電子信箱
		'bEmailNotify': this.bEmailNotify, //信箱通知勾選
		'strPhone': this.strPhone, //電話資料
		'bSMSNotify': this.bSMSNotify, //簡訊通知勾選
		'strUserName': this.strUserName, //使用者名稱
		'strLanguages': this.strLanguages, //語系控制
		'bSystemAegis': this.bSystemAegis //系統保護
	};
	return l_obj;
};
//-------------------------------------------------
//使用者權限
function UserPermissions() {
	//使用者帳號(索引用)
	this.strAccount = "";
	//控制錄影權限
	this.bVideo = false;
	//操作回放權限
	this.bPlayback = false;
	//設備位移縮放
	this.bMoveScale = false;
	//設定設備名稱
	this.bSetDevice = false;
	//警報事件處理
	this.bAlertEvent = false;
	//下載備份權限
	this.bBackup = false;
	//拍照畫面權限
	this.bPhotograph = false;
	//軟體更新權限
	this.bUpdate = false;
	//登入權限
	this.bLogin = true;
};
//創造資料
UserPermissions.prototype.create = function (i_strAccount, i_data, o_onDone, o_onFail) {
	//更新資料
	if (i_strAccount != undefined)
		this.strAccount = i_strAccount;
	aether.copyObj(this, i_data);

	var that = this;
	//新增會員資料
	DB.insertValue('UserPermissions', that,
		function () {
			o_onDone(that);
		}, o_onFail);
};
//寫入資料
UserPermissions.prototype.set = function (i_data, o_onDone, o_onFail) {
	//更新資料
	aether.copyObj(this, i_data);

	this.update(o_onDone, o_onFail);
};
//取得資料
//str i_strAccount: 使用者帳號
//function o_onDone(object i_data): 成功處理函式
//function o_onFail():              失敗處理函式
UserPermissions.prototype.get = function (i_strAccount, o_onDone, o_onFail) {
	if (i_strAccount != undefined)
		this.strAccount = i_strAccount;
	DB.selectOrInsertValue('UserPermissions', {
		'strAccount': i_strAccount
	}, this, o_onDone, o_onFail);
};
//更新資料
UserPermissions.prototype.update = function (i_data, o_onDone, o_onFail) {
	aether.copyObj(this, i_data);
	DB.updateValue('UserPermissions', {
		'strAccount': this.strAccount
	}, this, o_onDone, o_onFail);
};
//
UserPermissions.prototype.toPacket = function () {
	var l_obj = {
		'bVideo': this.bVideo, //控制錄影權限
		'bPlayback': this.bPlayback, //操作回放權限
		'bMoveScale': this.bMoveScale, //設備位移縮放
		'bSetDevice': this.bSetDevice, //新增編輯設備
		'bAlertEvent': this.bAlertEvent, //警報事件處理
		'bBackup': this.bBackup, //下載備份權限
		'bPhotograph': this.bPhotograph, //拍照畫面權限
		'bUpdate': this.bUpdate, //軟體更新權限
		'bLogin': this.bLogin //登入權限
	};
	return l_obj;
};
//=======================================================================================================
//使用者
function AccountData() {
	//使用者帳號(索引用)
	this.strAccount = "";
	//str UUID
	this.strUUID = "";
	//int 連線編號
	this.connId = 0;
	//int IP位址
	this.connHost = 0;
	//int 網路窗口
	this.connPort = 0;
};
//private:-----------------------------------------------------------------------------------------------
//AccountData.prototype.into = function (i_data, i_connObj, o_onDone, o_onFail)
//{
//    var that = this;
//    this.connId = i_connObj.connID;
//    this.connHost = i_connObj.host;
//    this.connPort = i_connObj.port;

//    that.data.get(i_data.lUserId, o_onDone, o_onFail);//資料庫發生搜尋錯誤
//};
//取得上次登入時間
AccountData.prototype.getLastTime = function (o_onDone, o_onFail) {
	DB.selectValue('Log_LoginState', {
			'strAccount': this.strAccount
		},
		function (i_data) {
			o_onDone((i_data != null) ? i_data.timeLogin : null);
		}, o_onFail);
};
//用戶登入
AccountData.prototype.loginLog = function (o_onDone, o_onFail) {
	var l_data = {
		'strAccount': this.strAccount,
		'iPort': this.connPort,
		'strHost': this.connHost,
		'timeLogin': AeDate.getAeDateNum(),
		'timeLogout': 0
	};

	DB.insertValue('Log_LoginState', l_data, o_onDone, o_onFail);
};
//用戶登出
AccountData.prototype.logoutLog = function (o_onDone, o_onFail) {
	DB.updateValue('Log_LoginState', {
		'strAccount': this.strAccount
	}, {
		'timeLogout': AeDate.getAeDateNum()
	}, o_onDone, o_onFail);
};
//public:------------------------------------------------------------------------------------------------
//創造帳號
//i_data: 會員資料
//function o_onDone(): 成功
//function o_onFail(SysText i_text): 失敗
AccountData.prototype.registerAP = function (i_data, o_onDone, o_onFail) {
	LOG.warn("AccountData::registerAP in.");
	//比對帳號是否重覆
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_data) {
			LOG.warn("AccountData::registerAP ii_data", ii_data);
			if (ii_data == null) //無此帳號資料
			{
				//新創帳號密碼
				DB.insertValue('User_Account', {
						'strAccount': i_data.strAccount,
						'strPassword': i_data.strPassword,
						'timeNew': AeDate.getAeDateNum()
					},
					function (ii_data) {
						if (ii_data != null)
							o_onDone(0); //
						else
							o_onDone(1); //
					}, o_onFail); //創建帳號失敗
			} else
				o_onFail("此帳號已註冊"); //此帳號已註冊
		}, o_onFail); //資料庫發生搜尋錯誤
};
//修改用戶密碼
//i_data: 資料
//function o_onDone(): 成功
//function o_onFail(SysText i_text): 失敗
AccountData.prototype.revisePass = function (i_data, o_onDone, o_onFail) {
	LOG.warn("AccountData::revisePass in.");
	//帳號
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_data) {
			LOG.warn("AccountData::revisePass in ii_data", ii_data);
			if (ii_data != null) //
			{
				ii_data.strPassword = i_data.strPassword;
				//更新密碼
				DB.updateValue('User_Account', {
						'strAccount': i_data.strAccount
					}, ii_data,
					function () {
						LOG.warn("AccountData::revisePass out ii_data", ii_data);
						o_onDone(0); //
					}, o_onFail); //資料庫發生搜尋錯誤
			} else
				o_onDone(1); //
		}, o_onFail); //資料庫發生搜尋錯誤
};
//登入帳號
//i_data: 帳號密碼
//ConnObj i_connObj: 連線資料
//function o_onDone(): 成功
//function o_onFail(SysText i_text): 失敗
AccountData.prototype.loginAP = function (i_data, i_connObj, o_onDone, o_onFail) {
	LOG.warn("AccountData::loginAP in.");
	//新增資料
	var that = this;
	this.strAccount = i_data.strAccount;
	this.strUUID = UTIL.createUUID();
	this.connId = i_connObj.connID;
	this.connHost = i_connObj.host;
	this.connPort = i_connObj.port;
	//----------------
	var l_nowTime = new AeDate();
	var l_obj = {
		'iReturn': 0,
		'strAccount': i_data.strAccount,
		'strUUID': this.strUUID,
		'iLoginCount': 0,
		'strLoginTime': l_nowTime.getFull(),
		'strIP': this.connHost,
		'objPermissions': null
	};
	var l_userInfo = new UserInfo();
	var l_permissions = new UserPermissions();
	//查詢帳號是否存在
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_data) {
			if (ii_data != null) { //檢查密碼是否正確
				if (ii_data.strPassword == i_data.strPassword) { //讀取資料
					l_userInfo.get(that.strAccount,
						function (i_userData) {
							if (i_userData != null) {
								l_obj.iLoginCount = i_userData.iLoginCount;
								l_userInfo.iLogin = l_nowTime.getFullDateNum();
								l_userInfo.addLoginNum(function () {}, function () {});
								//讀取權限
								l_permissions.get(that.strAccount,
									function (i_permissions) {
										if (i_permissions != null) {
											if (i_permissions.bLogin == 'true') i_permissions.bLogin = true;
											if (i_permissions.bLogin == true) //登入權限檢查
											{
												l_obj.objPermissions = l_permissions.toPacket();
												//登入記錄
												that.loginLog(
													function () {
														l_obj.iReturn = 0;
														o_onDone(l_obj);
													}, o_onFail); //資料庫發生新增錯誤
											} else
												o_onFail("無使用者登入權限"); //
										} else
											o_onFail("無使用者權限資料"); //
									}, o_onFail); //資料庫發生搜尋錯誤
							} else
								o_onFail("無使用者資料"); //
						}, o_onFail); //資料庫發生搜尋錯誤
				} else
					o_onFail("輸入密碼錯誤"); //輸入密碼錯誤
			} else
				o_onFail("此帳號不存在"); //此帳號不存在
		}, o_onFail); //資料庫發生搜尋錯誤
};
//修改用戶權限
//i_data: 資料
//function o_onDone(): 創建成功
//function o_onFail(SysText i_text): 創建失敗
AccountData.prototype.revisePermissions = function (i_data, o_onDone, o_onFail) {
	LOG.warn("AccountData::revisePermissions in.");
	//權限
	var l_permissions = new UserPermissions();
	l_permissions.get(i_data.strAccount,
		function (ii_data) {
			LOG.warn("AccountData::revisePermissions in ii_data", ii_data);
			if (ii_data != null) //
			{
				aether.copyObj(ii_data, i_data);
				//更新
				DB.updateValue('UserPermissions', {
						'strAccount': i_data.strAccount
					}, ii_data,
					function () {
						if (l_permissions.bLogin == false) //取消登入權限
						{
							var l_user = SR.Account.getUserFromAccount(i_data.strAccount);
							if (l_user != null || l_user != undefined) //在線上
							{
								SR.Account.delUser(l_user);
							}
						}
						LOG.warn("AccountData::revisePermissions out ii_data", ii_data);
						o_onDone(0); //
					}, o_onFail); //資料庫發生搜尋錯誤
			} else
				o_onDone(1); //
		}, o_onFail); //資料庫發生搜尋錯誤
};
//發送封包
AccountData.prototype.send = function (i_strPacket, i_obj) {
	aether.send(i_strPacket, i_obj, this.connId);
};
//=======================================================================================================
//Admin
function Admin() {};
//管理者註冊用戶
//i_data: 帳號資料
//function o_onDone(): 創建成功
//function o_onFail(): 創建失敗
Admin.prototype.addUser = function (i_data, o_onDone, o_onFail) {
	////檢查是不是管理者
	//var l_userCheck = SR.Account.getUser(i_connObj.connID);
	//if (l_userCheck == null || l_userCheck == undefined || l_userCheck.strAccount != "admin")
	//{
	//    o_onDone(-100);
	//    return;
	//}
	//----------------
	var that = this;
	var l_user = new AccountData();
	l_user.registerAP(i_data,
		function (ii_data) {
			o_onDone(ii_data);
		}, o_onFail);
};
//管理者刪除用戶
//strAccount: 帳號
//function o_onDone(): 成功
//function o_onFail(): 失敗
Admin.prototype.deleteUser = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//移除資料
	DB.deleteValue('UserInfo', {
			'strAccount': i_data.strAccount
		},
		function () { //移除權限
			DB.deleteValue('UserPermissions', {
					'strAccount': i_data.strAccount
				},
				function () { //從相關群組中移除使用者
					DB.deleteValue('GroupUser', {
							'strAccount': i_data.strAccount
						},
						function () { //刪除帳號資料
							DB.deleteValue('User_Account', {
									'strAccount': i_data.strAccount
								},
								function (ii_data) { //檢查是否在現上
									var l_user = SR.Account.getUserFromAccount(i_data.strAccount);
									if (l_user != null || l_user != undefined) {
										SR.Account.delUser(l_user);
									}
									o_onDone(0); //
								}, o_onFail); //資料庫發生搜尋錯誤
						}, o_onFail);
				}, o_onFail);
		}, o_onFail);
};
//遞回處理帳號資訊
Admin.prototype.getUserInfoList = function (i_dataAr, i_iCount, i_returnAr, o_onDone, o_onFail) {
	var that = this;
	var l_userInfo = new UserInfo();
	l_userInfo.get(i_dataAr[i_iCount].strAccount,
		function (i_userData) {
			//LOG.warn("Admin::getUserInfoList() 取得 第" + i_iCount + "個 帳號資訊  處理成功! ");
			i_returnAr.push(i_userData);
			++i_iCount;

			if (i_iCount == i_dataAr.length) {
				o_onDone(i_returnAr);
				return;
			} else {
				that.getUserInfoList(i_dataAr, i_iCount, i_returnAr, o_onDone, o_onFail);
			}
		}, o_onFail); //資料庫發生搜尋錯誤
};
Admin.prototype.getLoginPermission = function (users, result, count, onDone, onFail) {
	var that = this;
	var userInfo = users[count++];
	var l_userPermissions = new UserPermissions();
	l_userPermissions.get(userInfo.strAccount,
		function (ii_data) {
			if (ii_data != null) {
				userInfo.bLogin = ii_data.bLogin;
				result.push(userInfo);
				if (count == users.length) {
					onDone(result);
				} else {
					that.getLoginPermission(users, result, count, onDone, onFail);
				}
			} else {
				onFail(null);
			}
		}, onFail);
};
//管理者取得所有使用者列表
Admin.prototype.listUser = function (o_onDone, o_onFail) {
	var that = this;
	//列表
	DB.fromArray('User_Account',
		function (ii_dataAr) {
			var l_iCount = 0;
			var l_objInfoAr = [];
			that.getUserInfoList(ii_dataAr, l_iCount, l_objInfoAr,
				function (ii_infoAr) {
					that.getLoginPermission(ii_infoAr, [], 0,
						function (result) {
							o_onDone(result);
						}, o_onFail
					);
				}, o_onFail); //
		}, o_onFail); //
};
//管理者修改用戶密碼
//i_data: 帳號資料
//function o_onDone(): 成功
//function o_onFail(): 失敗
Admin.prototype.setUserPassword = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要檢查 要新增的使用者是否存在!!
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_dataAccount) {
			if (ii_dataAccount != null) {
				var l_user = SR.Account.getUserFromAccount(i_data.strAccount);
				if (l_user != null || l_user != undefined) {
					l_user.revisePass(i_data,
						function (ii_data) {
							o_onDone(ii_data);
						}, o_onFail);
				} else //不在線上
				{
					var l_user = new AccountData();
					l_user.revisePass(i_data,
						function (ii_data) {
							o_onDone(ii_data);
						}, o_onFail);
				}
			} else
				o_onDone(false);
		}, o_onFail);
};
//管理者修改用戶權限
Admin.prototype.setUserInfo = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要檢查 要新增的使用者是否存在!!
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_dataAccount) {
			if (ii_dataAccount != null) {
				SR.Account.user.setInfo(i_data, i_data.strAccount,
					function (ii_data) {
						o_onDone(ii_data);
					}, o_onFail);
			} else
				o_onDone(1);
		}, o_onFail);
};
//管理者查看使用者帳號權限
Admin.prototype.getUserInfo = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要檢查 要使用者是否存在!!
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_dataAccount) {
			if (ii_dataAccount != null) {
				SR.Account.user.getInfo(i_data.strAccount,
					function (ii_data) {
						o_onDone(ii_data); //
					}, o_onFail); //
			} else
				o_onDone(null);
		}, o_onFail);
};
//管理者修改用戶權限
Admin.prototype.setUserPermission = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要檢查 要新增的使用者是否存在!!
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_dataAccount) {
			if (ii_dataAccount != null) {
				var l_user = SR.Account.getUserFromAccount(i_data.strAccount);
				if (l_user != null || l_user != undefined) {
					l_user.revisePermissions(i_data,
						function (ii_data) {
							o_onDone(ii_data);
						}, o_onFail);
				} else //不在線上
				{
					var l_user = new AccountData();
					l_user.revisePermissions(i_data,
						function (ii_data) {
							o_onDone(ii_data);
						}, o_onFail);
				}
			} else
				o_onDone(1);
		}, o_onFail);
};
//管理者查看使用者帳號權限
Admin.prototype.getUserPermission = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要檢查 要使用者是否存在!!
	DB.selectValue('User_Account', {
			'strAccount': i_data.strAccount
		},
		function (ii_dataAccount) {
			if (ii_dataAccount != null) {
				var l_userPermissions = new UserPermissions();
				l_userPermissions.get(i_data.strAccount,
					function (ii_data) {
						if (ii_data != null)
							o_onDone(l_userPermissions.toPacket()); //
						else
							o_onDone(null); //
					}, o_onFail); //失敗
			} else
				o_onDone(null);
		}, o_onFail);
};
//管理者忘記密碼-要求版本號
Admin.prototype.resetAdminPassword = function (o_onDone, o_onFail) {
	var that = this;
	//列表
	DB.selectValue('User_Account', {
			'strAccount': "admin"
		},
		function (ii_dataAccount) {
			if (ii_dataAccount != null) {
				//產生序號
				var l_strVersion = pwRecovery.en({
					len: 6,
					pad: "1215489536"
				});
				LOG.warn("Admin::getVersionNumber 版本號 l_strVersion = " + l_strVersion);
				//產生新的密碼
				var l_strPw = pwRecovery.de(l_strVersion);
				//LOG.warn("Admin::getVersionNumber  l_strPw = " + l_strPw);
				//要去掉尾數
				var l_strPass = l_strPw.slice(0, 6);
				//LOG.warn("Admin::getVersionNumber 新密碼 strPass = " + l_strPass);
				//附蓋掉原本的密碼 並更新回DB
				ii_dataAccount.strPassword = l_strPass;
				//更新密碼
				DB.updateValue('User_Account', {
						'strAccount': "admin"
					}, ii_dataAccount,
					function () {
						LOG.warn("Admin::getVersionNumber out ii_data", ii_dataAccount);
						var l_obj = {
							'strVersion': l_strVersion.slice(0, 4) + "-" + l_strVersion.slice(4, 8) + "-" + l_strVersion.slice(8, 12) + "-" + l_strVersion.slice(12),
							'strCustomerService': "04-12345678"
						};
						//標記必須修改密碼
						SR.Account.bRevise = true;
						o_onDone(l_obj); //
					}, o_onFail); //資料庫發生搜尋錯誤
			} else
				o_onFail(); //
		}, o_onFail); //
};
//管理者 - 重設密碼
Admin.prototype.setAdminPassword = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//取得帳號
	DB.selectValue('User_Account', {
			'strAccount': l_userCheck.strAccount
		},
		function (ii_data) {
			LOG.warn("Admin::setAdminPass in ii_data", ii_data);
			if (ii_data != null) //
			{
				ii_data.strPassword = i_data.strNewPassword;
				//更新密碼
				DB.updateValue('User_Account', {
						'strAccount': l_userCheck.strAccount
					}, ii_data,
					function () {
						//取消標記修改密碼
						SR.Account.bRevise = false;
						LOG.warn("Admin::setAdminPass out ii_data", ii_data);
						o_onDone(0); //
					}, o_onFail); //資料庫發生搜尋錯誤
			} else
				o_onDone(1); //失敗
		}, o_onFail); //資料庫發生搜尋錯誤
};
//====================================
//Group
/*
function Group() {};
//管理者取得所有群組列表
Group.prototype.list = function (o_onDone, o_onFail) {
	//----------------
	//列表
	DB.selectArray('GroupName', {
			'bDelete': false
		},
		function (ii_dataAr) {
			LOG.warn("Group::getAllGroupList ii_dataAr", ii_dataAr);
			var l_objGroupAr = [];
			var l_iLoop = 0;
			while (l_iLoop < ii_dataAr.length) {
				var l_obj = {
					'strGroupName': ii_dataAr[l_iLoop].strGroupName,
					'groupID': ii_dataAr[l_iLoop].groupID
				};
				l_objGroupAr.push(l_obj);
				++l_iLoop;
			}
			o_onDone(l_objGroupAr); //
		}, o_onFail); //
};
//管理者新增群組
Group.prototype.add = function (i_data, o_onDone, o_onFail) {
	//----------------
	DB.selectValue('GroupName', {
			'strGroupName': i_data.strGroupName,
			'bDelete': false
		},
		function (ii_data) {
			if (ii_data == null) //沒有
			{
				//取得新編號
				DB.getCollectionCount('GroupName',
					function (i_iCount) {
						if (i_iCount == null)
							i_iCount = 0;
						DB.insertValue('GroupName', {
								'groupID': ++i_iCount,
								'strGroupName': i_data.strGroupName,
								'bDelete': false
							},
							function (ii_dataGroupName) {
								LOG.warn("Group::add ii_dataGroupName", ii_dataGroupName);
								if (ii_dataGroupName != null) {
									o_onDone(0);
								} else
									o_onDone(1);
							}, o_onFail);
					}, o_onFail);
			} else
				o_onDone(1);
		}, o_onFail);
};
//管理者刪除群組
Group.prototype.delete = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	DB.selectValue('GroupName', {
			'groupID': i_data.groupID,
			'bDelete': false
		},
		function (ii_data) {
			if (ii_data != null) { //移除
				DB.deleteValue('GroupUser', {
						'groupID': i_data.groupID
					},
					function () { //移除
						DB.deleteValue('GroupDevice', {
								'groupID': i_data.groupID
							},
							function (ii_data) {
								DB.updateValue('GroupName', {
										'groupID': i_data.groupID,
										'bDelete': false
									}, {
										'groupID': i_data.groupID,
										'bDelete': true
									},
									function () { //移除
										RecordTrigger.onDeleteGroup({
												'groupID': i_data.groupID
											},
											function () {
												o_onDone(0); //
											}, o_onFail);
									}, o_onFail); //資料庫發生搜尋錯誤
							}, o_onFail); //資料庫發生搜尋錯誤
					}, o_onFail); //資料庫發生搜尋錯誤
			} else
				o_onDone(1); //
		}, o_onFail);
};
//管理者取得群組內使用者
Group.prototype.listUsers = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//列表
	DB.selectArray('GroupUser', {
			'groupID': i_data.groupID
		},
		function (ii_data) {
			LOG.warn("Group::listUsers ii_data", ii_data);
			if (ii_data != null) {
				var l_strUserAr = [];
				var l_iLoop = 0;
				while (l_iLoop < ii_data.length) {
					l_strUserAr.push(ii_data[l_iLoop].strAccount);
					++l_iLoop;
				}
				o_onDone(l_strUserAr); //
			} else
				o_onDone(null); //
		}, o_onFail); //
};
//取得群組內設備ID(有別的地方使用 請勿亂動)
Group.prototype.listDeviceId = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//列表
	DB.selectArray('GroupDevice', {
			'groupID': i_data.groupID
		},
		function (ii_data) {
			LOG.warn("Group::listDeviceId ii_data", ii_data);
			if (ii_data.length > 0) {
				var l_deviceAr = [];
				var l_iLoop = 0;
				while (l_iLoop < ii_data.length) {
					l_deviceAr.push(ii_data[l_iLoop].device);
					++l_iLoop;
				}
				o_onDone(l_deviceAr);
			} else
				o_onDone(null); //
		}, o_onFail); //
};
//遞迴設備ID
Group.prototype.getDeviceName = function (i_dataAr, i_iCount, i_returnAr, o_onDone, o_onFail) {
	//----------------
	var that = this;
	camLib.getNameById(i_dataAr[i_iCount],
		function (err, ii_strName) {
			if (!err) {
				LOG.warn("User::getDeviceName() 取得 第" + i_iCount + "個 設備名稱成功! ");
				i_returnAr.push({
					'name': ii_strName,
					'id': i_dataAr[i_iCount]
				});
				++i_iCount;
				if (i_iCount == i_dataAr.length) {
					o_onDone(i_returnAr);
					return;
				} else {
					that.getDeviceName(i_dataAr, i_iCount, i_returnAr, o_onDone, o_onFail);
				}
			} else {
				LOG.error("getDeviceName error");
				o_onFail();
			}
		});
};
//管理者取得群組內設備
Group.prototype.listDevice = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//列表
	DB.selectArray('GroupDevice', {
			'groupID': i_data.groupID
		},
		function (ii_data) {
			LOG.warn("Group::listDevice ii_data", ii_data);
			if (ii_data.length > 0) {
				var l_deviceAr = [];
				var l_iLoop = 0;
				while (l_iLoop < ii_data.length) {
					l_deviceAr.push(ii_data[l_iLoop].device);
					++l_iLoop;
				}
				that.getDeviceName(l_deviceAr, 0, [],
					function (result) {
						o_onDone(result);
					}, o_onFail
				);
			} else
				o_onDone(null); //
		}, o_onFail); //
};
//管理者新增群組設備
Group.prototype.addDevice = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要防止 沒有該群組卻又新增東西的錯誤
	DB.selectValue('GroupName', {
			'groupID': i_data.groupID,
			'bDelete': false
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //尋找
				DB.selectValue('GroupDevice', {
						'groupID': i_data.groupID,
						'device': i_data.device
					},
					function (ii_data) {
						if (ii_data == null) //不存在的話
						{ //寫入
							DB.insertValue('GroupDevice', {
									'groupID': i_data.groupID,
									'device': i_data.device
								},
								function (ii_dataGroupDevice) {
									LOG.warn("Group::addDevice ii_dataGroupDevice", ii_dataGroupDevice);
									if (ii_dataGroupDevice != null) {
										SR.DB.getData('GroupName', {
												'groupID': i_data.groupID
											},
											function (groupName) {
												SR.DB.getArray('GroupUser',
													function (groupUsers) {
														var users = [];
														for (var k in groupUsers) {
															users.push(groupUsers[k].strAccount);
														}
														SR.DB.getData('camera', {
																'_id': i_data.device
															},
															function (cameraData) {
																users.push('admin');
																cameraData.permission.read = users;
																cameraData.update_at = Date.now();
																SR.DB.updateData('camera', {
																		'_id': i_data.device
																	},
																	cameraData,
																	function (updateStatus) {
																		o_onDone(0);
																	},
																	function () {
																		o_onFail(1);
																	}
																);
															},
															function () {
																o_onFail(1);
															}
														);
													},
													function () {
														o_onFail(1);
													}, {
														'groupID': i_data.groupID
													}
												);
											},
											function () {}
										);
									} else
										o_onDone(1);
								}, o_onFail);
						} else //重複了
							o_onDone(1);
					}, o_onFail);
			} else //
				o_onDone(1);
		}, o_onFail);
};
//管理者刪除群組設備
Group.prototype.deleteDevice = function (i_data, o_onDone, o_onFail) {
	//----------------
	// 從群組中移除
	if (i_data.groupID) {
		DB.deleteValue('GroupDevice', {
				'groupID': i_data.groupID,
				'device': i_data.device
			},
			function (ii_data) { //移除
				SR.DB.getArray('GroupUser',
					function (groupUsers) {
						var users = [];
						for (var k in groupUsers) {
							users.push(groupUsers[k].strAccount);
						}
						SR.DB.getData('camera', {
								'_id': i_data.device
							},
							function (camera) {
								var readPermission = camera.permission.read;
								var updatePermission = readPermission.filter(
									function (user) {
										return users.indexOf(user) == -1;
									}
								);
								LOG.error('new read permission array');
								camera.permission.read = updatePermission;
								camera.update_at = Date.now();
								SR.DB.updateData('camera', {
										'_id': camera._id
									},
									camera,
									function () {
										o_onDone(0); //
									},
									function () {
										LOG.error('group_deleteDevice: update data error');
										o_onFail();
									}
								);
							},
							function (err) {
								LOG.error('group_deleteDevice: get data error');
								o_onFail();
							}
						);
					},
					function (err) {
						LOG.error('group_deleteDevice: get dataArray error');
						o_onFail();
					}, {
						'groupID': i_data.groupID
					}
				);
			}, o_onFail
		); //資料庫發生搜尋錯誤
		// 從所有群組中移除
	} else {
		if (typeof i_data == 'string') {
			DB.deleteValue('GroupDevice', {
					'device': i_data
				},
				function (ii_data) {
					o_onDone(ii_data);
				}, o_onFail
			);
		} else {
			o_onFail();
		}
	}
};
//管理者新增群組使用者
Group.prototype.addUser = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要防止 沒有該群組卻又新增東西的錯誤
	DB.selectValue('GroupName', {
			'groupID': i_data.groupID,
			'bDelete': false
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //要檢查 要新增的使用者是否存在!!
				DB.selectValue('User_Account', {
						'strAccount': i_data.strAccount
					},
					function (ii_dataAccount) {
						if (ii_dataAccount != null) { //尋找
							DB.selectValue('GroupUser', {
									'groupID': i_data.groupID,
									'strAccount': i_data.strAccount
								},
								function (ii_data) {
									if (ii_data == null) //不存在的話
									{ //寫入
										DB.insertValue('GroupUser', {
												'groupID': i_data.groupID,
												'strAccount': i_data.strAccount
											},
											function (ii_dataGroupUser) {
												LOG.warn("Group::addUser ii_dataGroupUser", ii_dataGroupUser);
												if (ii_dataGroupUser != null) {
													SR.DB.getArray('GroupDevice',
														function (groupDevices) {
															for (var k in groupDevices) {
																var device = groupDevices[k];
																SR.DB.getData('camera', {
																		'_id': device.device
																	},
																	function (camera) {
																		var readPermission = camera.permission.read;
																		if (readPermission.indexOf(i_data.strAccount) == -1) {
																			readPermission.push(i_data.strAccount);
																		}
																		camera.permission.read = readPermission;
																		camera.update_at = Date.now();
																		SR.DB.updateData('camera', {
																				'_id': camera._id
																			},
																			camera,
																			function () {
																				LOG.debug('group_addUser: update data success');
																			},
																			function () {
																				LOG.error('group_addUser: update data error');
																			}
																		);
																	},
																	function () {

																	}
																);
															}
														},
														function () {

														}, {
															'groupID': i_data.groupID
														}
													);
													o_onDone(0);
												} else
													o_onDone(1);
											}, o_onFail);
									} else //重複了
										o_onDone(1);
								}, o_onFail);
						} else
							o_onDone(1);
					}, o_onFail);
			} else //
				o_onDone(1);
		}, o_onFail);
};
//管理者刪除群組使用者
Group.prototype.deleteUser = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//移除
	DB.deleteValue('GroupUser', {
			'groupID': i_data.groupID,
			'strAccount': i_data.strAccount
		},
		function (ii_data) { //移除
			SR.DB.getArray('GroupDevice',
				function (groupDevices) {
					var devices = [];
					for (var k in groupDevices) {
						devices.push(groupDevices[k].device);
						for (var key in devices) {
							SR.DB.getData('camera', {
									'_id': devices[key]
								},
								function (camera) {
									var readPermission = camera.permission.read.filter(
										function (user) {
											return user !== i_data.strAccount;
										}
									);
									camera.update_at = Date.now();
									camera.permission.read = readPermission;
									SR.DB.updateData('camera', {
											'_id': devices[key]
										},
										camera,
										function (data) {},
										function (err) {
											LOG.error('group_removeUser: update camera data error');
										}
									);
								},
								function (err) {
									LOG.error('group_removeUser: get camera data error');
								}
							);
						}
					}
					o_onDone(0); //
				},
				function () {
					o_onFail;
				}, {
					'groupID': i_data.groupID
				}
			);
		}, o_onFail); //資料庫發生搜尋錯誤
};
//管理者重設群組設備
Group.prototype.setBulkDevice = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//要防止 沒有該群組卻又新增東西的錯誤
	DB.selectValue('GroupName', {
			'groupID': i_data.groupID,
			'bDelete': false
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //移除群組設備
				DB.deleteValue('GroupDevice', {
						'groupID': i_data.groupID
					},
					function () { //重新寫入
						var l_iLoop = 0;
						while (l_iLoop < i_data.deviceAr.length) {
							DB.insertValue('GroupDevice', {
									'groupID': i_data.groupID,
									'device': i_data.deviceAr[l_iLoop]
								},
								function () {},
								function () {
									o_onFail("資料庫新增錯誤");
									return;
								});
							++l_iLoop;
						}
						o_onDone(0);
					}, o_onFail); //資料庫發生搜尋錯誤
			} else //
				o_onDone(1);
		}, o_onFail);
};
//管理者修改設備名稱
Group.prototype.setDevice = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//尋找strNewDevice是否重複
	DB.selectValue('GroupDevice', {
			'device': i_data.strNewDevice
		},
		function (ii_Device) {
			if (ii_Device != null) //重複了
			{
				o_onDone(1);
				return;
			} else {
				//尋找
				DB.selectArray('GroupDevice', {
						'device': i_data.device
					},
					function (ii_dataAr) {
						LOG.warn("Group::setDevice ii_dataAr", ii_dataAr);
						if (ii_dataAr != null) //
						{
							var l_iLoop = 0;
							while (l_iLoop < ii_dataAr.length) {
								DB.updateValue('GroupDevice', {
										'groupID': ii_dataAr[l_iLoop].groupID,
										'device': i_data.device
									}, {
										'device': i_data.strNewDevice
									},
									function () {},
									function () {
										o_onFail("資料庫更新錯誤");
										return;
									});
								++l_iLoop;
							}
							o_onDone(0);
						} else //
							o_onDone(1);
					}, o_onFail);
			}
		}, o_onFail);
};
//管理者修改群組名稱
Group.prototype.renameGroup = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//尋找strNewGroupName是否重複
	DB.selectValue('GroupName', {
			'strGroupName': i_data.strNewGroupName,
			'bDelete': false
		},
		function (ii_GroupName) {
			if (ii_GroupName != null) //重複了
			{
				o_onDone(1);
				return;
			} else {
				//要防止 沒有該群組的錯誤
				DB.selectValue('GroupName', {
						'strGroupName': i_data.strOldGroupName,
						'bDelete': false
					},
					function (ii_data) {
						if (ii_data != null) //在的話
						{
							//更新
							DB.updateValue('GroupName', {
									'strGroupName': i_data.strOldGroupName,
									'bDelete': false
								}, {
									'strGroupName': i_data.strNewGroupName
								},
								function () {
									o_onDone(0); //
								}, o_onFail); //資料庫發生搜尋錯誤
						} else //
							o_onDone(1);
					}, o_onFail);
			}
		}, o_onFail);
};
//群組ID 查詢 群組名稱
Group.prototype.getNameById = function (i_data, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//尋找strNewGroupName是否重複
	DB.selectValue('GroupName', {
			'groupID': i_data.groupID,
			'bDelete': false
		},
		function (ii_objGroup) {
			if (ii_objGroup != null) //
			{
				o_onDone(ii_objGroup.strGroupName); //
			} else {
				o_onDone(null);
			}
		}, o_onFail);
};
*/

//====================================
//User
function User() {};
//登入帳號
//i_data: 帳號密碼
//ConnObj i_connObj: 連線資料
//function o_onDone(): 成功
//function o_onFail(SysText i_text): 失敗
User.prototype.login = function (i_data, i_connObj, o_onDone, o_onFail) {
	var that = this;
	var l_user = new AccountData();
	l_user.loginAP(i_data, i_connObj,
		function (ii_data) {
			if (i_data.strAccount == "admin")
				SR.Account.iPassErrorCount == 0;
			//如果標記重設密碼
			if (SR.Account.bRevise == true) {
				ii_data.iReturn = -99; // 要補上特殊狀態
			}
			var now = new AeDate();
			Event.onEvent({
					'iType': 2,
					'iEventInx': 1,
					'strTime': now.getFullDateNum(),
					'strText': 'User ' + i_data.strAccount + ' login'
				},
				function () {
					SR.Account.addUser(l_user);
					o_onDone(ii_data);
				},
				function () {
					LOG.error('log event fail');
					o_onFail();
				});
		},
		function (i_str) {
			if (i_data.strAccount == "admin") {
				if (i_str == "輸入密碼錯誤") {
					if (++SR.Account.iPassErrorCount >= 3) {
						o_onDone({
							'bForget': true
						});
						return;
					}
				}
			}
			o_onFail();
		});
};
//登出帳號
User.prototype.logout = function (i_strUUID, o_onDone, o_onFail) {
	var that = this;
	var l_user = SR.Account.getUserByUUID(i_strUUID);
	var now = new AeDate();
	if (l_user != undefined) {
		LOG.warn("User::logoutAP() 用戶登出 strUUID = " + i_strUUID);
		// log event
		Event.onEvent({
				'iType': 2,
				'iEventInx': 2,
				'strTime': now.getFullDateNum(),
				'strText': 'User ' + l_user.strAccount + ' logout'
			},
			function () {
				SR.Account.delUser(l_user);
				o_onDone(0);
			},
			function () {
				LOG.error('log event fail');
				o_onDone(1);
			}
		);
	} else {
		LOG.warn("User::logoutAP() 找不到用戶 strUUID = " + i_strUUID);
		o_onDone(1);
	}
};
//使用者設定帳號資訊
User.prototype.setInfo = function (i_data, i_strAccount, o_onDone, o_onFail) {
	//----------------
	var that = this;
	var l_userInfo = new UserInfo();
	l_userInfo.get(i_strAccount,
		function (ii_data) {
			l_userInfo.set(i_data,
				function (ii_data) {
					if (ii_data != null)
						o_onDone(0); //
					else
						o_onDone(1); //
				}, o_onFail); //
		}, o_onFail); //
};
//使用者取得帳號資訊
User.prototype.getInfo = function (i_strAccount, o_onDone, o_onFail) {
	//----------------
	var that = this;
	var l_userInfo = new UserInfo();
	l_userInfo.get(i_strAccount,
		function (ii_data) {
			if (ii_data != null)
				o_onDone(l_userInfo.toPacket()); //
			else
				o_onDone(null); //
		}, o_onFail); //
};
//修改密碼(含管理者)
User.prototype.setPassword = function (i_data, i_strAccount, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//取得帳號
	DB.selectValue('User_Account', {
			'strAccount': i_strAccount
		},
		function (ii_data) {
			LOG.warn("User::revisePass in ii_data", ii_data);
			if (ii_data != null) //
			{
				if (ii_data.strPassword == i_data.strOldPassword) {
					ii_data.strPassword = i_data.strNewPassword;
					//更新密碼
					DB.updateValue('User_Account', {
							'strAccount': i_strAccount
						}, ii_data,
						function () {
							LOG.warn("User::revisePass out ii_data", ii_data);
							o_onDone(0); //
						}, o_onFail); //資料庫發生搜尋錯誤
				} else
					o_onDone(1); //失敗
			} else
				o_onDone(1); //失敗
		}, o_onFail); //資料庫發生搜尋錯誤
};
//使用者查看帳號權限
User.prototype.getPermission = function (i_strAccount, o_onDone, o_onFail) {
	//----------------
	var that = this;
	var l_userPermissions = new UserPermissions();
	l_userPermissions.get(i_strAccount,
		function (ii_data) {
			if (ii_data != null)
				o_onDone(l_userPermissions.toPacket()); //
			else
				o_onDone(null); //
		}, o_onFail); //創建帳號失敗
};
//遞迴群組ID
User.prototype.getGroupName = function (i_dataAr, i_iCount, i_returnAr, o_onDone, o_onFail) {
	//----------------
	var that = this;
	SR.Account.group.getNameById(i_dataAr[i_iCount],
		function (ii_strName) {
			LOG.warn("User::getGroupName() 取得 第" + i_iCount + "個 群組ID  名稱成功! ");
			i_returnAr.push(ii_strName);
			++i_iCount;

			if (i_iCount == i_dataAr.length) {
				o_onDone(i_returnAr);
				return;
			} else {
				that.getGroupName(i_dataAr, i_iCount, i_returnAr, o_onDone, o_onFail);
			}
		}, o_onFail);
};
//使用者查看所在哪些群組
User.prototype.listGroup = function (i_data, i_strAccount, o_onDone, o_onFail) {
	//----------------
	var that = this;
	//列表
	DB.selectArray('GroupUser', {
			'strAccount': i_strAccount
		},
		function (ii_dataAr) {
			LOG.warn("User::listGroup ii_dataAr", ii_dataAr);
			if (ii_dataAr.length > 0) {
				var l_iCount = 0;
				var l_returnAr = [];
				that.getGroupName(ii_dataAr, l_iCount, l_returnAr,
					function (ii_strNameAr) {
						o_onDone(l_returnAr); //
					}, o_onFail);
			} else
				o_onDone(null); //
		}, o_onFail); //
};
//取得是否登入中
User.prototype.getLogin = function (i_strUUID, o_onDone, o_onFail) {
	var that = this;
	var l_user = SR.Account.getUserByUUID(i_strUUID);
	LOG.warn("User::getLogin l_user", l_user);
	l_userInfo = new UserInfo();
	if (l_user != undefined) {
		//LOG.warn("User::getLogin() 在線上 connID = " + i_connObj.connID);
		l_userInfo.get(l_user.strAccount,
			function (l_userData) {
				l_user.iLoginCount = l_userData.iLoginCount;
				l_user.iLogin = l_userData.iLogin;
				l_user.IP = l_user.connHost;
				delete l_user.strUUID;
				delete l_user.connId;
				delete l_user.connPort;
				o_onDone(l_user);
			}
		);
	} else {
		//LOG.warn("User::getLogin() 不在線上 connID = " + i_connObj.connID);
		o_onDone(null);
	}
};
//=======================================================================================================
//線上用戶列表
function AccountPermissions() {
	this.admin = new Admin();
	//this.group = new Group();
	this.user = new User();
	//管理者密碼錯誤次數
	this.iPassErrorCount = 0;
	//強制管理者修改密碼
	this.bRevise = false;
	//AccountData[] 線上用戶列表
	//this.connIdList = {};
	//AccountData[] 線上用戶列表
	this.strUUIDList = {};
	//AccountData[] 線上用戶列表
	this.strUserList = {};
};
//private:-----------------------------------------------------------------------------------------------
//新增用戶
AccountPermissions.prototype.addUser = function (i_user) {
	//新增會員資料
	LOG.warn("AccountPermissions::addUser() i_user", i_user);
	if (i_user == undefined)
		return;
	if (i_user.strUUID == null || i_user.strUUID == undefined) {
		LOG.error("AccountPermissions::addUser i_user.strUUID = " + i_user.strUUID);
		return;
	}
	if (i_user.strAccount == null || i_user.strAccount == undefined) {
		LOG.error("AccountPermissions::addUser i_user.strAccount = " + i_user.strAccount);
		return;
	}
	//檢查是否重複登入 -- 可能會有其他遊戲會需要這個平台登入

	//如果同一個會員編號 有在上面則直接取用此資料

	//連線搜尋
	//this.connIdList[i_user.connId.toString()] = i_user;
	//登入編號
	this.strUUIDList[i_user.strUUID] = i_user;
	//用戶編號
	this.strUserList[i_user.strAccount] = i_user;
};
//刪除用戶
AccountPermissions.prototype.delUser = function (i_user) {
	if (i_user == undefined)
		return;
	LOG.sys("AccountPermissions::delUser() strAccount = " + i_user.strAccount);
	//連線搜尋
	//delete this.connIdList[i_user.connId.toString()];
	//登入編號
	delete this.strUUIDList[i_user.strUUID];
	//用戶編號
	delete this.strUserList[i_user.strAccount];
	//用戶登出
	i_user.logoutLog();
	//登出時間
	var l_userInfo = new UserInfo();
	l_userInfo.get(i_user.strAccount,
		function (i_userData) {
			if (i_userData != null) {
				l_userInfo.iLastLogout = AeDate.getFullAeDateNum();
				l_userInfo.update(l_userInfo, function () {}, function () {});
			}
		},
		function () {}); //資料庫發生搜尋錯誤

};
//public:------------------------------------------------------------------------------------------------
//==================================================================
//==================================================================
//取得目前上線用戶數量
//return int: 目前人數
AccountPermissions.prototype.getCount = function () {
	return aether.getObjLength(this.strUUIDList);
};
//取得用戶資料 - UUID搜尋
AccountPermissions.prototype.getUserByUUID = function (i_uuid) {
	if (i_uuid == undefined)
		return undefined;

	return this.strUUIDList[i_uuid];
};
//取得用戶資料 - ConnId搜尋
//AccountPermissions.prototype.getUser = function (i_inx)
//{
//    if (i_inx == undefined)
//        return undefined;

//    return this.connIdList[i_inx.toString()];
//};
//取得用戶資料 - 帳號搜尋
AccountPermissions.prototype.getUserFromAccount = function (i_strAccount) {
	if (i_strAccount == undefined)
		return undefined;

	return this.strUserList[i_strAccount];
};
//發送全體用戶
//AccountPermissions.prototype.send = function (i_strPacket, i_obj)
//{
//    for (var i in this.connIdList)
//        this.connIdList[i].send(i_strPacket, i_obj);
//};
//取得群組內所有帳號列表的使用者資訊
AccountPermissions.prototype.getGroupAccountInfo = function (i_data, o_onDone, o_onFail) {
	this.group.listUsers({
			'groupID': i_data.groupID
		},
		function (ii_strUserAr) {
			if (ii_strUserAr != null) {
				DB.fromArray('UserInfo',
					function (ii_userInfoAr) {
						var l_infoAr = [];
						var l_iLoop = 0;
						while (l_iLoop < ii_strUserAr.length) {
							var l_iLoopInfo = 0;
							while (l_iLoopInfo < ii_userInfoAr.length) {
								if (ii_strUserAr[l_iLoop] == ii_userInfoAr[l_iLoopInfo].strAccount) {
									l_infoAr.push(ii_userInfoAr[l_iLoopInfo]);
								}
								++l_iLoopInfo;
							};
							++l_iLoop;
						};
						o_onDone(l_infoAr);
					}, o_onFail);
			} else
				o_onDone(null);
		}, o_onFail);
};


//Server開啟
//sysEvent.evtServerOpen.register(function () {
SR.Callback.onStart(function () {
	LOG.warn("AccountPermissions::onServerOpen() Server開啟");
	//
	DB.selectValue('User_Account', {
			'strAccount': "admin"
		},
		function (ii_data) {
			LOG.warn("AccountPermissions::registerAP ii_data", ii_data);
			if (ii_data == null) //無此帳號資料
			{ //新創帳號密碼
				DB.insertValue('User_Account', {
						'strAccount': "admin",
						'strPassword': "admin-pass",
						'timeNew': AeDate.getAeDateNum()
					},
					function (iii_data) {
						LOG.warn("AccountPermissions::onServerOpen iii_data", iii_data);
						var l_permissions = new UserPermissions();
						var l_obj = {
							'bVideo': true, //控制錄影權限
							'bPlayback': true, //操作回放權限
							'bMoveScale': true, //設備位移縮放
							'bSetDevice': true, //新增編輯設備
							'bAlertEvent': true, //警報事件處理
							'bBackup': true, //下載備份權限
							'bPhotograph': true, //拍照畫面權限
							'bUpdate': true, //軟體更新權限
							'bLogin': true //軟體更新權限
						};
						//寫入權限
						l_permissions.create(iii_data.strAccount, l_obj,
							function (i_permissions) {
								if (i_permissions != null) {
									LOG.warn("AccountPermissions::onServerOpen i_permissions", i_permissions);
								} else
									LOG.error("AccountPermissions::onServerOpen() 寫入權限失敗");
							},
							function () {
								LOG.error("AccountPermissions::onServerOpen() 寫入權限失敗");
							}); //寫入權限失敗
					},
					function () {
						LOG.error("AccountPermissions::onServerOpen() 創建帳號失敗");
					}); //創建帳號失敗
			}
		},
		function () {
			LOG.error("AccountPermissions::onServerOpen() 資料庫發生搜尋錯誤");
		}); //資料庫發生搜尋錯誤
});

/*
//斷線處理
sysEvent.addUserOff(function (i_connObj) {
	//var l_user = SR.Account.getUser(i_connObj.connID);
	//if (l_user != undefined)
	//    SR.Account.delUser(l_user);
	//else
	//    LOG.warn("OnilneUser::addUserOff() 找不到用戶 connID = " + i_connObj.connID);
});
*/

//
// handlers
//

//管理者註冊用戶
l_handlers.Account_admin_addUser = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        strAccount:帳號,
	        strPassword:密碼
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_addUser l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.addUser(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_addUser ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_addUser", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_addUser() 失敗! ");
			i_event.done("Account_admin_addUser", {
				'iReturn': 1
			});
		});
};
//管理者刪除用戶
l_handlers.Account_admin_deleteUser = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        strAccount:帳號,
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	if (l_data.strAccount === 'admin') {
		i_event.done('error operation');
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_deleteUser l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.deleteUser(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_deleteUser ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_deleteUser", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_deleteUser() 失敗! ");
			i_event.done("Account_admin_deleteUser", {
				'iReturn': 1
			});
		}
	);
};
//管理者取得所有使用者列表
l_handlers.Account_admin_listUser = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_listUser l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.listUser(
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_listUser ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_listUser", {
				'objUserInfoAr': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_listUser() 失敗! ");
			i_event.done("Account_admin_listUser", {
				'objUserInfoAr': null
			});
		});
};
//管理者修改用戶密碼
l_handlers.Account_admin_setUserPassword = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        strAccount:帳號,
	        strPassword:密碼
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_setUserPassword l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.setUserPassword(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_setUserPassword ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_setUserPassword", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_setUserPassword() 失敗! ");
			i_event.done("Account_admin_setUserPassword", {
				'iReturn': 1
			});
		});
};
//管理者修改用戶資訊
l_handlers.Account_admin_setUserInfo = function (i_event) {
	var l_data = i_event.data;
	
	if (i_event.data.updateData) {
		l_data = i_event.data.updateData;
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strAccount'://帳號,
	        'strEmail':       //電子信箱
	        'bEmailNotify':   //信箱通知勾選
	        'strPhone':       //電話資料
	        'bSMSNotify':     //簡訊通知勾選
	        'strUserName':    //使用者名稱
	        'strLanguages':   //語系控制
	        'bSystemAegis':   //系統保護
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_setUserInfo l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.setUserInfo(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_setUserInfo ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_setUserInfo", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_setUserInfo() 失敗! ");
			i_event.done("Account_admin_setUserInfo", {
				'iReturn': 1
			});
		});
};
//管理者取得用戶資訊
l_handlers.Account_admin_getUserInfo = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strAccount'://帳號,
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_getUserInfo l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.getUserInfo(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_getUserInfo ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_getUserInfo", {
				'objReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_getUserInfo() 失敗! ");
			i_event.done("Account_admin_getUserInfo", {
				'objReturn': null
			});
		});
};
//管理者修改用戶權限
l_handlers.Account_admin_setUserPermission = function (i_event) {
	var l_data = i_event.data;
	if (i_event.data.updateData) {
		l_data = i_event.data.updateData;
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strAccount'://帳號,
	        'bVideo':           //控制錄影權限
	        'bPlayback':        //操作回放權限
	        'bMoveScale':       //設備位移縮放
	        'bSetDevice':       //新增編輯設備
	        'bAlertEvent':      //警報事件處理
	        'bBackup':          //下載備份權限
	        'bPhotograph':      //拍照畫面權限
	        'bUpdate':          //軟體更新權限
	        'bLogin':           //登入系統權限
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_setUserPermission l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.setUserPermission(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_setUserPermission ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_setUserPermission", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_setUserPermission() 失敗! ");
			i_event.done("Account_admin_setUserPermission", {
				'iReturn': 1
			});
		});
};
//管理者取得用戶權限
l_handlers.Account_admin_getUserPermission = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strAccount'://帳號,
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_getUserPermission l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.getUserPermission(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_getUserPermission ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_getUserPermission", {
				'objReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_getUserPermission() 失敗! ");
			i_event.done("Account_admin_getUserPermission", {
				'objReturn': null
			});
		});
};
//管理者忘記密碼-要求版本號
l_handlers.Account_admin_resetAdminPassword = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	//LOG.warn("handlerPermissions::GetVersionNumber l_data", l_data);

	//會是未登入狀態發送....

	//var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	//if (l_user == undefined)
	//{   //未登入
	//    i_event.done();
	//    return;
	//}
	//------------------------------------------------------------
	SR.Account.admin.resetAdminPassword(
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_resetAdminPassword ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_resetAdminPassword", {
				'objVersionData': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_resetAdminPassword() 失敗! ");
			i_event.done("Account_admin_resetAdminPassword", {
				'objVersionData': null
			});
		});
};
//管理者 - 重設密碼
l_handlers.Account_admin_setAdminPassword = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        strNewPassword:新密碼,
	    }
	*/

	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_admin_setAdminPassword l_data", l_data);
	//------------------------------------------------------------
	SR.Account.admin.setAdminPassword(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_admin_setAdminPassword ii_data", ii_data);
			//回傳
			i_event.done("Account_admin_setAdminPassword", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_admin_setAdminPassword() 失敗! ");
			i_event.done("Account_admin_setAdminPassword", {
				'iReturn': 1
			});
		});
};
//=====================================================================
//管理者取得所有群組列表
l_handlers.Account_group_list = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_list l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.list(
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_list ii_data", ii_data);
			//回傳
			i_event.done("Account_group_list", {
				'objGroupAr': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_list() 失敗! ");
			i_event.done("Account_group_list", {
				'objGroupAr': null
			});
		});
};
//管理者新增群組
l_handlers.Account_group_add = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strGroupName':群組名稱,
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_add l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.add(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_add ii_data", ii_data);
			//回傳
			i_event.done("Account_group_add", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_add() 失敗! ");
			i_event.done("Account_group_add", {
				'iReturn': 1
			});
		});
};
//管理者刪除群組
l_handlers.Account_group_delete = function (i_event) {
	var l_data = {};
	for (var k in i_event.data) {
		l_data[k] = i_event.data[k];
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'groupID':群組ID,
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_delete l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.delete(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_delete ii_data", ii_data);
			//回傳
			i_event.done("Account_group_delete", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_delete() 失敗! ");
			i_event.done("Account_group_delete", {
				'iReturn': 1
			});
		});
};
//管理者取得群組內使用者
l_handlers.Account_group_listUsers = function (i_event) {
	var l_data = {};
	for (var k in i_event.data) {
		l_data[k] = i_event.data[k];
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	{
	        'groupID':群組ID,
	}
	*/
	//console.log(i_event);
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_listUsers l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.listUsers(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_listUsers ii_data", ii_data);
			//回傳
			i_event.done("Account_group_listUsers", {
				'strGroupUserAr': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_listUsers() 失敗! ");
			i_event.done("Account_group_listUsers", {
				'strGroupUserAr': null
			});
		});
};
//管理者取得群組內設備
l_handlers.Account_group_listDevice = function (i_event) {
	var l_data = {};
	for (var k in i_event.data) {
		l_data[k] = i_event.data[k];
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	{
	        'groupID':群組ID,
	}
	*/
	//console.log(i_event);
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_listDevice l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.listDevice(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_listDevice ii_data", ii_data);
			//回傳
			i_event.done("Account_group_listDevice", {
				'strGroupDeviceAr': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_listDevice() 失敗! ");
			i_event.done("Account_group_listDevice", {
				'strGroupDeviceAr': null
			});
		});
};
//管理者新增群組設備
l_handlers.Account_group_addDevice = function (i_event) {
	var l_data = i_event.data;
	l_data.groupID = parseInt(i_event.data.groupID);
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'groupID':群組ID,
	        'deviceId':設備
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_addDevice l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.addDevice(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_addDevice ii_data", ii_data);
			//回傳
			i_event.done("Account_group_addDevice", {
				'iReturn': ii_data
			});
			//RecordTrigger.checkNowRecord(function(){console.log("checkNowRecord done!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_addDevice() 失敗! ");
			i_event.done("Account_group_addDevice", {
				'iReturn': 1
			});
		});
};
//管理者刪除群組設備
l_handlers.Account_group_deleteDevice = function (i_event) {
	var l_data = i_event.data;
	l_data.groupID = parseInt(i_event.data.groupID);
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'groupID':群組ID,
	        'device':設備
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_deleteDevice l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.deleteDevice(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_deleteDevice ii_data", ii_data);
			//回傳
			i_event.done("Account_group_deleteDevice", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_deleteDevice() 失敗! ");
			i_event.done("Account_group_deleteDevice", {
				'iReturn': 1
			});
		});
};
//管理者新增群組使用者
l_handlers.Account_group_addUser = function (i_event) {
	var l_data = i_event.data;
	l_data.groupID = parseInt(i_event.data.groupID);
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'groupID':群組ID,
	        'strAccount':帳號
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_addUser l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.addUser(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_addUser ii_data", ii_data);
			//回傳
			i_event.done("Account_group_addUser", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_addUser() 失敗! ");
			i_event.done("Account_group_addUser", {
				'iReturn': 1
			});
		});
};
//管理者刪除群組使用者
l_handlers.Account_group_deleteUser = function (i_event) {
	var l_data = i_event.data;
	l_data.groupID = parseInt(i_event.data.groupID);
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'groupID':群組ID,
	        'strAccount':帳號
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_deleteUser l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.deleteUser(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_deleteUser ii_data", ii_data);
			//回傳
			i_event.done("Account_group_deleteUser", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_deleteUser() 失敗! ");
			i_event.done("Account_group_deleteUser", {
				'iReturn': 1
			});
		});
};
//管理者重設群組設備
l_handlers.Account_group_setBulkDevice = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'groupID':群組ID,
	        'deviceAr':設備表
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_setBulkDevice l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.setBulkDevice(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_setBulkDevice ii_data", ii_data);
			//回傳
			i_event.done("Account_group_setBulkDevice", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_setBulkDevice() 失敗! ");
			i_event.done("Account_group_setBulkDevice", {
				'iReturn': 1
			});
		});
};
//管理者修改設備名稱
l_handlers.Account_group_setDevice = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        device:設備名稱,
	        strNewDevice:新設備名稱
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_group_setDevice l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.setDevice(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_setDevice ii_data", ii_data);
			//回傳
			i_event.done("Account_group_setDevice", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_setDevice() 失敗! ");
			i_event.done("Account_group_setDevice", {
				'iReturn': 1
			});
		});
};
//管理者修改群組名稱
l_handlers.Account_group_renameGroup = function (i_event) {
	var l_data = i_event.data;
	if (l_data.groupID) {
		l_data.groupID = parseInt(i_event.data.groupID);
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        strOldGroupName:舊的名稱,
	        strNewGroupName:新的名稱
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == null || l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	if (l_user.strAccount != "admin") { //非管理
		i_event.done();
		return;
	}
	LOG.warn("handlerPermissions::Account_group_renameGroup l_data", l_data);
	//------------------------------------------------------------
	SR.Account.group.renameGroup(l_data,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_group_renameGroup ii_data", ii_data);
			//回傳
			i_event.done("Account_group_renameGroup", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_group_renameGroup() 失敗! ");
			i_event.done("Account_group_renameGroup", {
				'iReturn': 1
			});
		});
};
//=====================================================================
//登入帳號
l_handlers.Account_user_login = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        strAccount:帳號,
	        strPassword:密碼
	    }
	*/
	//console.log(i_event);
	LOG.warn("handlerPermissions::Account_user_login l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.login(l_data, i_event.conn,
		function (ii_data) {
			if (ii_data.bForget != undefined) {
				LOG.warn("handlerPermissions::Account_user_login 忘記密碼 ii_data", ii_data);
				//回傳
				i_event.done("ForgetPass", {
					'bForget': true
				});
			}
			else {
				i_event.session['_strUUID'] = ii_data.strUUID;
				//console.log(i_event);
				LOG.warn("handlerPermissions::Account_user_login ii_data", ii_data);
				//回傳
				i_event.done("Account_user_login", {
					'objLogin': ii_data
				});
			}
		},
		function () {
			LOG.error("handlerPermissions::LoginAccount() 失敗! ");
			i_event.done("Account_user_login", {
				'objLogin': null
			});
		});
};
//登出帳號
l_handlers.Account_user_logout = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	//console.log(i_event);
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	LOG.warn("handlerPermissions::Account_user_logout l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.logout(i_event.session['_strUUID'],
		function (ii_data) {
			delete i_event.session['_strUUID'];
			LOG.warn("handlerPermissions::Account_user_logout ii_data", ii_data);
			//回傳
			i_event.done("Account_user_logout", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_user_logout() 失敗! ");
			i_event.done("Account_user_logout", {
				'iReturn': 1
			});
		});
};
//使用者設定帳號資訊
l_handlers.Account_user_setInfo = function (i_event) {
	var l_data = i_event.data;
	if (i_event.data.updateData) {
		l_data = i_event.data.updateData;
	}
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strEmail':       //電子信箱
	        'bEmailNotify':   //信箱通知勾選
	        'strPhone':       //電話資料
	        'bSMSNotify':     //簡訊通知勾選
	        'strUserName':    //使用者名稱
	        'strLanguages':   //語系控制
	        'bSystemAegis':   //系統保護
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_user_setInfo l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.setInfo(l_data, l_user.strAccount,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_user_setInfo ii_data", ii_data);
			//回傳
			i_event.done("Account_user_setInfo", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_user_setInfo() 失敗! ");
			i_event.done("Account_user_setInfo", {
				'iReturn': 1
			});
		});
};
//使用者取得帳號資訊
l_handlers.Account_user_getInfo = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_user_getInfo l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.getInfo(l_user.strAccount,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_user_getInfo ii_data", ii_data);
			//回傳
			i_event.done("Account_user_getInfo", {
				'objInfo': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_user_getInfo() 失敗! ");
			i_event.done("Account_user_getInfo", {
				'objInfo': null
			});
		});
};
//修改密碼(含管理者)
l_handlers.Account_user_setPassword = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 
	    {
	        'strOldPassword':   //原本的密碼
	        'strNewPassword':   //新的密碼
	    }
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_user_setPassword l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.setPassword(l_data, l_user.strAccount,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_user_setPassword ii_data", ii_data);
			//回傳
			i_event.done("Account_user_setPassword", {
				'iReturn': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_user_setPassword() 失敗! ");
			i_event.done("Account_user_setPassword", {
				'iReturn': 1
			});
		});
};
//使用者查看帳號權限
l_handlers.Account_user_getPermission = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_user_getPermission l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.getPermission(l_user.strAccount,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_user_getPermission ii_data", ii_data);
			//回傳
			i_event.done("Account_user_getPermission", {
				'objPermissions': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_user_getPermission() 失敗! ");
			i_event.done("Account_user_getPermission", {
				'objPermissions': null
			});
		});
};
//使用者查看所在哪些群組
l_handlers.Account_user_listGroup = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	if (l_user == undefined) { //未登入
		i_event.done();
		return;
	}
	//LOG.warn("handlerPermissions::Account_user_listGroup l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.listGroup(l_data, l_user.strAccount,
		function (ii_data) {
			LOG.warn("handlerPermissions::Account_user_listGroup ii_data", ii_data);
			//回傳
			i_event.done("Account_user_listGroup", {
				'strGroupAr': ii_data
			});
		},
		function () {
			LOG.error("handlerPermissions::Account_user_listGroup() 失敗! ");
			i_event.done("Account_user_listGroup", {
				'strGroupAr': null
			});
		});
};
//取得是否登入中
l_handlers.Account_user_getLogin = function (i_event) {
	var l_data = i_event.data;
	var l_connId = i_event.conn.connID;
	/*
	l_data = 不需要資料
	*/
	//var l_user = SR.Account.getUserByUUID(i_event.session['_strUUID']);
	//if (l_user == undefined)
	//{   //未登入
	//    i_event.done();
	//    return;
	//}
	//LOG.warn("handlerPermissions::Account_user_getLogin l_data", l_data);
	//------------------------------------------------------------
	SR.Account.user.getLogin(i_event.session['_strUUID'],
		function (ii_data) {
			//LOG.warn("handlerPermissions::Account_user_getLogin ii_data", ii_data);
			//回傳
			if (ii_data != null)
				i_event.done("Account_user_getLogin", {
					'strAccount': ii_data
				});
			else
				i_event.done("Account_user_getLogin", {
					'strAccount': null
				});
		},
		function () {
			//LOG.error("handlerPermissions::Account_user_getLogin() 失敗! ");
			i_event.done("Account_user_getLogin", {
				'strAccount': null
			});
		});
};

//公開物件
SR.Account = new AccountPermissions();
SR.Account.UserInfo = UserInfo;
SR.Account.UserPermissions = UserPermissions;
SR.Account.AccountData = AccountData; 
SR.Account.Admin = Admin;
//SR.Account.Group = Group;
SR.Account.User = User;

// TODO: this may be too Hydra-specific, need to move it

/*
	事件層級：可顯示事件的緊急層級：一般(1)、警告(2)、急迫(3)。
	事件類型：可顯示事件的類型：系統事件(1)、行為事件(2)、設備事件(3)。
*/
//事件
global.g_eventSystemList = [{
	'iInx': 1,
	'strName': "CPU超載"
}, {
	'iInx': 2,
	'strName': "記憶體滿載"
}, {
	'iInx': 3,
	'strName': "硬碟存滿"
}, {
	'iInx': 4,
	'strName': "硬碟壞損"
}, {
	'iInx': 5,
	'strName': "即時輸入頻寬超載"
}, {
	'iInx': 6,
	'strName': "系統開啟"
}, {
	'iInx': 7,
	'strName': "系統關閉"
}, {
	'iInx': 8,
	'strName': "新增設備"
}, {
	'iInx': 9,
	'strName': "移除設備"
}, {
	'iInx': 10,
	'strName': "影像遺失"
}, ];
//事件
global.g_eventActionList = [{
	'iInx': 1,
	'strName': "帳號登入系統"
}, {
	'iInx': 2,
	'strName': "帳號登出系統"
}, {
	'iInx': 3,
	'strName': "帳號編輯錄影設定"
}, {
	'iInx': 4,
	'strName': "帳號操作回放權限"
}, {
	'iInx': 5,
	'strName': "編輯設備位移縮放"
}, {
	'iInx': 6,
	'strName': "編輯影像調整權限"
}, {
	'iInx': 7,
	'strName': "設定設備設定"
}, {
	'iInx': 8,
	'strName': "帳號解除警報"
}, {
	'iInx': 9,
	'strName': "帳號備份下載"
}, {
	'iInx': 10,
	'strName': "帳號使用快照"
}];
//=======================================================================================
//行為事件
function EventAction() {
	//索引要用甚麼?
	this.iEventInx = "";
	//事件名稱
	this.strEventName = "";
	//事件等級 1:一般 2:警告 3:急迫
	this.iEventLevel = 1;
	//事件開關(就開跟關)
	this.bSwitch = false;
	//觸發群組
	this.groupID = "";
	//信箱通知勾選
	this.bEmail = false;
	//簡訊通知
	this.bSMS = false;
	//觸發快照
	this.bSnapshot = false;
	//電子郵件通知管理者
	this.bEmailAdmin = false;
	//簡訊通知管理者
	this.bSMSAdmin = false;
	//畫面外框閃爍紅色線框
	this.bScreenFlash = false;
	//報警提示
	this.bCallPolice = false;
	//畫面彈跳
	this.bScreenBounce = false;
	//回播跳出
	this.bPlaybackJump = false;
	//FTP上傳
	this.bFTP = false;
	//可設定一首MP3上傳檔案(每個事件獨立音檔)。
	this.strMp3 = "";
	//可讓使用者設定播放秒數(開始)
	this.iMp3PlayBin = 0;
	//可讓使用者設定播放秒數(結束)
	this.iMp3PlayEnd = 0;
	//Loop
	this.bLoop = false;
};
//創造資料
EventAction.prototype.create = function (i_iEventInx, i_data, o_onDone, o_onFail) {
		//更新資料
		if (i_iEventInx != undefined)
			this.iEventInx = i_iEventInx;
		aether.copyObj(this, i_data);

		var that = this;
		//新增會員資料
		DB.insertValue('EventAction', that,
			function () {
				o_onDone(that);
			}, o_onFail);
	}
	//取得資料
	//str i_strUserAccount: 使用者帳號
	//function o_onDone(object i_data): 成功處理函式
	//function o_onFail():              失敗處理函式
EventAction.prototype.get = function (i_iEventInx, o_onDone, o_onFail) {
	if (i_iEventInx != undefined)
		this.iEventInx = i_iEventInx;
	//取得不到，就依現有資料直接新增
	DB.selectOrInsertValue('EventAction', {
		'iEventInx': i_iEventInx
	}, this, o_onDone, o_onFail);
};
//更新資料
EventAction.prototype.update = function (i_data, o_onDone, o_onFail) {
	aether.copyObj(this, i_data);
	DB.updateValue('EventAction', {
		'iEventInx': this.iEventInx
	}, this, o_onDone, o_onFail);
};
//取得編輯資料
EventAction.prototype.getEditData = function () {
	var l_obj = aether.toObj(this);
	delete l_obj['bSwitch'];

	return l_obj;
};
//=======================================================================================
//系統事件
function EventSystem() {
	//索引要用甚麼?
	this.iEventInx = "";
	//事件名稱
	this.strEventName = "";
	//事件等級 1:一般 2:警告 3:急迫
	this.iEventLevel = 1;
	//事件開關(就開跟關)
	this.bSwitch = false;
	//觸發群組
	this.groupID = "";
	//信箱通知勾選
	this.bEmail = false;
	//簡訊通知
	this.bSMS = false;
	//觸發快照
	this.bSnapshot = false;
	//電子郵件通知管理者
	this.bEmailAdmin = false;
	//簡訊通知管理者
	this.bSMSAdmin = false;
	//畫面外框閃爍紅色線框
	this.bScreenFlash = false;
	//報警提示
	this.bCallPolice = false;
	//畫面彈跳
	this.bScreenBounce = false;
	//回播跳出
	this.bPlaybackJump = false;
	//FTP上傳
	this.bFTP = false;
	//可設定一首MP3上傳檔案(每個事件獨立音檔)。
	this.strMp3 = "";
	//可讓使用者設定播放秒數(開始)
	this.iMp3PlayBin = 0;
	//可讓使用者設定播放秒數(結束)
	this.iMp3PlayEnd = 0;
	//Loop
	this.bLoop = false;
};
//創造資料
EventSystem.prototype.create = function (i_iEventInx, i_data, o_onDone, o_onFail) {
		//更新資料
		if (i_iEventInx != undefined)
			this.iEventInx = i_iEventInx;
		aether.copyObj(this, i_data);

		var that = this;
		//新增會員資料
		DB.insertValue('EventSystem', that,
			function () {
				o_onDone(that);
			}, o_onFail);
	}
	//取得資料
	//str i_strUserAccount: 使用者帳號
	//function o_onDone(object i_data): 成功處理函式
	//function o_onFail():              失敗處理函式
EventSystem.prototype.get = function (i_iEventInx, o_onDone, o_onFail) {
	if (i_iEventInx != undefined)
		this.iEventInx = i_iEventInx;
	//取得不到，就依現有資料直接新增
	DB.selectOrInsertValue('EventSystem', {
		'iEventInx': i_iEventInx
	}, this, o_onDone, o_onFail);
};
//更新資料
EventSystem.prototype.update = function (i_data, o_onDone, o_onFail) {
	aether.copyObj(this, i_data);
	DB.updateValue('EventSystem', {
		'iEventInx': this.iEventInx
	}, this, o_onDone, o_onFail);
};
//取得編輯資料
EventSystem.prototype.getEditData = function () {
	var l_obj = aether.toObj(this);
	delete l_obj['bSwitch'];

	return l_obj;
};
//-------------------------------------------------
//設備事件
function EventDevice() {
	//索引要用甚麼?
	this.iEventInx = "";
	//事件名稱
	this.strEventName = "";
	//事件等級 1:一般 2:警告 3:急迫
	this.iEventLevel = 1;
	//事件開關(false:等同於刪除，不使用DB真正刪除，也就不顯示)
	this.bSwitch = true;
	//觸發項目
	this.strTriggerMode = "";
	//觸發設備
	this.strTriggerDevice = "";
	//觸發頻道
	this.strTriggerChannel = "";
	//觸發群組
	this.groupID = "";
	//信箱通知勾選
	this.bEmail = false;
	//簡訊通知
	this.bSMS = false;
	//電子郵件通知管理者
	this.bEmailAdmin = false;
	//簡訊通知管理者
	this.bSMSAdmin = false;
	//觸發快照
	this.bSnapshot = false;
	//報警提示
	this.bCallPolice = false;
	//畫面彈跳
	this.bScreenBounce = false;
	//回播跳出
	this.bPlaybackJump = false;
	//畫面外框閃爍紅色線框
	this.bScreenFlash = false;
	//FTP上傳
	this.bFTP = false;
	//可設定一首MP3上傳檔案(每個事件獨立音檔)。
	this.strMp3 = "";
	//可讓使用者設定播放秒數(開始)
	this.iMp3PlayBin = 0;
	//可讓使用者設定播放秒數(結束)
	this.iMp3PlayEnd = 0;
	//Loop
	this.bLoop = false;
};
//創造資料
EventDevice.prototype.create = function (i_data, o_onDone, o_onFail) {
		//更新資料
		aether.copyObj(this, i_data);

		var that = this;
		//取得新編號
		DB.getCollectionCount('EventDevice',
			function (i_iCount) {
				if (i_iCount == null)
					i_iCount = 0;
				//創造
				that.iEventInx = ++i_iCount;
				//新增資料
				DB.insertValue('EventDevice', that,
					function () {
						o_onDone(that);
					}, o_onFail);
			}, o_onFail);
	}
	//取得資料
	//str i_strUserAccount: 使用者帳號
	//function o_onDone(object i_data): 成功處理函式
	//function o_onFail():              失敗處理函式
EventDevice.prototype.get = function (i_iEventInx, o_onDone, o_onFail) {
	if (i_iEventInx != undefined)
		this.iEventInx = i_iEventInx;
	//取得不到，就依現有資料直接新增
	DB.selectOrInsertValue('EventDevice', {
		'iEventInx': i_iEventInx
	}, this, o_onDone, o_onFail);
};
//更新資料
EventDevice.prototype.update = function (i_data, o_onDone, o_onFail) {
	aether.copyObj(this, i_data);
	DB.updateValue('EventDevice', {
		'iEventInx': this.iEventInx
	}, this, o_onDone, o_onFail);
};
//取得標題資料
EventDevice.prototype.getTitleData = function () {
	var l_obj = {
		//事件名稱
		'strEventName': this.strEventName,
		//事件等級 1:一般 2:警告 3:急迫
		'iEventLevel': this.iEventLevel
	};

	return l_obj;
};
//取得編輯資料
EventDevice.prototype.getEditData = function () {
	var l_obj = aether.toObj(this);
	delete l_obj['bSwitch'];

	return l_obj;
};
//=======================================================================================================
//FTP設定
function CFTPSetting() {
	this.strSearchKey = "FTPSetting", //搜尋用的KEY
		this.strHost = "", //網址
		this.strUser = ""; //使用者
	this.strPassword = "", //密碼
		this.strPath = "/" //路徑
};
//
CFTPSetting.prototype.get = function (i_strSearchKey, o_onDone, o_onFail) {
	if (i_strSearchKey != undefined)
		this.strSearchKey = i_strSearchKey;
	//取得不到，就依現有資料直接新增
	DB.selectOrInsertValue('FTPSetting', {
		'strSearchKey': this.strSearchKey
	}, this, o_onDone, o_onFail);
};
//更新資料
CFTPSetting.prototype.update = function (o_onDone, o_onFail) {
	DB.updateValue('FTPSetting', {
		'strSearchKey': this.strSearchKey
	}, this, o_onDone, o_onFail);
};
//=======================================================================================================
//事件觸發
function EventTrigger() {};
//public:------------------------------------------------------------------------------------------------
//==================================================================
//取得全部事件列表
EventTrigger.prototype.getEventList = function (o_onDone, o_onFail) {
	var that = this;
	var l_obj = {
		'objEventDeviceAr': null,
		'objEventActionAr': null,
		'objEventSystemAr': null
	};
	that.getEventDeviceList(
		function (ii_dataDeviceAr) {
			l_obj.objEventDeviceAr = ii_dataDeviceAr;
			that.getEventActionList(
				function (ii_dataActionAr) {
					l_obj.objEventActionAr = ii_dataActionAr;
					that.getEventSystemList(
						function (ii_dataSystemAr) {
							l_obj.objEventSystemAr = ii_dataSystemAr;
							o_onDone(l_obj);
						}, o_onFail);
				}, o_onFail);
		}, o_onFail);
};
//取得設備事件列表
EventTrigger.prototype.getEventDeviceList = function (o_onDone, o_onFail) {
	var that = this;
	//列表
	DB.selectArray('EventDevice', {
			'bSwitch': true
		},
		function (ii_dataAr) {
			log.Json("EventTrigger::getEventDeviceList ii_dataAr", ii_dataAr);
			var l_objAr = [];
			var l_iLoop = 0;
			while (l_iLoop < ii_dataAr.length) {
				var l_obj = {
					//類型
					'iType': 3,
					//索引
					'iEventInx': ii_dataAr[l_iLoop].iEventInx,
					//事件名稱
					'strEventName': ii_dataAr[l_iLoop].strEventName,
					//事件等級 1:一般 2:警告 3:急迫
					'iEventLevel': ii_dataAr[l_iLoop].iEventLevel
				};
				l_objAr.push(l_obj);
				++l_iLoop;
			}
			o_onDone(l_objAr); //
		}, o_onFail); //
};
//取得行為事件列表
EventTrigger.prototype.getEventActionList = function (o_onDone, o_onFail) {
	var that = this;
	//列表
	DB.fromArray('EventAction',
		function (ii_dataAr) {
			log.Json("EventTrigger::getEventActionList ii_dataAr", ii_dataAr);
			var l_objAr = [];
			var l_iLoop = 0;
			while (l_iLoop < ii_dataAr.length) {
				var l_obj = {
					//類型
					'iType': 2,
					//索引
					'iEventInx': ii_dataAr[l_iLoop].iEventInx,
					//事件名稱
					'strEventName': ii_dataAr[l_iLoop].strEventName,
					//事件等級 1:一般 2:警告 3:急迫
					'iEventLevel': ii_dataAr[l_iLoop].iEventLevel,
					//事件開關
					'bSwitch': ii_dataAr[l_iLoop].bSwitch
				};
				l_objAr.push(l_obj);
				++l_iLoop;
			}
			o_onDone(l_objAr); //
		}, o_onFail); //
};
//取得系統事件列表
EventTrigger.prototype.getEventSystemList = function (o_onDone, o_onFail) {
	//列表
	DB.fromArray('EventSystem',
		function (ii_dataAr) {
			log.Json("EventTrigger::getEventSystemList ii_dataAr", ii_dataAr);
			var l_objAr = [];
			var l_iLoop = 0;
			while (l_iLoop < ii_dataAr.length) {
				var l_obj = {
					//類型
					'iType': 1,
					//索引
					'iEventInx': ii_dataAr[l_iLoop].iEventInx,
					//事件名稱
					'strEventName': ii_dataAr[l_iLoop].strEventName,
					//事件等級 1:一般 2:警告 3:急迫
					'iEventLevel': ii_dataAr[l_iLoop].iEventLevel,
					//事件開關
					'bSwitch': ii_dataAr[l_iLoop].bSwitch
				};
				l_objAr.push(l_obj);
				++l_iLoop;
			}
			o_onDone(l_objAr); //
		}, o_onFail); //
};
//新增設備事件
EventTrigger.prototype.addEventDevice = function (i_data, o_onDone, o_onFail) {
	/*
   i_data = 
   {
   'strEventName':事件名稱
   }
   */
	var that = this;
	DB.selectValue('EventDevice', {
			'strEventName': i_data.strEventName,
			'bSwitch': true
		},
		function (ii_data) {
			log.Json("EventTrigger::addEventDevice in ii_data", ii_data);
			if (ii_data != null) //有資料
			{
				o_onDone(1); //沒資料
			} else { //創造
				var l_event = new EventDevice();
				l_event.create(i_data,
					function (ii_dataEvt) {
						//that.getEventList(
						//    function (ii_dataObj)
						//    { 
						//        o_onDone(ii_dataObj);
						//    }, o_onFail);
						o_onDone(0);
					}, o_onFail);
			}
		}, o_onFail); //資料庫發生搜尋錯誤
};
//刪除設備事件
EventTrigger.prototype.delEventDevice = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'strEventName':事件名稱
	}
	*/
	var that = this;
	//更新
	DB.updateValue('EventDevice', {
			'strEventName': i_data.strEventName,
			'bSwitch': true
		}, {
			'bSwitch': false
		},
		function (ii_data) {
			o_onDone(0);
		}, o_onFail);
};
//開關事件-窗口
EventTrigger.prototype.switchEvent = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'iType':類型,
	'strEventName':事件名稱,
	'bSwitch':開關狀態
	}
	*/
	var that = this;
	switch (i_data.iType) {
	case 1:
		that.switchSystemEvent(i_data, o_onDone, o_onFail);
		break;
	case 2:
		that.switchActionEvent(i_data, o_onDone, o_onFail);
		break;
	default:
		o_onDone(1);
		break;
	}
};
//開關行為事件
EventTrigger.prototype.switchActionEvent = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'strEventName':事件名稱,
	'bSwitch':開關狀態
	}
	*/
	var that = this;
	//檢查
	DB.selectValue('EventAction', {
			'strEventName': i_data.strEventName
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{
				//更新
				DB.updateValue('EventAction', {
						'strEventName': i_data.strEventName
					}, {
						'bSwitch': i_data.bSwitch
					},
					function (ii_data) {
						o_onDone(0);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(1);
			}
		}, o_onFail);
};
//開關系統事件
EventTrigger.prototype.switchSystemEvent = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'strEventName':事件名稱,
	'bSwitch':開關狀態
	}
	*/
	var that = this;
	//檢查
	DB.selectValue('EventSystem', {
			'strEventName': i_data.strEventName
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{
				//更新
				DB.updateValue('EventSystem', {
						'strEventName': i_data.strEventName
					}, {
						'bSwitch': i_data.bSwitch
					},
					function (ii_data) {
						o_onDone(0);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(1);
			}
		}, o_onFail);
};
//設定(編輯)事件-統一窗口
EventTrigger.prototype.setEventInfo = function (i_iType, i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'iType':類型,
	'data':資料
	}
	*/
	var that = this;
	switch (i_iType) {
	case 1:
		that.setEventSystem(i_data, o_onDone, o_onFail);
		break;
	case 2:
		that.setEventAction(i_data, o_onDone, o_onFail);
		break;
	case 3:
		that.setEventDevice(i_data, o_onDone, o_onFail);
		break;
	default:
		o_onDone(1);
		break;
	}
};
//設定設備事件
EventTrigger.prototype.setEventDevice = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//檢查
	DB.selectValue('EventDevice', {
			'strEventName': i_data.strEventName,
			'bSwitch': true
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //更新
				DB.updateValue('EventDevice', {
						'strEventName': i_data.strEventName,
						'bSwitch': true
					}, i_data,
					function (iii_data) {
						o_onDone(0);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(1);
			}
		}, o_onFail);
};
//設定行為事件
EventTrigger.prototype.setEventAction = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//檢查
	DB.selectValue('EventAction', {
			'strEventName': i_data.strEventName
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //更新
				DB.updateValue('EventAction', {
						'strEventName': i_data.strEventName
					}, i_data,
					function (iii_data) {
						o_onDone(0);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(1);
			}
		}, o_onFail);
};
//設定系統事件
EventTrigger.prototype.setEventSystem = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//檢查
	DB.selectValue('EventSystem', {
			'strEventName': i_data.strEventName
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //更新
				DB.updateValue('EventSystem', {
						'strEventName': i_data.strEventName
					}, i_data,
					function (iii_data) {
						o_onDone(0);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(1);
			}
		}, o_onFail);
};
//取得(編輯)事件資料-統一窗口
EventTrigger.prototype.getEventInfo = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'iType':類型,
	'strEventName':事件名稱
	}
	*/
	var that = this;
	switch (i_data.iType) {
	case 1:
		that.getEventSystem(i_data, o_onDone, o_onFail);
		break;
	case 2:
		that.getEventAction(i_data, o_onDone, o_onFail);
		break;
	case 3:
		that.getEventDevice(i_data, o_onDone, o_onFail);
		break;
	default:
		o_onDone(1);
		break;
	}
};
//取得設備(編輯)事件資料
EventTrigger.prototype.getEventDevice = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//檢查
	DB.selectValue('EventDevice', {
			'strEventName': i_data.strEventName,
			'bSwitch': true
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //
				delete ii_data['bSwitch'];
				o_onDone(ii_data);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//取得行為(編輯)事件資料
EventTrigger.prototype.getEventAction = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//檢查
	DB.selectValue('EventAction', {
			'strEventName': i_data.strEventName
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //
				delete ii_data['bSwitch'];
				o_onDone(ii_data);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//取得系統(編輯)事件資料
EventTrigger.prototype.getEventSystem = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//檢查
	DB.selectValue('EventSystem', {
			'strEventName': i_data.strEventName
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //
				delete ii_data['bSwitch'];
				o_onDone(ii_data);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//觸發事件
EventTrigger.prototype.onEvent = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
		'iType':類型：系統事件(1)、行為事件(2)、設備事件(3)。
		'iEventInx':事件索引 *行為、系統用欄位
		'strTime':時間：西元年月日時分秒
		'strTriggerMode':觸發項目：*設備觸發用欄位
		'strTriggerDevice':觸發設備：*設備觸發用欄位
		'strTriggerChannel':觸發頻道：*設備觸發用欄位
		'strText':內容：
	}
	*/
	//記錄事件
	var that = this;
	switch (i_data.iType) {
	case 1:
		that.onEventSystem(i_data,
			function (ii_data) {
				o_onDone(ii_data);
			}, o_onFail);
		break;
	case 2:
		that.onEventAction(i_data,
			function (ii_data) {
				o_onDone(ii_data);
			}, o_onFail);
		break;
	case 3:
		that.onEventDevice(i_data,
			function (ii_data) {
				o_onDone(ii_data);
			}, o_onFail);
		break;
	default:
		o_onDone(1);
		break;
	}
};
//取得多個設備群組使用者-遞回處理
EventTrigger.prototype.getGroupAccountInfo = function (i_data, i_eventAr, i_iCount, i_returnAr, o_onDone, o_onFail) {
	var that = this;
	if (i_eventAr[i_iCount].iEventLevel == 1) //層級：一般(1)
	{
		that.saveEventLog(i_data, i_eventAr[i_iCount],
			function () {
				that.onTrigger(i_eventAr[i_iCount],
					function (ii_trigger) {
						log.Warning("EventTrigger::getGroupAccountInfo() 取得 第" + i_iCount + "個 事件設備群組使用者  處理成功! ");
						i_returnAr.push(ii_trigger);
						++i_iCount;

						if (i_iCount == i_eventAr.length) {
							o_onDone(i_returnAr);
							return;
						} else {
							that.getGroupAccountInfo(i_data, i_eventAr, i_iCount, i_returnAr, o_onDone, o_onFail);
						}
					}, o_onFail);
			}, o_onFail);
	} else //警告(2)、急迫(3)
	{
		that.saveEventLog(i_data, i_eventAr[i_iCount],
			function () {
				that.saveWarningLog(i_data, i_eventAr[i_iCount],
					function () {
						that.onTrigger(i_eventAr[i_iCount],
							function (ii_trigger) {
								log.Warning("EventTrigger::getGroupAccountInfo() 取得 第" + i_iCount + "個 事件設備群組使用者  處理成功! ");
								i_returnAr.push(ii_trigger);
								++i_iCount;

								if (i_iCount == i_eventAr.length) {
									o_onDone(i_returnAr);
									return;
								} else {
									that.getGroupAccountInfo(i_data, i_eventAr, i_iCount, i_returnAr, o_onDone, o_onFail);
								}
							}, o_onFail);
					}, o_onFail);
			}, o_onFail);
	}
};
//觸發設備事件
EventTrigger.prototype.onEventDevice = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//搜尋DB是否有相關項目
	//檢查
	DB.selectArray('EventDevice', {
			'strTriggerMode': i_data.strTriggerMode,
			'strTriggerDevice': i_data.strTriggerDevice,
			'strTriggerChannel': i_data.strTriggerChannel,
			'bSwitch': true
		},
		function (ii_dataEventAr) {
			if (ii_dataEventAr != null) //在的話
			{
				if (ii_dataEventAr.length == 0) {
					o_onDone(null);
					return;
				}
				//log.Json("EventTrigger::onEventDevice ii_dataEventAr", ii_dataEventAr);
				//觸發設備錄影開始
				RecordTrigger.onEventRecord(ii_dataEventAr,
					function () {},
					function () {});
				//群組內所有人的 信箱 電話 要一起傳出去
				var l_iCount = 0;
				var l_objTriggerAr = [];
				that.getGroupAccountInfo(i_data, ii_dataEventAr, l_iCount, l_objTriggerAr,
					function (ii_objTriggerAr) {
						o_onDone(ii_objTriggerAr);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//觸發行為事件
EventTrigger.prototype.onEventAction = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//搜尋DB是否有相關項目
	//檢查
	DB.selectValue('EventAction', {
			'iEventInx': i_data.iEventInx,
			'bSwitch': true
		},
		function (ii_dataEvent) {
			if (ii_dataEvent != null) //在的話
			{
				if (ii_dataEvent.iEventLevel == 1) //層級：一般(1)
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.onTrigger(ii_dataEvent,
								function (ii_trigger) {
									var l_objTriggerAr = [];
									l_objTriggerAr.push(ii_trigger);
									o_onDone(l_objTriggerAr);
								}, o_onFail);
						}, o_onFail);
				} else //警告(2)、急迫(3)
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.saveWarningLog(i_data, ii_dataEvent,
								function () {
									that.onTrigger(ii_dataEvent,
										function (ii_trigger) {
											var l_objTriggerAr = [];
											l_objTriggerAr.push(ii_trigger);
											o_onDone(l_objTriggerAr);
										}, o_onFail);
								}, o_onFail);
						}, o_onFail);
				}
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//觸發系統事件
EventTrigger.prototype.onEventSystem = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//搜尋DB是否有相關項目
	//檢查
	DB.selectValue('EventSystem', {
			'iEventInx': i_data.iEventInx,
			'bSwitch': true
		},
		function (ii_dataEvent) {
			if (ii_dataEvent != null) //在的話
			{ //新增資料
				if (ii_dataEvent.iEventLevel == 1) //層級：一般(1)
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.onTrigger(ii_dataEvent,
								function (ii_trigger) {
									var l_objTriggerAr = [];
									l_objTriggerAr.push(ii_trigger);
									o_onDone(l_objTriggerAr);
								}, o_onFail);
						}, o_onFail);
				} else //警告(2)、急迫(3)
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.saveWarningLog(i_data, ii_dataEvent,
								function () {
									that.onTrigger(ii_dataEvent,
										function (ii_trigger) {
											var l_objTriggerAr = [];
											l_objTriggerAr.push(ii_trigger);
											o_onDone(l_objTriggerAr);
										}, o_onFail);
								}, o_onFail);
						}, o_onFail);
				}
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//觸發回傳
EventTrigger.prototype.onTrigger = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//通知
	SR.Account.getGroupAccountInfo({
			'groupID': i_data.groupID
		},
		function (ii_dataAr) {
			//log.Json("EventTrigger::onTrigger ii_dataAr", ii_dataAr);

			var l_objDataAr = [];
			var l_iLoop = 0;
			while (l_iLoop < ii_dataAr.length) {
				var l_obj = {
					'strEmail': "",
					'strPhone': ""
				};
				if (i_data.bEmail == true) {
					if (ii_dataAr[l_iLoop].bEmailNotify == true)
						l_obj.strEmail = ii_dataAr[l_iLoop].strEmail;
				}
				if (i_data.bSMS == true) {
					if (ii_dataAr[l_iLoop].bSMSNotify == true)
						l_obj.strPhone = ii_dataAr[l_iLoop].strPhone;
				}
				l_objDataAr.push(l_obj);
				++l_iLoop;
			};
			var l_objAdmin = {
				'strEmail': "",
				'strPhone': ""
			};
			SR.Account.user.getInfo("admin",
				function (ii_info) {
					if (i_data.bEmailAdmin == true) {
						if (ii_info.bEmailNotify)
							l_objAdmin.strEmail = ii_info.strEmail;
					}
					if (i_data.bSMSAdmin == true) {
						if (ii_info.bSMSNotify == true)
							l_objAdmin.strPhone = ii_info.strPhone;
					}
					l_objDataAr.push(l_objAdmin);
					//回傳要觸發項目
					var l_objTrigger = {
						'objEvent': i_data,
						'objTriggerAr': l_objDataAr
					};
					o_onDone(l_objTrigger);
				}, o_onFail);
		},
		function (i_str) {
			o_onFail(i_str);
		});
};
//觸發事件結束
EventTrigger.prototype.onEventEnd = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
		'iType':類型：系統事件(1)、行為事件(2)、設備事件(3)。
		'iEventInx':事件索引 *行為、系統用欄位
		'strTime':時間：西元年月日時分秒
		'strTriggerMode':觸發項目：*設備觸發用欄位
		'strTriggerDevice':觸發設備：*設備觸發用欄位
		'strTriggerChannel':觸發頻道：*設備觸發用欄位
		'strText':內容：
	}
	*/
	//記錄事件
	var that = this;
	switch (i_data.iType) {
	case 1:
		that.onEventSystemEnd(i_data,
			function (ii_data) {
				o_onDone(ii_data);
			}, o_onFail);
		break;
	case 2:
		that.onEventActionEnd(i_data,
			function (ii_data) {
				o_onDone(ii_data);
			}, o_onFail);
		break;
	case 3:
		that.onEventDeviceEnd(i_data,
			function (ii_data) {
				o_onDone(ii_data);
			}, o_onFail);
		break;
	default:
		o_onDone(1);
		break;
	}
};
//觸發設備事件結束
EventTrigger.prototype.onEventDeviceEnd = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//搜尋DB是否有相關項目
	//檢查
	DB.selectArray('EventDevice', {
			'strTriggerMode': i_data.strTriggerMode,
			'strTriggerDevice': i_data.strTriggerDevice,
			'strTriggerChannel': i_data.strTriggerChannel,
			'bSwitch': true
		},
		function (ii_dataEventAr) {
			if (ii_dataEventAr != null) //在的話
			{
				if (ii_dataEventAr.length == 0) {
					o_onDone(null);
					return;
				}
				log.Json("EventTrigger::onEventDevice ii_dataEventAr", ii_dataEventAr);
				//觸發設備錄影結束
				RecordTrigger.onEventRecordEnd(ii_dataEventAr,
					function () {},
					function () {});
				//群組內所有人的 信箱 電話 要一起傳出去
				var l_iCount = 0;
				var l_objTriggerAr = [];
				that.getGroupAccountInfo(i_data, ii_dataEventAr, l_iCount, l_objTriggerAr,
					function (ii_objTriggerAr) {
						o_onDone(ii_objTriggerAr);
					}, o_onFail);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//觸發行為事件結束
EventTrigger.prototype.onEventActionEnd = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//搜尋DB是否有相關項目
	//檢查
	DB.selectValue('EventAction', {
			'iEventInx': i_data.iEventInx,
			'bSwitch': true
		},
		function (ii_dataEvent) {
			if (ii_dataEvent != null) //在的話
			{
				/*                    if (ii_dataEvent.iEventLevel == 1)//層級：一般(1)
									{
										that.saveEventLog(i_data, ii_dataEvent,
											function ()
											{
												that.onTrigger(ii_dataEvent,
													function (ii_trigger)
													{
														var l_objTriggerAr = [];
														l_objTriggerAr.push(ii_trigger);
														o_onDone(l_objTriggerAr);
													}, o_onFail);
											}, o_onFail);
									} else//警告(2)、急迫(3)
				*/
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.saveWarningLog(i_data, ii_dataEvent,
								function () {
									that.onTrigger(ii_dataEvent,
										function (ii_trigger) {
											var l_objTriggerAr = [];
											l_objTriggerAr.push(ii_trigger);
											o_onDone(l_objTriggerAr);
										}, o_onFail);
								}, o_onFail);
						}, o_onFail);
				}
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//觸發系統事件結束
EventTrigger.prototype.onEventSystemEnd = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//搜尋DB是否有相關項目
	//檢查
	DB.selectValue('EventSystem', {
			'iEventInx': i_data.iEventInx,
			'bSwitch': true
		},
		function (ii_dataEvent) {
			if (ii_dataEvent != null) //在的話
			{ //新增資料
				if (ii_dataEvent.iEventLevel == 1) //層級：一般(1)
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.onTrigger(ii_dataEvent,
								function (ii_trigger) {
									var l_objTriggerAr = [];
									l_objTriggerAr.push(ii_trigger);
									o_onDone(l_objTriggerAr);
								}, o_onFail);
						}, o_onFail);
				} else //警告(2)、急迫(3)
				{
					that.saveEventLog(i_data, ii_dataEvent,
						function () {
							that.saveWarningLog(i_data, ii_dataEvent,
								function () {
									that.onTrigger(ii_dataEvent,
										function (ii_trigger) {
											var l_objTriggerAr = [];
											l_objTriggerAr.push(ii_trigger);
											o_onDone(l_objTriggerAr);
										}, o_onFail);
								}, o_onFail);
						}, o_onFail);
				}
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//記錄
EventTrigger.prototype.saveLog = function (i_obj, o_onDone, o_onFail) {
	var that = this;
	//取得新編號
	DB.getCollectionCount('Log_Event',
		function (ii_iCount) {
			if (ii_iCount == null)
				ii_iCount = 0;
			//索引
			i_obj.iEventInx = ++ii_iCount;
			DB.insertValue('Log_Event', i_obj,
				function () {
					o_onDone();
				}, o_onFail);
		}, o_onFail);
};
//記錄歷史事件
EventTrigger.prototype.saveEventLog = function (i_data, i_event, o_onDone, o_onFail) {
	var that = this;
	var l_iTime = parseInt(i_data.strTime, 10);
	var l_strTime = AeDate.toStringFromNumber(l_iTime);
	var l_obj = {
		'iEventInx': -1, //索引
		'iEventLevel': i_event.iEventLevel, //層級：一般、警告、急迫。
		'iType': i_data.iType, //類型：系統事件、行為事件、設備事件。
		'strEventName': i_event.strEventName, //名稱
		'strText': "", //處理說明
		'iTime': l_iTime, //數字時間
		'strTimeBin': l_strTime //字串時間
	};
	var l_strGroupName = "";
	DB.selectValue('GroupName', {
			'groupID': i_event.groupID,
			'bDelete': false
		},
		function (ii_data) {
			if (ii_data != null) //
			{
				l_strGroupName = ii_data.strGroupName;
				switch (i_data.iType) //類型：系統事件、行為事件、設備事件。
				{
				case 1:
					l_obj.strText = g_eventSystemList[i_data.iEventInx - 1].strName + " : " + i_data.strText;
					break;
				case 2:
					l_obj.strText = g_eventActionList[i_data.iEventInx - 1].strName + " : " + i_data.strText;
					break;
				case 3:
					l_obj.strText = "發生[" + i_event.strEventName + "]，群組名稱：" + l_strGroupName;
					break;
				default:
					log.Warning("EventTrigger::saveEventLog() 編號異常 i_data.iType = " + i_data.iType);
					break;
				}
				that.saveLog(l_obj,
					function () {
						o_onDone();
					}, o_onFail);
			} else {
				l_strGroupName = "名稱讀取錯誤 群組編號 = " + i_event.groupID;
				switch (i_data.iType) //類型：系統事件、行為事件、設備事件。
				{
				case 1:
					l_obj.strText = g_eventSystemList[i_data.iEventInx - 1].strName + " : " + i_data.strText;
					break;
				case 2:
					l_obj.strText = g_eventActionList[i_data.iEventInx - 1].strName + " : " + i_data.strText;
					break;
				case 3:
					l_obj.strText = "發生[" + i_event.strEventName + "]，群組名稱：" + l_strGroupName;
					break;
				default:
					log.Warning("EventTrigger::saveEventLog() 編號異常 i_data.iType = " + i_data.iType);
					break;
				}
				that.saveLog(l_obj,
					function () {
						o_onDone();
					}, o_onFail);
			}
		}, o_onFail);
};
//記錄警報事件
EventTrigger.prototype.saveWarningLog = function (i_data, i_event, o_onDone, o_onFail) {
	var that = this;
	var l_iTime = parseInt(i_data.strTime, 10);
	var l_strTimeBin = AeDate.toStringFromNumber(l_iTime);
	//新增資料
	var l_obj = {
		'iEventInx': -1, //索引
		'iEventLevel': i_event.iEventLevel, //層級：一般、警告、急迫。
		'iType': i_data.iType, //類型：系統事件、行為事件、設備事件。
		'strEventName': i_event.strEventName, //名稱
		'iTimeBin': l_iTime, //發生時間
		'strAccount': "", //處理帳號名稱。
		'strTimeEnd': "未處理", //處理時間
		'strText': "", //處理說明：讓使用者可填寫處理事件說明。
		'bEdit': false, //是否編輯過
		'strTimeBin': l_strTimeBin //字串時間
	};
	//取得新編號
	DB.getCollectionCount('Log_EventWarning',
		function (ii_iCount) {
			if (ii_iCount == null)
				ii_iCount = 0;
			//索引
			l_obj.iEventInx = ++ii_iCount;
			//新增資料
			DB.insertValue('Log_EventWarning', l_obj,
				function () {
					o_onDone();
				}, o_onFail);
		}, o_onFail);
};
//警報事件編輯(編輯/添加)
EventTrigger.prototype.setWarningInfo = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'iEventInx':索引
	'strAccount':處理帳號：顯示處理帳號名稱。
	'strTimeEnd':處理時間：顯示已處理的時間 20150625140822 西元年/月/日/時/分/秒。
	'strText':處理說明：讓使用者可填寫處理事件說明。
	}
	*/
	var that = this;
	//
	//檢查
	DB.selectValue('Log_EventWarning', {
			'iEventInx': i_data.iEventInx
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{ //更新
				aether.copyObj(ii_data, i_data);
				if (ii_data.bEdit == false) //未曾編輯
				{
					ii_data.strTimeEnd = i_data.strTimeEnd;
					ii_data.bEdit = true;
					DB.updateValue('Log_EventWarning', {
							'iEventInx': i_data.iEventInx
						}, ii_data,
						function (iii_data) {
							o_onDone(0);
						}, o_onFail);
				} else {
					//取得新編號
					DB.getCollectionCount('Log_EventWarning',
						function (i_iCount) {
							if (i_iCount == null)
								i_iCount = 0;
							//創造
							ii_data.iEventInx = ++i_iCount;
							//新增資料
							DB.insertValue('Log_EventWarning', ii_data,
								function () {
									o_onDone(0);
								}, o_onFail);
						}, o_onFail);
				}
			} else //不在的話
			{
				o_onDone(1);
			}
		}, o_onFail);
};
//警報事件查看
EventTrigger.prototype.getWarningInfo = function (i_data, o_onDone, o_onFail) {
	/*
	i_data = 
	{
	'iEventInx':索引
	}
	*/
	var that = this;
	//
	//檢查
	DB.selectValue('Log_EventWarning', {
			'iEventInx': i_data.iEventInx
		},
		function (ii_data) {
			if (ii_data != null) //在的話
			{
				o_onDone(ii_data);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//警報搜尋事件
EventTrigger.prototype.searchWarningLog = function (i_data, o_onDone, o_onFail) {
	/*
	7.3.1 收尋項目：
	'strTimeBin':時間區段：可選擇起始時間與終止時間搜尋這段時間的事件。西元年/月/日
	'strTimeEnd':
	'iEventLevel':事件層級：可選擇事件的緊急層級：全部(警告+急迫)(4)、一般(1)、警告(2)、急迫(3)。
	'iType':事件類型：可選擇事件的類型：全部(4)、系統事件(1)、行為事件(2)、設備事件(3)。
	7.3.2 查看項目：
	查看事件處理狀況。
	事件層級：可顯示事件的緊急層級：警告(2)、急迫(3)。
	事件類型：可顯示事件的類型：系統事件(1)、行為事件(2)、設備事件(3)。
	項目名稱：可顯示事件項目名稱。
	發生時間：事件觸發時的時間。
	處理帳號：顯示處理帳號名稱。
	處理時間：顯示已處理的時間。
	功能：可編輯查看事件內容。
	*/
	var l_objLv = {
		"$gte": 1,
		"$lte": 3
	};
	if (i_data.iEventLevel == 2) {
		l_objLv.$gte = 2;
		l_objLv.$lte = 2;
	} else if (i_data.iEventLevel == 3) {
		l_objLv.$gte = 3;
		l_objLv.$lte = 3;
	}
	var l_objType = {
		"$gte": 1,
		"$lte": 3
	};
	if (i_data.iType == 1) {
		l_objType.$gte = 1;
		l_objType.$lte = 1;
	} else if (i_data.iType == 2) {
		l_objType.$gte = 2;
		l_objType.$lte = 2;
	} else if (i_data.iType == 3) {
		l_objType.$gte = 3;
		l_objType.$lte = 3;
	}
	var l_iBin = parseInt(i_data.strTimeBin + "000000", 10); //要補位 時分秒的部分
	var l_iEnd = parseInt(i_data.strTimeEnd + "235959", 10);
	//搜尋(指定範圍 >= 數值 <=)
	DB.selectArray('Log_EventWarning', {
			'iTimeBin': {
				"$gte": l_iBin,
				"$lte": l_iEnd
			},
			'iEventLevel': l_objLv,
			'iType': l_objType
		},
		function (ii_dataAr) {
			log.Json("EventTrigger::searchWarningLog ii_dataAr", ii_dataAr);
			if (ii_dataAr != null) //在的話
			{
				o_onDone(ii_dataAr);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//歷史搜尋事件
EventTrigger.prototype.searchEventLog = function (i_data, o_onDone, o_onFail) {
	/*
	7.4.1 搜尋項目：
	'strTimeBin':時間區段：可選擇起始時間與終止時間搜尋這段時間的事件。西元年/月/日
	'strTimeEnd':
	'iEventLevel':事件層級：可選擇事件的緊急層級：全部(4)、一般(1)、警告(2)、急迫(3)。
	'iType'事件類型：可選擇事件的類型：全部(4)、系統事件(1)、行為事件(2)、設備事件(3)。
	7.4.2 顯示項目：
	事件層級：可顯示事件的緊急層級：一般、警告、急迫。
	事件類型：可顯示事件的類型：系統事件、行為事件、設備事件。
	項目名稱：可顯示事件項目名稱。
	說明內容：依照不同事件項目給予對應的敘述，
	觸發時間：
	*/
	var that = this;
	var l_objLv = {
		"$gte": 1,
		"$lte": 3
	};
	if (i_data.iEventLevel == 1) {
		l_objLv.$gte = 1;
		l_objLv.$lte = 1;
	} else if (i_data.iEventLevel == 2) {
		l_objLv.$gte = 2;
		l_objLv.$lte = 2;
	} else if (i_data.iEventLevel == 3) {
		l_objLv.$gte = 3;
		l_objLv.$lte = 3;
	}
	var l_objType = {
		"$gte": 1,
		"$lte": 3
	};
	if (i_data.iType == 1) {
		l_objType.$gte = 1;
		l_objType.$lte = 1;
	} else if (i_data.iType == 2) {
		l_objType.$gte = 2;
		l_objType.$lte = 2;
	} else if (i_data.iType == 3) {
		l_objType.$gte = 3;
		l_objType.$lte = 3;
	}
	var l_iBin = parseInt(i_data.strTimeBin + "000000", 10); //要補位 時分秒的部分
	var l_iEnd = parseInt(i_data.strTimeEnd + "235959", 10);
	//搜尋(指定範圍 >= 數值 <=)
	DB.selectArray('Log_Event', {
			'iTime': {
				"$gte": l_iBin,
				"$lte": l_iEnd
			},
			'iEventLevel': l_objLv,
			'iType': l_objType
		},
		function (ii_dataAr) {
			log.Json("EventTrigger::searchEvent ii_dataAr", ii_dataAr);
			if (ii_dataAr != null) //在的話
			{
				o_onDone(ii_dataAr);
			} else //不在的話
			{
				o_onDone(null);
			}
		}, o_onFail);
};
//設定FTP的資料
EventTrigger.prototype.setFTPSetting = function (i_data, o_onDone, o_onFail) {
	var that = this;
	//防呆
	//console.log("----in----Setting path = " + i_data.strPath);
	if (i_data.strPath.charAt(0) != "/")
		i_data.strPath = "/" + i_data.strPath;
	if (i_data.strPath.charAt(i_data.strPath.length - 1) != "/")
		i_data.strPath = i_data.strPath + "/";
	//console.log("----out----Setting path = " + i_data.strPath);
	//讀取設定
	var l_objSetting = new CFTPSetting();
	l_objSetting.get("FTPSetting",
		function (ii_objSetting) {
			l_objSetting.strHost = i_data.strHost;
			l_objSetting.strUser = i_data.strUser;
			l_objSetting.strPassword = i_data.strPassword;
			l_objSetting.strPath = i_data.strPath;
			l_objSetting.update(
				function () {
					o_onDone(0);
				}, o_onFail);
		}, o_onFail);
};
//取得FTP的設定資料
EventTrigger.prototype.getFTPSetting = function (o_onDone, o_onFail) {
	var that = this;
	//讀取設定
	var l_objSetting = new CFTPSetting();
	l_objSetting.get("FTPSetting",
		function (ii_objSetting) {
			delete ii_objSetting["strSearchKey"];
			o_onDone(ii_objSetting);
		}, o_onFail);
};
//初始化行為事件列表
EventTrigger.prototype.createAction = function (i_eventAr, i_iCount, o_onDone, o_onFail) {
	var that = this;
	DB.selectValue('EventAction', {
			'strEventName': i_eventAr[i_iCount].strName
		},
		function (ii_data) {
			if (ii_data == null) //無此帳號資料
			{ //新創
				log.Json("EventTrigger::createAction ii_data", ii_data);
				var l_eventAction = new EventAction();
				l_eventAction.create(i_eventAr[i_iCount].iInx, {
						'strEventName': i_eventAr[i_iCount].strName
					},
					function (iii_data) {
						++i_iCount;

						if (i_iCount == i_eventAr.length) {
							o_onDone();
							return;
						} else {
							that.createAction(i_eventAr, i_iCount, o_onDone, o_onFail);
						}
					},
					function () {
						log.Error("EventTrigger::onServerOpen() createAction 失敗");
						o_onFail();
						return;
					}); //
			} else {
				//log.Json("EventTrigger::createAction i_eventAr", i_eventAr);
				++i_iCount;

				if (i_iCount == i_eventAr.length) {
					o_onDone();
					return;
				} else {
					that.createAction(i_eventAr, i_iCount, o_onDone, o_onFail);
				}
			}
		},
		function () {
			log.Error("EventTrigger::onServerOpen() createAction 資料庫發生搜尋錯誤");
			o_onFail();
			return;
		}); //資料庫發生搜尋錯誤
};
//初始化系統事件列表
EventTrigger.prototype.createSystem = function (i_eventAr, i_iCount, o_onDone, o_onFail) {
	var that = this;
	DB.selectValue('EventSystem', {
			'strEventName': i_eventAr[i_iCount].strName
		},
		function (ii_data) {
			if (ii_data == null) //無此帳號資料
			{ //新創
				log.Json("EventTrigger::createSystem ii_data", ii_data);
				var l_eventSystem = new EventSystem();
				l_eventSystem.create(i_eventAr[i_iCount].iInx, {
						'strEventName': i_eventAr[i_iCount].strName
					},
					function (iii_data) {
						++i_iCount;

						if (i_iCount == i_eventAr.length) {
							o_onDone();
							return;
						} else {
							that.createSystem(i_eventAr, i_iCount, o_onDone, o_onFail);
						}
					},
					function () {
						log.Error("EventTrigger::onServerOpen() createSystem 失敗");
						o_onFail();
						return;
					}); //
			} else {
				//log.Json("EventTrigger::createSystem i_eventAr", i_eventAr);
				++i_iCount;

				if (i_iCount == i_eventAr.length) {
					o_onDone();
					return;
				} else {
					that.createSystem(i_eventAr, i_iCount, o_onDone, o_onFail);
				}
			}
		},
		function () {
			log.Error("EventTrigger::onServerOpen() createAction 資料庫發生搜尋錯誤");
			o_onFail();
			return;
		}); //資料庫發生搜尋錯誤
};

//公開物件
global.EventAction = EventAction();
global.EventSystem = EventSystem();
global.EventDevice = EventDevice();
global.Event = new EventTrigger();

//Server開啟
sysEvent.evtServerOpen.register(function () {
	log.Warning("EventTrigger::onServerOpen() Server開啟");
	//預設行為事件
	var l_iLoopA = 0;
	Event.createAction(g_eventActionList, l_iLoopA,
		function () {},
		function () {});
	//預設系統事件
	var l_iLoopB = 0;
	Event.createSystem(g_eventSystemList, l_iLoopB,
		function () {},
		function () {});
});

//斷線處理
sysEvent.addUserOff(function (i_connObj) {
	//var l_user = Account.getUser(i_connObj.connID);
	//if (l_user != undefined)
	//    Account.delUser(l_user);
	//else
	//    log.Warning("OnilneUser::addUserOff() 找不到用戶 connID = " + i_connObj.connID);
});

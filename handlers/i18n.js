/*	internationalization


*/
var i18nDB = 'i18n';
SR.DB.useCollections([i18nDB]);

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//-----------------------------------------



var init = function () {
	var trans = [
		[ "zh_tw" , "hello" ]
	];
		
	for ( var i in trans){
		console.log(i);
	}
	
	SR.DB.setData(i18nDB, {zh_tw:{hello: "哈囉"}}, function(){}, function(){});
	SR.DB.setData(i18nDB, {zh_tw:{say: "說"}}, function(){}, function(){});
	SR.DB.setData(i18nDB, {zh_tw:{see: "看"}}, function(){}, function(){});
	//SR.DB.setData("language", {"zh_tw":{"hello": "哈囉"}}, function(){}, function(){});
}


var getLanguage = function (str, onDone) {
	var obj = {};
	obj["meta"]={};
	obj["meta"]["lang"] = str;
	SR.DB.getData("language", obj, 
		function (data) {
			console.log(data);
			onDone(data);
	});
}


var getSupported = function (onDone){
	SR.DB.getArray(i18nDB, function(data){
		console.log("data: %j", data);
		console.log(data);
		var _arr = [];
		for (var i in data){
			_arr.push(data[i].meta.lang);
		}
		//console.log(_arr);
		onDone(_arr);
	}, function(){}, {}, {"meta.lang":1, "_id":0});	
}

var setLanguage = function (_lang, _id, text) {
	var obj={};
	obj["meta"]={};
	obj["meta"]["lang"]=_lang;
	var target = "map." + _id;
	obj[target] = text;
	SR.DB.updateData(i18nDB, {"meta.lang":_lang}, obj, 
		function(data){
		}, 
		function(data){
			console.log("====getData Error");
			console.log(data);
		});
}

//-------- 以下用來做多國語系 
l_handlers.SET_LANG = function (event) {
	
	setLanguage("en_US", "hello", "hello");
	setLanguage("en_US", "say", "say");
	setLanguage("en_US", "see", "see");
	setLanguage("zh_TW", "hello", "哈囉");
	setLanguage("zh_TW", "say", "說");
	setLanguage("zh_TW", "see", "看");
	setLanguage("JP", "hello", "哈囉JP");
	setLanguage("JP", "say", "說JP");
	setLanguage("JP", "see", "囉JP");
	event.done('TEST_LANG', {done:"done"});
}


l_handlers.GET_SUPP = function (event) {
	getSupported(function(data){
			console.log("----");
			console.log(data);
			event.done('TEST_LANG', {done:data});
		}
	);
}

l_handlers.GET_LANG = function (event) {
	getLanguage("zh_TW", function(data){
			console.log("----");
			console.log(data);
			event.done('TEST_LANG', {done:data});
		});	
}

l_handlers.GET_LANG2 = function (event) {
	event.done('TEST_LANG', {done:"data 資料"});
}



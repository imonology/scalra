// to require SR
require('scalra')('dev');

var settings = global.g_settings = {};

settings.version = '0.0.2.1';
settings.projectName = 'Hydra'; // unique project name under this user
settings.lobbyPort = 98190; // port for main lobby server
settings.domain = 'localhost'; // name of return server

// settings.wrapperAddress = '../wrapper/wrapper.js'; // wrapper 位置
settings.wrapperAddress = __dirname + '/lib/wrapper/wrapper.js'; // wrapper 位置
settings.cacheAddress = 'swap/'; // 串流快取位置
settings.snapshotAddress = 'web/snapshot/';
settings.maxCacheNumber = 5; // 串流最大快取數量

settings.path = {
  base : __dirname,
  scalra : __dirname + '/scalra/',
  lib : __dirname + '/lib/',
  wrapper : __dirname + '/' + 'lib/wrapper/wrapper.js', // wrapper 位置
  model : __dirname + '/' + 'model/', // model 位置
  test : __dirname + '/' + 'test/', // test 位置
  cache : __dirname + 'swap/', // 串流快取位置
  snapshot : __dirname + 'web/snapshot/'
};

settings.apps = {
  app: {
    local_name: 'test cases'
  }
};


// basic ic froniter
LOG.setLevel(4);
SR.Settings.TIMEOUT_EVENTHANDLE = 60000;

var collections =  ['profile', 'tab', 'camera', 'group', 'map', 'notify', 'video', 'log', 'schedule', 'hydraSettings', 'eventLevel', 'area'];

var config = {
  path: __dirname,
  handlers: [
  ],
  components: [
    SR.Component.DB(collections),           // init DB
    SR.Component.AppManager(),              // init app manager
    //SR.Component.SocketIO(),                // start a socket.io server
    //SR.Component.REST(),                    // start a HTTP server
    //SR.Component.SockJS(),
  ],
  //modules: {'chat': {limit:1000, backup:false}} // SR_REST 
};


// create frontier
var l_frontier = new SR.Frontier(config);

// execute all the steps for running a server
l_frontier.init();

LOG.error('LOG.error');
LOG.warn('LOG.warn');
LOG.debug('LOG.debug');


//setInterval(function() {console.log('setInterval');},5000);

db_settings = {"DB_name":"ic-test","username":"ic-test","password":"ic-test"};
            var settings = {
                account:    'dbadmin',
                password:   'dbadmin-pass',
                DB_name:    'test',
                serverIP:   '127.0.0.1',
                serverPort: 27017,
            };


SR.DB.initDB(settings, ['video'], function (result) {	
	LOG.warn('init DB [' + settings.DB_name + '] result: ' + result); 
	SR.Video.getChannel({onDone: function(result){
		console.log(result);
		SR.DB.disposeDB();
		SR.Settings.FRONTIER.dispose();
	}});
});


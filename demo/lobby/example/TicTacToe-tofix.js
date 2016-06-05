
//-----------------------------------------
// define local variables
//
//-----------------------------------------

// reference to logic
var Logic = require('../web/logic.js');

// data for online users
//var l_users = SR.State.get('users', 'map'); // indexed by account

// store game logic for games started (to be accessed by handler.js)
// NOTE: data structure is stored here to allow handlers be hot-reloaded without losing data
global.started = exports.started = {};
global.pending = exports.pending = [];

var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define local handler function
//
//-----------------------------------------


// get user's name using login_id or via user_id
l_checkers.USER_LOGIN = {
};

l_handlers.USER_LOGIN = function (event) {
    LOG.debug('USER_LOGIN called');
        
    var para = event.data;

	// get username from session
	var username = event.session._account;

	// assign random name if not available
	if (username === undefined)
		username = 'user ' + UTIL.createID();
	
	LOG.warn('username: ' + username);
	
	
	// store user name
    SR.Conn.setConnName(event.conn.connID, username);
                    
    // find a pending game, and store user connections
    if (pending.length > 0) {                
		
		var conn1 = pending[0];
		var conn2 = event.conn;
		pending.shift();
                    
        var onUpdate = function (update) {
			
			if (typeof update.winner !== 'undefined')
				update.msg = update.winner + ' wins!';
			
            // send to both connections
            event.send('USER_INPUT_REPLY', update, [conn1, conn2]);
        }
                        
        // NOTE: logic will start itself
        var logic = new Logic(onUpdate, true);
        
        // setup who plays first
        conn1.self = 0;
        conn2.self = 1;
        
        // store the other user's connection along with logic (for disconnection)
        started[conn1.connID] = {logic: logic, remote_conn: conn2};
        started[conn2.connID] = {logic: logic, remote_conn: conn1};                                              
        
        // notify game begin and opponent names
        var msg = 'players in game: ' + Object.keys(started).length;
        SR.EventManager.send('GAME_START', {opponent: conn2.name, msg: msg}, [conn1]);
        SR.EventManager.send('GAME_START', {opponent: conn1.name, msg: msg}, [conn2]);
        
    }
    // if no existing  found, enter pending queue...
    else {                
        pending.push(event.conn);
        event.send('WAIT_USER', {});
    }			
	
    // return username
    event.done('USER_LOGIN_REPLY', {name: username});
    	
}
  
  
l_checkers.USER_INPUT = {
    index: 'number',
};    
    
l_handlers.USER_INPUT = function (event) {

    // first end event, allow free reply anytime
    event.done();

    // check if user has valid login
    if (started.hasOwnProperty(event.conn.connID) === false) {
        LOG.warn('user not in game, ignore request: ' + event.conn.connID, 'USER_INPUT');
        return; 
    }

    // use the right logic for client, otherwise game is not started yet, ignore request
    if (started.hasOwnProperty(event.conn.connID)) {
        
        var logic = started[event.conn.connID].logic;       
        
        // check if myself can play or game is restarted
        if (logic.getCurrent() === event.conn.self || logic.getCurrent() === undefined)
            logic.inputCell(event.data.index);          
    }
}


// event handling for connect/disconnect events
SR.Callback.onConnect(function (conn) {
	
});

SR.Callback.onDisconnect(function (conn) {

	LOG.warn('user leavning: ' + conn.name);
    var connID = conn.connID;
    var username = conn.name;

    // remove existing game
    if (started.hasOwnProperty(connID)) {
        LOG.warn('user leaving game..., put game to pending');
        var game = started[connID];
        pending.push(game.remote_conn);
        
        delete started[game.remote_conn.connID];
        delete started[connID];
        
        //notify user
        var msg = 'players in game: ' + Object.keys(started).length + ' pending: ' + pending.length;
        LOG.warn(msg);
        SR.EventManager.send('GAME_OVER', {depart: username, msg: msg}, [game.remote_conn]);
    }
	
    
    // remove player from pending game
    for (var i=0; i < pending.length; i++) {
        
        if (pending[i].connID === connID) {
            LOG.warn('leaving user is in pending queue');
            pending.splice(i);
            var msg = 'players in game: ' + Object.keys(started).length + ' pending: ' + pending.length;
            LOG.warn(msg);
        }
    }
});


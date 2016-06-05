//
//  handler.js
//
//  main server logic for SPS demo
//

// a pool for all message handlers
var l_HandlerPool = exports.handlers = {};
var l_CheckerPool = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

// define callback to handle position and message updates

// return the update of a particular node
// update: {ident: string, pos: {x: number, y: number}, to: string}
var l_onPosition = function (update) {
    LOG.warn('onPosition called, mover: ' + update.ident + ' pos:');
    LOG.warn(update.pos);
    
    // notify client
    LOG.warn('notify: ' + update.to);
    if (l_nodes.hasOwnProperty(update.to)) {
        var node = l_nodes[update.to];
        SR.EventManager.send('NODE_UPDATE', {ident: update.ident, pos: update.pos}, [node.conn.connID]);
    }
}

var l_onMessage = function (msg) {
	LOG.warn('onMessage called');
}

// storage for nodes created
// indexed by ident
var l_nodes = {};


// get an app server's IP & port given its name
l_CheckerPool.QUERY_SERVER = {
    server:      'string'
};    
    
l_HandlerPool.QUERY_SERVER = function (event) {
	var name = event.data.server;
	
	var IPport = SR.AppHandler.queryAppServer(name);
	
	event.done('QUERY_SERVER_REPLY', {server: name, IPport: IPport});
}

// ident should contain {apikey, layer, name}
l_CheckerPool.CREATE_NODE = {
    id:      'string',
    layer:   'string',
    pos:     'object'
};    
    
l_HandlerPool.CREATE_NODE = function (event) {

    var para = event.data;

    SR.Comm.createNode(para.id, para.layer, para.pos, l_onPosition, l_onMessage, function (node) {
		
        // assocate connection ID with node
        node.conn = event.conn;
        
        // store node with unique ident
		l_nodes[node.ident] = node;
        LOG.warn('SPS node create success, ident: ' + node.ident, 'CERATE_NODE');
		
		// associate connection with ident
		SR.Conn.setConnName(event.conn.connID, node.ident);
        
        // save data 
        var create_time = new Date().toISOString();
        SR.DB.setData('users', {name: node.ident, time: create_time}, 
            function (msg) {
                LOG.warn('setData success: ' + msg);
            },
            function (msg) {            
                LOG.warn('setData fail: ' + msg);
            }
        );
		
		// respond to client
		event.done('CREATE_NODE_REPLY', {ident: node.ident, result: true});
    });
};


l_CheckerPool.PUBLISH_POS = {
    ident: 'string'
};    
    
l_HandlerPool.PUBLISH_POS = function (event) {
	var ident  = event.data.ident;
	var pos    = event.data.pos;
    var radius = event.data.radius;
	
	if (l_nodes.hasOwnProperty(ident)) {
		var node = l_nodes[ident];
        LOG.warn('node vastnode: ' + node.vastnode, 'PUBLISH_POS');
        
        if (pos !== undefined) {
            node.move({x: pos[0], y: pos[1]}, function (result) {
                event.done('PUBLISH_POS_REPLY', {result: result, msg: (result ? 'success' : 'fail')});
            });	
        }
        else if (radius !== undefined) {
            node.subscribe({radius: radius}, function (result) {
                event.done('PUBLISH_POS_REPLY', {result: result, msg: (result ? 'success' : 'fail')});
            });
        }
	}
	else
		event.done('PUBLISH_POS_REPLY', {result: false, msg: 'node not found'});
};

var l_removeNode = function (ident, onDone) {

	// check if node exists
	if (l_nodes.hasOwnProperty(ident) === false) {
		return onDone(false, 'node ident [' + ident + '] does not exist');
	}
	
	LOG.warn('remove node: ' + ident);
	    
	var node = l_nodes[ident];
	SR.Comm.deleteNode(ident, function (result) {
		LOG.warn('DELETE_NODE result: ' + result);        
        
        // remove reference to leaving node & its connection
        delete l_nodes[ident];
                
        onDone(result, (result ? 'node deleted' : 'SR.Comm.deleteNode error'));		
	});	
}

l_CheckerPool.DELETE_NODE = {    
};    
    
l_HandlerPool.DELETE_NODE = function (event) {

	var ident = SR.Conn.getConnName(event.conn.connID); 
    
    l_removeNode(ident, function (result, msg) {
        event.done('DELETE_NODE_REPLY', {result: result, msg: msg});
    });
};

//
//  connection handling
//

SR.Callback.onDisconnect(function (conn) {

    // look for ident
    var ident = SR.Conn.getConnName(conn.connID);
	
    l_removeNode(ident, function (result, msg) {
        LOG.warn('removeUser result: ' + result + ' msg: ' + msg);            
    });    
});



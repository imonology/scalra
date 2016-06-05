//
//  a test to set user roles
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------


// test group permission
l_checkers.TEST_ROLE = {
	_roles: ['user'],
	//name: 'string'
};

l_handlers.TEST_ROLE = function (event) {
	
	//SR.User.addRolePermission('TEST_ROLE', ['admin']);
	//SR.User.removeRolePermission('TEST_ROLE', ['admin']);
	//SR.User.queryRolePermission('TEST_ROLE');
	
	// print some message
	LOG.debug('TEST_ROLE called');
	LOG.warn(event);
	
	// send back response
	event.done('TEST_ROLE_R', {result: true});
}

// test group permission
l_checkers.SET_ROLE = {
	name:	'string',
	role:	'string',
	type:	'string'	
};

l_handlers.SET_ROLE = function (event) {

	var event_name = event.data.name;
	var role = event.data.role;
	var type = (event.data.type === 'true' ? true : false);
	
	var result = SR.Handler.setPermission(event_name, role, type);
	
	// print some message
	LOG.debug('SET_ROLE called');
	LOG.warn(event);
	
	// send back response
	event.done('SET_ROLE_R', {result: result});
}

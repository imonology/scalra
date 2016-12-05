
1.5.6 / 2016-12-05
==================
	* fixed: _SUBSCRIBE_LOG / _UNSUBSCRIBE_LOG works correctly for multiple subscribers
	* modified: rename _SUBSCRIBE_FILESTREAM to _SUBSCRIBE_LOG

1.5.5 / 2016-11-27
==================
	* added: "use_socket" flag in SR.API.addRemote() to establish websocket channel with a remote host
	* added: a new monitor server API (_SUBSCRIBE_FILESTREAM) to allow screen output of a server be subscribed (by specifying 'owner-project-name')

1.5.4 / 2016-11-21
==================
	* fixed: for SR.DS, if a data model has specified a 'key field', then data insertion is rejected when such key field is missing content

1.5.3 / 2016-11-20
==================
	* fixed: some input format issue for swagger
	* modify: various adjustments to make express module and SR.DS work out of box
		
1.5.2 / 2016-11-16
==================
	* added: swagger-ui support (/modules/swagger.js) to allow auto API doc generation (via "_BUILD_APIDOC" event)
	
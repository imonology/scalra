
1.5.8 / 2016-12-28
==================
	* modify: refactor SR.Execute to perform "npm start" if frontier.js doesn't exist
	* fix: crash due to monitor stop server command returns message incorrect handling
	* modify: convert SR.Execute.start/stop/query into SR.API _START_SERVER, _STOP_SERVER, _QUERY_SERVER

1.5.7 / 2016-12-14
==================
	* modify: rename "mongoAccess" to "DB_AUTH" in project /settings.js file
	* add: support for mysql DB via DB_TYPE parameter when initializing SR.ORM
	* add: SR.Comm.onUnsubscribed to notify interested parties when channels are being unsubscribed
		
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
	
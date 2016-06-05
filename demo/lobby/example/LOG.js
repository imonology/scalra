SR.Callback.onStart(function () {

	var type = 'SYSTEM_UP';
	var end = new Date();
	var start = new Date();
	var minutes = start.getMinutes();
	start.setMinutes(minutes-1 >= 0 ? minutes-1 : 0);
	
	//var start = new Date(end.getFullYear(), end.getMonth(), end.getDay(), end.getHours(), minutes, end.getSeconds());
	
	// test functions of LOG.query 
	LOG.query({type: type, 
			   start: start, 
			   end: end, 
			  }, 
				function (result) {
					LOG.debug('count all ' + type + ' between:\n' + start + ' and\n' + end + ', total: ' + result.length);
				});
});

SR.Callback.onStop(function () {
	
});
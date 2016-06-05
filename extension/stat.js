//
//  stat.js
//
//  collection & processing of system statistics
//
//    functions
//		
//    history:
//        2014-04-29    init
//

var l_stat = SR.State.get('SR.Stat');

// add some stat for a certain type of data (e.g., net_in, net_out)
exports.add = function (type, size) {
	if (l_stat.hasOwnProperty(type) === false)
		l_stat[type] = 0;
		
	l_stat[type] += size;
	return true;
}

// set certain data directly to a value
exports.set = function (type, size) {
	if (l_stat.hasOwnProperty(type) === false)
		return false;
		
	l_stat[type] = size;
	return true;
}

// get the current stat for a certain type 
exports.get = function (type) {
	if (l_stat.hasOwnProperty(type) === false)
		return 0;
	else
		return l_stat[type];
}

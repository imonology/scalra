var anyroute = require('anyroute');
var merge = require('merge');

function router() {
	var self = this;
	this.route = new anyroute;
}

router.prototype.get = function(path, handler) {
	var self = this;
	var method = 'get';
	
	return this.route.set(path, handler, method);
};

router.prototype.post = function(path, handler) {
	var self = this;
	var method = 'post';
	
	return this.route.set(path, handler, method);
};

router.prototype.patch = function(path, handler) {
	var self = this;
	var method = 'patch';
	
	return this.route.set(path, handler, method);
};

router.prototype.any = function(path, handler) {
	var self = this;
	var method = 'default';
	
	return this.route.set(path, handler, method);
};

router.prototype.dispatch = function(path, method, payload) {
	var self = this;
	var ret = this.route.get(path, payload, method);
	
	return ret.handler(ret.payload);
};


module.exports = router;

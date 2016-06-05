// manage a group of limited resources
exports.Allocate = function (size) {
	
	this.resources = [];
	
	for (var i=0; i < size; i++)
		this.resources.push(null);
	
	// returns true if slot exists (key will be stored), false if no more resource exists
	this.get = function (key) {
		var num = this.check(key);
		if (num !== (-1))
			return num;
		
		for (var i=0; i < size; i++) {
			// empty slot exists
			if (this.resources[i] === null) {
				this.resources[i] = key;
				return i;
			}
		}
		return (-1);
	}
	
	// check if a key is stored already
	this.check = function (key) {
		for (var i=0; i < size; i++) {
			// check if resource was stored previously
			if (this.resources[i] === key) {
				return i;
			}
		}
		return (-1);	
	}
	
	// release an allocated resource by key
	this.release = function (key) {
		var num = this.check(key);
		if (num === -1)
			return false;
		this.resources[i] = null;
		return true;
	}
}

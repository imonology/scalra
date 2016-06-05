
var assert = require("assert")
describe('SR.State.', function () {

	// get shared states
	describe('setShared', function () {
		it('should store key/value to shared states', function () {
			SR.State.setShared('name', 'Peter', function (err) {
				console.log('error is: ');
				console.log(err);
				
				assert.ifError(err);
			
				SR.State.setShared('person', {name: 'John', age: 17}, function (err) {
					assert.ifError(err);
				});
			});
		});
    });
		
	// get shared states
	describe('getShared', function () {
		it('should get shared states by key', function () {
		
			SR.State.getShared('name', function (err, data) {
				assert.ifError(err);
				assert.equal('Peter', data);
				
				SR.State.getShared('person', function (err, data) {
					assert.ifError(err);
					assert.equal('object', typeof data);
					assert.equal('John', data.name);
					assert.equal(17, data.age);
				});
			});			
		});
    });
	
	// get shared states
	describe('deleteShared', function () {
		it('should delete shared states by key', function () {
		
			SR.State.getShared('name', function (err, data) {
				assert.ifError(err);
				assert.equal('Peter', data);
				
				SR.State.deleteShared('name', function (err) {
					assert.ifError(err);

					// by this stage we should not get anything, so should return error
					SR.State.getShared('name', function (err, data) {
						console.log('after removing \'name\', get shared state \'name\' returns: ');
						console.log(err);
						assert(err);
					});
				});
			});			
		});
    });
});

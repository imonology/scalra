
var assert = require("assert")
describe('SR.Storage.', function () {

	describe('version', function () {
		it('should return version number in string', function () {
			assert.equal('string', typeof SR.Storage.version());
		});
    });
	
	describe('createReadStream', function () {
		
		it('should return a stream', function () {
			
			var stream = SR.Storage.createReadStream('global.js');
			
			stream.on('data', function (data) {
				console.log('global.js has ' + data.length + ' bytes');
				assert.equal('string', typeof data);
			});
		});
    });	
	
});

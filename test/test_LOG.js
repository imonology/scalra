
var assert = require("assert")
describe('SR require', function(){
	describe('LOG.debug,warn,error', function(){
		it('should return a undefined', function(){
			assert.equal(undefined, LOG.error('testing LOG.error'));
			assert.equal(undefined, LOG.warn('testing LOG.warn'));
			assert.equal(undefined, LOG.debug('testing LOG.debug'));
		});
	});
});


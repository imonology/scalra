
var assert = require("assert")
describe('UTIL.', function(){


	describe('createUUID', function(){
		it('should return strings', function(){
			assert.equal('string', typeof UTIL.createUUID());
			assert.equal(36, UTIL.createUUID().length);
			assert.equal(8, UTIL.createUUID().indexOf('-'));
		});
    });

	describe('createToken', function(){
		it('should return strings', function(){
			assert.equal('string', typeof UTIL.createToken());
			assert.equal(true, UTIL.createToken().length > 9);
			assert.equal(8, UTIL.createUUID().indexOf('-'));
		});
    });

	describe('input/output test', function(){
		it('should return an array', function(){
			var result = UTIL.whichPartition(['./']);
			//console.log(result);
		});
    });

	describe('hash', function(){
		it('should return strings', function(){
			assert.equal('7215ee9c7d9dc229d2921a40e899ec5f',  UTIL.hash(" ", "md5"));
			assert.equal('b858cb282617fb0956d960215c8e84d1ccf909c6',  UTIL.hash(" ", "sha1"));
			assert.equal('36a9e7f1c95b82ffb99743e0c5c4ce95d83c9a430aac59f84ef3cbfab6145068',  UTIL.hash(" ", 'sha256'));
			//assert.equal('f90ddd77e400dfe6a3fcf479b00b1ee29e7015c5bb8cd70f5f15b4886cc339275ff553fc8a053f8ddc7324f45168cffaf81f8c3ac93996f6536eef38e5e4076',  UTIL.hash(" ", 'sha512'));
		});
    });

	describe('findFiles', function(){
		it('should return results', function(){
			var x = {
				path: '/tmp',
				onDone: function (result) {
					console.log('result');
					console.log(result);
				}, 
			};
			//console.log(x);
			//UTIL.findFiles(x);
			//setTimeout(function(){console.log('finished');}, 3000);
		});
    });
});



// allow access to swagger-ui from /lib
// ref: http://stackoverflow.com/questions/13786160/copy-folder-recursively-in-node-js
const fs = require('fs-extra');
const path = require('path');

var copy_swagger = function (swagger_path) {
	fs.copy(path.join(swagger_path, 'dist'), 'lib/swagger-ui', function (err) {
		if (err) {
			console.error(err);
		} else {

			// use minifier version				
			console.log("swagger-ui ready!");
		}
	}); //copies directory, even if it has subdirectories or files	
}

fs.stat('lib/swagger-ui', function (err) {
	if (err) {
		console.log('copying swagger-ui to /lib...');
		
		// check for swagger library
		var swagger_path = 'node_modules/swagger-ui';
		fs.stat(swagger_path, function (err) {
			if (!err) {
				return copy_swagger(swagger_path);
			}
	
			// check elsewhere
			swagger_path = '../swagger-ui';
			fs.stat(swagger_path, function (err) {
				if (err) {
					return console.error('cannot find swagger-ui in node_modules!');
				}
				copy_swagger(swagger_path);
			})
		})
	}
});

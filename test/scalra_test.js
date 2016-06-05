
var BASE_DIR   = __dirname + '/./';
var CORE_DIR   = BASE_DIR + './core/';
global.SR = {};

// wrappers to node.js modules
SR.net =                    require('net'); 
SR.sys =                    require('util');
SR.assert =                 require('assert');
SR.fs =                     require('fs');
SR.path = 					require('path');

global.UTIL = require(CORE_DIR + 'utility');

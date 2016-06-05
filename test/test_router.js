var router = require('../core/router.js');
var router = new router;


function handler_default (payload) { console.log(payload) };
function handler_get (payload) { console.log(payload) };
function handler_post (payload) { console.log(payload) };
function handler_patch (payload) { console.log(payload) };


var ret = router.any('/collection/:cid/tab/:tabID', handler_default);
console.log(ret);
var ret = router.get('/collection/:cid/tab/:tabID', handler_get);
console.log(ret);
var ret = router.post('/collection/:cid/tab/:tabID', handler_post);
console.log(ret);
var ret = router.patch('/collection/:cid/tab/:tabID', handler_patch);
console.log(ret);



//~ var ret = ar.set('/collection/:cid/tab/:tabID', handler_default);
//~ console.log(ret);

//~ var ret = ar.set('/collection/:cid/tab/:tabID', handler_default, 'default');
//~ console.log(ret);

//~ var ret = ar.set('/collection/:cid/tab/:tabID/', handler_post, 'post')
//~ console.log(ret);

console.log('--------------------');

var ret = router.dispatch('/collection/CCC:ccc/tab/Tab:tabID', 'patch', {x:1, cid:3});
console.log(ret);

var ret = router.dispatch('/collection/:cid/tab/:tabID', 'get', {x:1});
console.log(ret);

var ret = router.dispatch('/collection/:cid/tab/:tabID', 'post', {x:1});
console.log(ret);

var ret = router.dispatch('/collection/123/tab/456', 'default', {x:1});
console.log(ret);

var ret = router.dispatch('/collection/foo/tab/bar', 'head', {x:1});
console.log(ret);

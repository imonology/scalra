/*
	Cookie handling code (borrowed from express framework)
	ref: https://github.com/visionmedia/express/blob/master/lib/response.js
*/
//var http = require('http');
var http = SR.http;
var cookie = require('cookie');


var res = module.exports = {
	// IMPORTANT NOTE: the following works with node 0.10.5 but not 4.0.0 or above
	// will cause http server to have very slow response
  //__proto__: http.ServerResponse.prototype
};

res.get = function(field){
  return this.getHeader(field);
};

res.set =
res.header = 
function header(field, val) {
  if (arguments.length === 2) {
    var value = Array.isArray(val)
      ? val.map(String)
      : String(val);

    // add charset to content-type
    if (field.toLowerCase() === 'content-type' && !charsetRegExp.test(value)) {
      var charset = mime.charsets.lookup(value.split(';')[0]);
      if (charset) value += '; charset=' + charset.toLowerCase();
    }

    this.setHeader(field, value);
  } else {
    for (var key in field) {
      this.set(key, field[key]);
    }
  }
  return this;
};

res.append = function append(field, val) {
  var prev = this.get(field);
  var value = val;

  if (prev) {
    // concat the new and prev vals
    value = Array.isArray(prev) ? prev.concat(val)
      : Array.isArray(val) ? [prev].concat(val)
      : [prev, val];
  }

  return this.set(field, value);
};

res.cookie = function (name, value, options) {
  var opts = UTIL.mixin({}, options);
  //var secret = this.req.secret;
  var signed = opts.signed;

  //if (signed && !secret) {
  //  throw new Error('cookieParser("secret") required for signed cookies');
  //}

  var val = typeof value === 'object'
    ? 'j:' + JSON.stringify(value)
    : String(value);

  if (signed) {
    val = 's:' + sign(val, secret);
  }

  if ('maxAge' in opts) {
    opts.expires = new Date(Date.now() + opts.maxAge);
    opts.maxAge /= 1000;
  }

  if (opts.path == null) {
    opts.path = '/';
  }

  this.append('Set-Cookie', cookie.serialize(name, String(val), opts));
  return this;
};
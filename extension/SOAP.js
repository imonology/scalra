/*
    Interface to SOAP servers

    history:
        2013-04-24	init

    NOTE:
        this extension relies on the node-soap module
		see: https://github.com/milewise/node-soap
	   
        to install:
            npm install soap
			
*/

var soap = require('soap');

/*
測試環境 
交易介面  https://stage-api.eg.gashplus.com/CP_Module/order.aspx 
請款服務  https://stage-api.eg.gashplus.com/CP_Module/settle.asmx 
訂單查詢服務     https://stage-api.eg.gashplus.com/CP_Module/checkorder.asmx 
月租退租介面     https://stage-api.eg.gashplus.com/CP_Module/order.aspx 

正式環境 
交易介面  https://api.eg.gashplus.com/CP_Module/order.aspx 
請款服務  https://api.eg.gashplus.com/CP_Module/settle.asmx 
訂單查詢服務     https://api.eg.gashplus.com/CP_Module/checkorder.asmx 
月租退租介面     https://api.eg.gashplus.com/CP_Module/order.aspx 
*/

var GASH = {
	order_test:		'https://stage-api.eg.gashplus.com/CP_Module/order.aspx',
	settle_test:	'https://stage-api.eg.gashplus.com/CP_Module/settle.asmx?wsdl',	                 
	check_test:		'https://stage-api.eg.gashplus.com/CP_Module/checkorder.asmx?wsdl',
	cancel_test:	'https://stage-api.eg.gashplus.com/CP_Module/order.aspx',
	order:			'https://api.eg.gashplus.com/CP_Module/order.aspx',
	settle:			'https://api.eg.gashplus.com/CP_Module/settle.asmx?wsdl',
	check:			'https://api.eg.gashplus.com/CP_Module/checkorder.asmx?wsdl',
	cancel:			'https://api.eg.gashplus.com/CP_Module/order.aspx'
}

// SOAP client
var l_client = undefined;

// start server
exports.start = function (onDone) {

	//var url = 'http://example.com/wsdl?wsdl';
	//var url = GASH.order_test;
	var url = GASH.settle_test;
	
	LOG.warn('creating SOAP client to: ' + url);
	soap.createClient(url, function (err, client) {
		
		if (err) {
			LOG.error('SOAP client create fail:');
			LOG.error(err);
			if (typeof client === 'undefined') {
				LOG.warn('client is undefined');
				return;
			}
			else {
				LOG.warn('client is usable');
				LOG.warn(client);
			}
		}

		LOG.warn('SOAP client create success');
		l_client = client;
	});

	UTIL.safeCall(onDone);
}

exports.stop = function (onDone) {

}

exports.order = function () {

	if (l_client === undefined) {
		LOG.warn('SOAP client not init');
		return;
	}

	var args = {name: 'value'};

    l_client.MyFunction(args, function (err, result) {
        console.log(result);
    });
}

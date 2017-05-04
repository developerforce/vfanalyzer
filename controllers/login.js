var json_util = require('../util/json');
var debug = require('../util/debug');
var jsforce = require('jsforce');
var commandLineArgs = require('command-line-args')
//argument handling
var optionDefinitions = [
  { name: 'token', alias: 't', type: String }, { name: 'instance', alias: 'i', type: String }
];
var args = commandLineArgs(optionDefinitions);


var default_conn = null;

if(args.token && args.instance) {
	default_conn = new jsforce.Connection({instanceUrl: args.instance, accessToken : args.token});
  console.log('Logged into Salesforce instance '+default_conn.instanceUrl+' with the access token '+default_conn.accessToken);
}

module.exports = {

	init : function(routedinfo) {

		if(default_conn) {
			routedinfo.req.session.accessToken = default_conn.accessToken;
			routedinfo.req.session.instanceUrl = default_conn.instanceUrl;  
		}
		routedinfo.data = json_util.extend(routedinfo.data,{
			login : routedinfo.req.session == null || routedinfo.req.session.accessToken == null
		});
    debug.log(routedinfo.req.session.instanceUrl);
    debug.log(routedinfo.req.session.accessToken);

		return routedinfo;
	}

}

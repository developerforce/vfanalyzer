var _ = require('underscore');
var jsforce = require('jsforce');

var json_util = require('../util/json');
var debug = require('../util/debug');
var rules = json_util.loadJSON(null,"./rules/");
var m = require('../messages');

var htmlparser = require("htmlparser2");
var request = require('then-request');
var adm_zip = require('adm-zip');

var page_count = 0;
var script_resource_count = [];
var script_issues = [];

function checkPages(pages,routedinfo,callback) {
		page_count = pages.length;
		routedinfo.data.pages = [];

		script_resource_count = [];
		script_issues = [];
		_.each(pages,function(page) {

			page.info = createNodeRepresentation(page.Markup);

			//defined by the json in /rules
			//except for the href check, which is brute forced
			page.markup_issues = checkForIssues(page.Markup,"markup","Page Body");

			//everything above this line can be done synchronously
			//since we don't have the ID of static resources, the following cannot
			//and since they have to be done asynch, we get all remote resources the same way
			//to prevent server to client blocking as much as possible
			page.js_issues = [];
			checkAllJavaScript(page,routedinfo,function(returned_page) {

				returned_page.no_issues = (returned_page.markup_issues.length == 0 && returned_page.js_issues.length == 0);
				debug.log(returned_page.name+":"+returned_page.no_issues);
				routedinfo.data.pages.push(returned_page);
				debug.log(routedinfo.data.pages.length + "/"+page_count+" pages");

				if(routedinfo.data.pages.length == page_count) {
					routedinfo.handler(routedinfo);
				}
			})
		});
	}

function createNodeRepresentation(markup) {
	var pageinfo = m.pageinfo.create();
	pageinfo.markup = markup;
	pageinfo.viewstate = false;
	var check_script_block = false;
	var check_style_block = false;

	var parser = new htmlparser.Parser({
	    onopentag: function(name, attribs){
	        //determine controller
	        if(name === "apex:page") {
	        	if (attribs.standardcontroller){
	            	if (attribs.recordsetvar) { pageinfo.controller_type = "list"; }
	            	else { pageinfo.controller_type = "standard" }
	            	pageinfo.controller = attribs.standardcontroller;
	        	} else if (attribs.controller) {
	        		pageinfo.controller_type = "custom";
	        		pageinfo.controller = attribs.controller;
	        	} else {
	        		pageinfo.controller_type = "none";
	        		pageinfo.controller = null;
	        	}

	        	if (attribs.extensions) {
	        		if(attribs.extensions.indexOf(",") >= 0) {
	        			pageinfo.extensions = attribs.extensions.split(",");
	        		} else {
	        			pageinfo.extensions.push(attribs.extensions);
	        		}
	        	}
	        }

	        //determine scripts
	        if(name == "apex:includescript") {
	        	pageinfo.script_resources.push(attribs.value);
	        }

	        if(name == "script" && attribs.src) {
	        	pageinfo.script_resources.push(attribs.src);
	        }

	        if(name == "script" && !attribs.src) {
	        	check_script_block = true;
	        }

	        //determine styles
	        if(name == "apex:stylesheet") {
	        	pageinfo.style_resources.push(attribs.value);
	        }

	        if(name == "style") {
	        	check_style_block = true;
	        }

	        //determine dependency on viewstate/form
	        if(name == "apex:form") {
	        	pageinfo.viewstate = true;
	        }

	        //determine data table structure


	        //determine ui inputs
	        if(name.indexOf("apex:input") == 0) {
	        	pageinfo.ui_inputs.push({type:name, value: attribs.value});
	        }
	    },
	    ontext: function(text){
	        if(check_script_block) { pageinfo.script_blocks.push(text); }
	        if(check_style_block) { pageinfo.style_blocks.push(text); }

	    },
	    onclosetag: function(tagname){
	        check_script_block = false;
					check_style_block = false;
	    }
		}, {decodeEntities: true});

		parser.write(markup);
		return pageinfo;
}

function checkAllJavaScript(page,routedinfo,callback) {


	//Inline JavaScript should have been parsed with body markup

	if(page.info.script_blocks && page.info.script_blocks.length > 0) {
		_.each(page.info.script_blocks,function(script_block){
				page.js_issues = _.union(page.js_issues,checkForIssues(script_block,"javascript","Inline JavaScript"));
			});
	}
	debug.log(page.issues);


	if(page.info.script_resources && page.info.script_resources.length > 0) {
				debug.log(page.info.script_resources.length);
				script_resource_count[page.Name] = page.info.script_resources.length;

				debug.log(page.Name + " checking "+script_resource_count[page.Name]+" external resources");
				_.each(page.info.script_resources,function(resource) {
						getThirdPartyResources(resource,routedinfo,function(body,file) {
											page.js_issues = _.union(page.js_issues,checkForIssues(body,"javascript",file));
											script_resource_count[page.Name]--;
											debug.log(page.Name+" has "+script_resource_count[page.Name]+" left to go");
											if(script_resource_count[page.Name] == 0) {
												debug.log(page.issues);
												callback(page);
											}
						});
					});
	} else {
		callback(page);
	}
}


function checkForIssues(body,type,file,callback) {

		var issues = [];
		var id_regex = new RegExp("[\/][a-zA-Z0-9]{18}?|[\/][a-zA-Z0-9]{15}?");

		//check inclusion by line
		var bodyLines = body.split("\n");
		for(var i = 0; i < bodyLines.length; i++) {
					bodyLine = bodyLines[i];
					//check lines for potential record links
					if( bodyLine.toLowerCase().indexOf("href") >=0 && id_regex.test(bodyLine) ) {
						var violation = {};
						violation.name = "HREF may link directly to Salesforce record";
						violation.description = "An anchor tag may be referring to a Salesforce record id.  These links may not work correctly in LEX.";
						violation.suggestions = "Use the sforce.one library to handle client side navigation to records.";
						violation.severity = "error";
						violation.file = file;
						violation.line = i+1;
						issues.push(violation);
					}

					//check dynamic rules
					_.each(rules,function(rule) {
							if(rule.type == type) {
										if(rule.inclusions) {
											var needsAll = (rule.inclusions_rule == 'all');
											var hasAll = true;
											var hasOne = false;

											_.each(rule.inclusions,function(check) {
												if(bodyLine.toLowerCase().indexOf(check) >= 0) {
													hasOne = true;
												} else {
													hasAll = false;
												}
											});


											if( (needsAll && hasAll) || (!needsAll && hasOne) ) {
												var violation = {};
												violation.name = rule.name;
												violation.description = rule.description;
												violation.suggestions = rule.suggestions;
												violation.severity = rule.severity;
												violation.file = file;
												violation.line = i+1;
												issues.push(violation);
											}
										}
						}
				});

				//check exclusion by full body
				_.each(rules,function(rule) {
							if(rule.type == type) {
										if(rule.exclusions) {
											var needsAll = (rule.exclusions_rule == 'all');
											var hasAll = true;
											var hasOne = false;

											_.each(rule.exclusions,function(check) {
												if(body.toLowerCase().indexOf(check) >= 0) {
													hasOne = true;
												} else {
													hasAll = false;
												}
											});

											if( (needsAll && !hasAll) || (!needsAll && !hasOne) ) {
												var violation = {};
												violation.name = rule.name;
												violation.description = rule.description;
												violation.suggestions = rule.suggestions;
												violation.severity = rule.severity;
												violation.file = file;
												violation.line = -1;
												issues.push(violation);
											}
									}
							}
				});

		}

		debug.log(issues);
		if(callback) {
			callback(issues);
		} else {
			return issues;
		}
	}

function getThirdPartyResources(url,routedinfo,callback) {
				//lower case all the things
				_url = url;
				url = url.toLowerCase();
				//remove {}
				url = url.replace("{","");
				url = url.replace("}","");
				url = url.replace("!","");

				//remove !URLFOR
				url = url.replace("urlfor","");
				url = url.replace("(","");
				url = url.replace(")","");

				//remove "' \"
				url = url.replace("'","");
				url = url.replace("\\","");

				//remove ""
				url = url.replace('"','');


				//check for http
				if(url.indexOf('http') >= 0) { //normal third party resource, pull and add
					request('GET', url).done(function (res,err) {
											if(err) {debug.log(err); callback("");}
											else{callback(res.getBody().toString('utf8'),"Remote File:"+url);}
									});
					return;
				}


				//check for $Resource
				if(url.indexOf("$resource") >= 0) {
					if(url.indexOf(",") < 0) { //direct link
						 url = url.replace("$resource.","");
						 var query0 = "SELECT ID, Name, Body from StaticResource WHERE Name = '"+url+"'";
						 routedinfo.conn.tooling.query(query0,function(err,res){
							 	if(err) { callback(""); debug.log(err); }
								else{
									if(res.totalSize > 0) {
										request('GET', routedinfo.conn.instanceUrl + res.records[0].Body,{headers:{ContentType: 'application/json; charset=UTF-8', Accept: 'application/json', Authorization: 'Bearer '+routedinfo.req.session.accessToken}})
										.done(function (res,err) {
														if(err) {debug.log(err); callback("");}
														else{callback(res.getBody().toString('utf8'),"Static Resource:"+url);}
													});
									} else { callback(""); debug.log(url+" never found.  Try SELECT ID, Name, Body from StaticResource WHERE Name = '"+url+"'"); }
								}
						 })
						 return;
					} else {
						var resource_split0 = _url.split(",");
						var resource_split1 = url.split(",");
						var srname = resource_split1[0].trim().toLowerCase().replace("$resource.","");
						var dir = resource_split0[1].trim().replace(")","").replace("}","").replace('\"','').replace("\'","").replace("'","").replace('"','');

						var query0 = "SELECT ID, Name, Body from StaticResource WHERE Name = '"+srname+"'";
						routedinfo.conn.tooling.query(query0,function(err,res){
							 if(err) { callback(""); debug.log(err); }
							 else{
								 if(res.totalSize > 0) {
									 request('GET', routedinfo.conn.instanceUrl + res.records[0].Body,{headers:{ContentType: 'application/json; charset=UTF-8', Accept: 'application/json', Authorization: 'Bearer '+routedinfo.req.session.accessToken}})
									 .done(function (res,err) {
													 if(err) {debug.log(err); callback("");}
													 else{
														 try {
															 	var zip = adm_zip(res.getBody());
														 		callback(zip.readAsText(dir),"Static Resource:"+srname+","+dir);
															} catch (e) {
																debug.log("ZIP ERROR!");
																debug.log(e);
																callback("");
															}
													 }
												 });
								 } else { callback(""); debug.log(url+" never found.  Try SELECT ID, Name, Body from StaticResource WHERE Name = '"+srname+"'"); }
							 }
						})

						return;
					}
				}

				debug.log("Not sure what to do with "+url);
				callback("");
}

module.exports = {

	init : function(routedinfo) {},

	init_pages : function(routedinfo) {
		routedinfo.conn = new jsforce.Connection({
			        accessToken: routedinfo.req.session.accessToken,
			        instanceUrl: routedinfo.req.session.instanceUrl
			    });
		var query0 = "SELECT Id, Name, Markup from ApexPage";
		debug.log('Sending query '+query0);
		routedinfo.conn.query(query0, function(err, result) {
					  if (err) { return debug.logError(err); routedinfo.handler(routedinfo); }
					  else {
							debug.log(result.totalSize + "pages found");
							checkPages(result.records,routedinfo);
					  }
					});

	},

	init_components : function(routedinfo) {
		routedinfo.conn = new jsforce.Connection({
			        accessToken: routedinfo.req.session.accessToken,
			        instanceUrl: routedinfo.req.session.instanceUrl
			    });
		var query0 = "SELECT Id, Name, Markup from ApexComponent";
		debug.log('Sending query '+query0);
		routedinfo.conn.query(query0, function(err, result) {
					  if (err) { return debug.logError(err); routedinfo.handler(routedinfo); }
					  else {
							debug.log(result.totalSize + "components found");
							checkPages(result.records,routedinfo);
					  }
					});

	}

}

var debug = require('../util/debug');
var jsforce = require('jsforce');

module.exports = {

	addOAuthRoutes : function(app) {

		// Salesforce OAuth2 client information
		var oauth2 = new jsforce.OAuth2({
		    clientId: {PUBLICKEY},
		    clientSecret: {PRIVATEKEY},
		    redirectUri: 'http://localhost:8675/oauth/_callback'
		});

		if(process.env && process.env.clientId) {
			oauth2 = new jsforce.OAuth2({
					clientId: process.env.clientId,
					clientSecret: process.env.clientSecret,
					redirectUri: process.env.redirectUri
			});
		}

		/* SF OAuth request, redirect to SF login */
		app.get('/oauth/auth', function(req, res) {
		    res.redirect(oauth2.getAuthorizationUrl({scope: 'api id web'}));
		});

		/* OAuth callback from SF, pass received auth code and get access token */
		app.get('/oauth/_callback', function(req, res) {
		    var conn = new jsforce.Connection({oauth2: oauth2});
		    var code = req.query.code;
		    conn.authorize(code, function(err, userInfo) {
		        if (err) { return console.error(err); }

		        req.session.accessToken = conn.accessToken;
		        req.session.instanceUrl = conn.instanceUrl;
		        res.redirect('/');
		    });
		});


	}

}

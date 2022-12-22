const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
        

		var token = crypto.randomBytes(256).toString('hex');
        var obj = {username:username};
        sessions[token] = obj;

		var time  = setTimeout(function(){
			delete sessions[token];
            clearTimeout(time);
		}.bind(this),maxAge);

        response.cookie('cpen322-session',token,{maxAge:maxAge});

	};

	this.deleteSession = (request) => {
		/* To be implemented */
		delete request.username;
		delete sessions[request.session];
		delete request.session;
		
	};

	this.middleware = (request, response, next) => {
		/* To be implemented */
		var cookieString = request.headers.cookie;
        if (cookieString == null) {
            next(new SessionError("cookie header not found"));
            return;
        }
		// https://www.geeksforgeeks.org/how-to-parse-http-cookie-header-and-return-an-object-of-all-cookie-name-value-pairs-in-javascript/
        var pairs = cookieString.split(";");
        var splittedPairs = pairs.map(cookie => cookie.split("="));
        var cookieObj = splittedPairs.reduce(function (obj, cookie) {
            obj[decodeURIComponent(cookie[0].trim())]
                = decodeURIComponent(cookie[1].trim());
            return obj;
        }, {});

		if (sessions[cookieObj['cpen322-session']] == null) {
            next(new SessionError("session not found"));
            return;
        }

		request.session = cookieObj['cpen322-session'];
		request.username = sessions[cookieObj['cpen322-session']]['username'];

		next();
		



	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;
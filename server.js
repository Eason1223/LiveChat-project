const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const Database = require('./Database');
const SessionManager = require('./SessionManager');
const crypto = require('crypto');

var db = new Database("mongodb://localhost:27017", "cpen322-messenger");
var sessionManager = new SessionManager();

// assuming cpen322-tester.js is in the same directory as server.js
const cpen322 = require('./cpen322-tester.js');
const { randomInt } = require('crypto');
const { resolve } = require('path');

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

function isCorrectPassword(password, saltedHash){
	var hash = crypto.createHash('sha256');
	var hashCode = hash.update(password + saltedHash.slice(0,20)).digest('base64');
	if(hashCode==saltedHash.slice(20)){
		return true;
	}
	else{
		return false;
	}
	
}

function errorHandler(err, req, res, next){
	if (err instanceof SessionManager.Error) {
		if (req.get('Accept') == "application/json") {
            res.status(401).send(err);
        } 
		else {
            res.redirect('/login');
        }
	}
	else{
		res.status(500).send();
	}
	  
	  
}

// //https://stackoverflow.com/questions/2794137/sanitizing-user-input-before-adding-it-to-the-dom-in-javascript
// function sanitize(string) {
// 	const map = {
// 		'&': '&amp;',
// 		'<': '&lt;',
// 		'>': '&gt;',
// 		// '"': '&quot;',
// 		// "'": '&#x27;',
// 		// '/': '&#x2F;',
// 	};
// 	const reg = /[&<>]/ig;
// 	return string.replace(reg, (match)=>(map[match]));
// }

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

var broker = new ws.Server({port:8000});

broker.on('connection', function connection(ws,request) {
    sessionManager.middleware(request, null, (err) => {
        if (err) {
            ws.close();
        }
    });
	ws.on('message', function message(data) {
        var d = JSON.parse(data);
		d.text = d.text.replace('<', "$lt").replace('>', "$gt");

        messages[d.roomId].push({username: request.username, text: d.text});
		if (messages[d.roomId].length == messageBlockSize) {
            var conversation = {
                "room_id": d.roomId,
                "timestamp": Date.now(),
                "messages": messages[d.roomId]
            }

            db.addConversation(conversation).then((result) => {
                messages[d.roomId] = [];
            },
            (error) => {
                console.log(error);
            });
        }
		d.username = request.username;
        broker.clients.forEach(function each(client) {
            if (client != ws) {
                client.send(JSON.stringify(d));
            }
        })
    })
})

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

// // serve static files (client-side)
// app.use('/', express.static(clientApp, { extensions: ['html'] }));
// app.listen(port, () => {
// 	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
// });


var messages = {};
var messageBlockSize = 10;

db.getRooms().then(
	(result)=>{
		result.forEach(element => {
			messages[element._id] = [];
		});
	}
);


app.route('/chat').get(sessionManager.middleware,function(req, res, next){
	db.getRooms().then(
		(result)=>{
			result.forEach(element => {
				element.messages = messages[element._id];
			});
			res.send(result);
		}
	);
});

app.route('/chat/:room_id').get(sessionManager.middleware,function(req, res, next){
	db.getRoom(req.params.room_id).then(
		(result)=>{
			if(result==null){
				res.status(404).send(`Room ${req.params.room_id} is not found`);
			}
			else{
				res.send(result);
			}
			

		},
	);
});

app.route('/chat/:room_id/messages').get(sessionManager.middleware,function(req, res, next){
	db.getLastConversation(req.params.room_id,req.query.before).then(
		(result)=>{
				console.log(typeof result)
				res.send(result);
		}
	);
});

app.route('/chat').post(sessionManager.middleware,function(req, res, next){

	db.addRoom(req.body).then(
		(result)=>{
			messages[result._id] = [];
			res.status(200).send(JSON.stringify(result));
		},
		(error)=>{
			res.status(400).send(error);
		}
	);
	
});

app.route('/login').post(function(req, res, next){

	db.getUser(req.body.username).then(
		(result)=>{
			if(result==null){
				 res.redirect('/login');
			}
			else{
				if(isCorrectPassword(req.body.password,result.password)==true){
					sessionManager.createSession(res,req.body.username);
					res.redirect('/')
				}
				else{
					res.redirect('/login');
				}
			}
		}
	);
	
});

app.route('/profile').get(sessionManager.middleware,function(req, res, next){
	res.status(200).send({
		username: req.username
	})
});

app.route('/logout').get(sessionManager.middleware,function(req, res, next){
	sessionManager.deleteSession(req);
	res.redirect('/login');
});

app.get('/app.js', sessionManager.middleware);

app.get('/index.html', sessionManager.middleware);

app.get('/index', sessionManager.middleware);

app.get('/', sessionManager.middleware);

app.use(errorHandler);

// serve static files (client-side)
app.use('/', express.static(clientApp, { extensions: ['html'] }));
app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});

// at the very end of server.js
cpen322.connect('http://52.43.220.29/cpen322/test-a5-server.js');
cpen322.export(__filename, { app, messages, broker, db, messageBlockSize, sessionManager, isCorrectPassword});
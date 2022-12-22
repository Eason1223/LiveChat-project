const { MongoClient, ObjectID, ObjectId } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v4.2+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/4.2/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatrooms from `db`
			 * and resolve an array of chatrooms */
            rooms = db.collection("chatrooms").find().toArray();
            resolve(rooms);
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatroom from `db`
			 * and resolve the result */
            var objectid;
            var room;

            if(typeof room_id != 'string'){
                room = db.collection("chatrooms").findOne({_id:room_id});
                if(room == null){
                    objectid = room_id.toHexString();
                    room = db.collection("chatrooms").findOne({_id:objectid});
                }
                resolve(room);
                
            }
            else{
                if (ObjectId.isValid(room_id)) {
                    objectid = ObjectId(room_id);
                    room = db.collection("chatrooms").findOne({_id:objectid});
                }
                if(room == null){
                    room = db.collection("chatrooms").findOne({_id:room_id});
                }
                resolve(room);
            }
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			/* TODO: insert a room in the "chatrooms" collection in `db`
			 * and resolve the newly added room */
            if(room.name == null){
                reject(new Error("err"));
            }
            db.collection("chatrooms").insertOne(room);
            resolve(room);
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read a conversation from `db` based on the given arguments
			 * and resolve if found */
            if(before==null){
                before = Date.now();
            }
            
            // var result = db.collection("conversations").find({room_id: room_id,timestamp:{$lt:time}}).toArray();
            db.collection("conversations").find().toArray().then((result) => {
                var diff = before;
                var ans;

                result.forEach(element => {
                    if (element.room_id == room_id && element.timestamp < before) {
                        var curDiff = before - element.timestamp
                        if ( curDiff < diff) {
                            ans = element;
                            diff = curDiff;
                        }
                    }
                })

                resolve(ans);
            })
            
            

		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: insert a conversation in the "conversations" collection in `db`
			 * and resolve the newly added conversation */
            if(conversation.room_id == null || conversation.timestamp == null || conversation.messages == null){
                reject(new Error("err"));
            }
            db.collection("conversations").insert(conversation);
            resolve(conversation);
		})
	)
}

Database.prototype.getUser = function(username){
    return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatrooms from `db`
			 * and resolve an array of chatrooms */
            result = db.collection("users").findOne({username: username});
            resolve(result);
		})
	)
}

module.exports = Database;
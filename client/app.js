// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

var profile = {username:"Eason"}

//https://stackoverflow.com/questions/2794137/sanitizing-user-input-before-adding-it-to-the-dom-in-javascript
function sanitize(string) {
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      // '"': '&quot;',
      // "'": '&#x27;',
      // '/': '&#x2F;',
  };
  const reg = /[&<>]/ig;
  return string.replace(reg, (match)=>(map[match]));
}

class LobbyView {
    constructor(lobby){
      this.elem = createDOM(`<div class = content>
      <ul class = room-list>
        <li>
          <img src="assets/everyone-icon.png">
          <a href="#/chat/room-1">Everyone in CPEN322</a>
        </li>
        <li>
          <img src="assets/bibimbap.jpg">
          <a href="#/chat/room-1">Foodies only</a>
        </li>
        <li>
          <img src="assets/minecraft.jpg">
          <a href="#/chat/room-1">Gamers unite</a>
        </li>
        <li>
          <img src="assets/canucks.png">
          <a href="#/chat/room-1">Canucks Fans</a>
        </li>
        </ul>
        <div class="page-control">
        <input type="text" placeholder="Room Title">
        <button>Create Room</button>
        </div>
      </div>`);

      this.listElem = this.elem.querySelector("ul.room-list");
      this.inputElem = this.elem.querySelector("input");
      this.buttonElem = this.elem.querySelector("button");

      this.lobby = lobby;
      var lobbyViewLevel = this;

      this.lobby.onNewRoom = function(room){
        var listCode = `<li>
        <img src="${room.image}">
        <a href="#/chat/${room.id}">${room.name}</a>
        </li>`;
        lobbyViewLevel.listElem.appendChild(createDOM(listCode));
      }
      

      this.redrawList();

      this.buttonElem.addEventListener("click",function(){
        //lobbyViewLevel.lobby.addRoom(lobbyViewLevel.lobby.rooms.length,lobbyViewLevel.inputElem.value);
        Service.addRoom({name:lobbyViewLevel.inputElem.value}).then(
          (result)=> {
            lobbyViewLevel.lobby.addRoom(result.id,result.name);
          },
          (error)=> {
            console.log(error);
          }
        );
        lobbyViewLevel.inputElem.value = "";
      })
      
    }

    redrawList(){
      emptyDOM(this.listElem);
      for (let i in this.lobby.rooms){
        var listCode = `<li>
        <img src="${this.lobby.rooms[i].image}">
        <a href="#/chat/${this.lobby.rooms[i].id}">${this.lobby.rooms[i].name}</a>
        </li>`;
        this.listElem.appendChild(createDOM(listCode));
      }
      
    }

    
    
}

class ChatView {
  constructor(socket){
    this.socket = socket;
    this.elem = createDOM(`<div class="content">
      <h4 class="room-name">
        Foodies only
      </h4>
      <div class="message-list">
        <div class="message">
            <span class="message-user">Tim</span>
            <span class="message-text">Hi! How is everyone doing?</span>
        </div>
        <div class="my-message">
            <span class="message-user">Eason</span>
            <span class="message-text">Just chillin</span>
        </div>
      </div>
      <div class="page-control">
        <textarea></textarea>
        <button>Send</button>
      </div>`);
    
      this.titleElem = this.elem.querySelector("h4");
      this.chatElem = this.elem.querySelector("div.message-list");
      this.inputElem = this.elem.querySelector("textarea");
      this.buttonElem = this.elem.querySelector("button");
      this.room = null;

      var chatViewLevel = this;
      this.buttonElem.addEventListener("click",function(){
        chatViewLevel.sendMessage();
      });
      this.inputElem.addEventListener("keyup",function(e){
        if(e.keyCode == 13 && !e.shiftKey){
          chatViewLevel.sendMessage();
        }
      })

      var that = this;
      this.chatElem.addEventListener("wheel",(event)=>{
        if(that.room.canLoadConversation==true && event.deltaY<0 && that.chatElem.scrollTop < 0){
          //console.log(this.room)
          that.room.getLastConversation.next();
        }
      })

  }

  sendMessage(){
    if(this.inputElem.value != null){
      this.socket.send(JSON.stringify({roomId:this.room.id, username:profile.username, text:this.inputElem.value}));
      this.room.addMessage(profile.username,this.inputElem.value);
      this.inputElem.value = "";
    }
  }

  setRoom(room){
    this.room = room;
    this.titleElem.innerText = room.name;
    var chatViewLevel = this;
    emptyDOM(this.chatElem);

    for (let i in room.messages){
      var listCode;

      room.messages[i].text = sanitize(room.messages[i].text);

      if(room.messages[i].username==profile.username){
        listCode = `<div class="my-message">
        <span class="message-user">${room.messages[i].username}</span>
        <span class="message-text">${room.messages[i].text}</span>
        </div>`;
      }
      else{
        listCode = `<div class="message">
        <span class="message-user">${room.messages[i].username}</span>
        <span class="message-text">${room.messages[i].text}</span>
        </div>`;
      }
      
      chatViewLevel.chatElem.appendChild(createDOM(listCode));
    }

    this.room.onNewMessage = function(message){
      
      var listCode;

      message.text = sanitize(message.text);

      if(message.username==profile.username){
        listCode = `<div class="my-message">
        <span class="message-user">${message.username}</span>
        <span class="message-text">${message.text}</span>
        </div>`;
      }
      else{
        listCode = `<div class="message">
        <span class="message-user">${message.username}</span>
        <span class="message-text">${message.text}</span>
        </div>`;
      }
      
      chatViewLevel.chatElem.appendChild(createDOM(listCode));

    }


  }
}

class ProfileView {
  constructor(){
    this.elem = createDOM(`<div class = content>
    <div class="profile-form">
        <div class="form-field">
            <label>Username</label>
            <input type="text">
        </div>
        <div class="form-field">
            <label>Password</label>
            <input type="password">
        </div>
        <div class="form-field">
            <label>Image</label>
            <input type="file">
        </div>
    </div>
    <div class="page-control">
        <button>Save</button>
    </div>
</div>`);
  }
}

class Room {
  constructor(id,name,image,messages){
    this.id = id;
    this.name = name;
    this.canLoadConversation=true;
    this.time=Date.now();
    this.getLastConversation=makeConversationLoader(this);

    if(image==undefined){
      this.image = "assets/everyone-icon.png"
    }
    else{
      this.image = image;
    }

    if(messages==undefined){
      this.messages = [];
    }
    else{
      this.messages = messages;
    }

  }

  addMessage(username, text){
    if(text.trim()==""){
      return;
    }
    else{
      text = sanitize(text);
      this.messages.push({username: username, text: text});
      if(this.onNewMessage != undefined){
        //typeof this.onNewMessage ==='function'
        this.onNewMessage({username: username, text: text});
      }
    }
    
  }
  
  addConversation(conversation){
    conversation.messages.forEach(element => {
      this.messages.push(element);
    })
    this.onFetchConversation(conversation);


  }
}

class Lobby {
  constructor(){
    // var room_0 = new Room(0,"400d","assets/everyone-icon.png",[]);
    // var room_1 = new Room(1,"400a","assets/everyone-icon.png",[]);
    // var room_2 = new Room(2,"400b","assets/everyone-icon.png",[]);
    // var room_3 = new Room(3,"400f","assets/everyone-icon.png",[]);

    // this.rooms = {0:room_0, 1:room_1, 2:room_2, 3:room_3};
    this.rooms = {

    };

        
  }

  getRoom(roomId) {
    if(roomId in this.rooms){
      return this.rooms[roomId];
    }
    else{
      return;
    }
  }

  addRoom(id, name, image, messages){
    var newRoom = new Room(id, name, image, messages);
    this.rooms[id] = newRoom;
    
    if(typeof this.onNewRoom ==='function'){
      this.onNewRoom(newRoom);
    }
  }
}

function main(){

    var socket = new WebSocket("ws://localhost:8000");
    var lobby = new Lobby();
    var lobbyView = new LobbyView(lobby);
    var chatView = new ChatView(socket);
    var profileView = new ProfileView();
    Service.getProfile().then((result)=>{
      profile = result;
    });
    
    socket.addEventListener("message",function(message){
      var mes = JSON.parse(message.data);
      mes.text = sanitize(mes.text);
      lobby.getRoom(mes.roomId).addMessage(mes.username,mes.text);
    });

    function renderRoute(){
        var s = window.location.hash;
        //console.log(s)
        if(s == "#/"){
          var node = document.getElementById("page-view");
          emptyDOM (node);
          node.appendChild(lobbyView.elem);

        }
        else if(s.startsWith("#/chat/")){
          var roomName = s.split("/");
          var room = lobby.getRoom(roomName[2]);
          if(room != null){
            chatView.setRoom(room);
          }
          var node = document.getElementById("page-view");
          emptyDOM (node);
          node.appendChild(chatView.elem);
        }
        else if(s == "#/profile"){
          var node = document.getElementById("page-view");
          emptyDOM (node);
          node.appendChild(profileView.elem);
        }
    }

    renderRoute();

    function refreshLobby(){
      Service.getAllRooms().then(
        (result)=> {
          result.forEach(element => {
            var room = lobby.getRoom(element._id);
            if(room==null){
              lobby.addRoom(element._id, element.name, element.image, element.messages);
            }
            else{
              room.name = element.name;
              room.image = element.image;
            }
          });
        },
        (error)=> {
          console.log(error);
        }
      )
    }

    refreshLobby();

    window.addEventListener('popstate', renderRoute);
    setInterval(refreshLobby,6000);
    
    cpen322.export(arguments.callee, { renderRoute, lobbyView, chatView, profileView, lobby, refreshLobby, socket});
}

Service = {
  origin: window.location.origin,
  getAllRooms: function(){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", Service.origin+"/chat");

    var reqProm = new Promise((resolve, reject)=> {
      xhttp.onload = function(){
        if(xhttp.status!=200){
          reject(new Error(xhttp.responseText));
        }else{
          resolve(JSON.parse(xhttp.responseText));
        }
      }
      xhttp.onerror=function(err){
        reject(new Error(err));
      }
    });

    xhttp.send();
    return reqProm;
  },
  addRoom: function(data){
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", Service.origin+"/chat");
    xhttp.setRequestHeader("Content-Type", "application/json");

    var reqProm = new Promise((resolve, reject)=> {
      xhttp.onload = function(){
        if(xhttp.status!=200){
          reject(new Error(xhttp.responseText));
        }else{
          resolve(JSON.parse(xhttp.responseText));
        }
      }
      xhttp.onerror=function(err){
        reject(new Error(err));
      }
    });

    xhttp.send(JSON.stringify(data));
    return reqProm;
  },
  getLastConversation: function(roomId,before){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", Service.origin+"/chat/"+ roomId +"/messages?before="+ before);
    xhttp.send(null);
    return new Promise((resolve, reject)=> {
      xhttp.onload = function(){
        //console.log(typeof xhttp.responseText);
        resolve(JSON.parse(xhttp.responseText));
      }
    });

  },
  getProfile: function(){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", Service.origin+"/profile");
    xhttp.send(null);
    return new Promise((resolve, reject)=> {
      xhttp.onload = function(){
        resolve(JSON.parse(xhttp.responseText));
      }
    });
  }
}

  function * makeConversationLoader(room){
    var last_record=room.time;
    while(room.canLoadConversation){
        room.canLoadConversation=false;
        yield new Promise((resolve,reject)=>{
            Service.getLastConversation(room.id,last_record).then(
                (result)=>{
                    if(result==null){
                        resolve(null);
                    }
                    else{
                        last_record=result.timestamp;
                        room.addConversation(result);
                        room.canLoadConversation=true;
                        resolve(result);
                    }
                }
            );

        });
  }




}

window.addEventListener("load", main)
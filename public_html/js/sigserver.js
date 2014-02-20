#!/usr/bin/env node

var libpath = require('path'),
http = require("http"),
fs = require('fs'),
url = require("url"),
mime = require('/usr/local/lib/node_modules/mime');
 
var path = ".";
var port = 3000;
 
http.createServer(function (request, response) {
 
var uri = url.parse(request.url).pathname;
var filename = libpath.join(path, uri);
 
libpath.exists(filename, function (exists) {
if (!exists) {
response.writeHead(404, {
"Content-Type": "text/plain"
});
response.write("404 Not Found ****" + filename + "\n");
response.end();
return;
}
 
if (fs.statSync(filename).isDirectory()) {
filename += '/index.html';
}
 
fs.readFile(filename, "binary", function (err, file) {
if (err) {
response.writeHead(500, {
"Content-Type": "text/plain"
});
response.write(err + "\n");
response.end();
return;
}


 
var type = mime.lookup(filename);
response.writeHead(200, {
"Content-Type": type
});
response.write(file, "binary");
response.end();
});
});
}).listen(port);


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


var WebSocketServer =  require('/usr/local/lib/node_modules/websocket').server;
var http = require('http');




function CallParty (userid, sigchannel) {
    this.userid = userid;
    this.sigchannel = sigchannel;      
}

function CallDetails(callid, caller, callee) {
  this.callid = callid;
  this.caller = caller;
  this.callee = callee;
}

CallDetails.print = function () {
    console.log("callid=[" + this.callid + "], caller=[" + this.caller + "], calee=[" + this.callee + "]");
};

function UserData (userid) {
    this.userid = userid;
    callids = {};
};

UserData.registerCall = function (callid) {
    callids[callid] = callid;
};

UserData.unregisterCall = function (callid) {
    callids[callid] = null;
};

var registerMap = {};

var activeCallMap = {};

var userDataBySigchannel = {};

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    return true;
    response.end();
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

// put logic here to detect whether the specified origin is allowed.
function originIsAllowed(origin) {
    console.log('The origin is',origin);
    return true;
}

wsServer.on('request', function(request) {
    
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var con = request.accept('appstract', request.origin);

    console.log((new Date()) + ' Connection accepted.');

	//console.log(con);

    con.on('message', function(message) {
        if (message.type === 'utf8') {
           processSignalingMessage(con, message.utf8Data);
        }
        else if (message.type === 'binary') {
           console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
        }
    });
    
    Array.prototype.contains = function(obj) {
       var i = this.length;
       while (i--) {
          if (this[i] === obj) {
              return true;
          }
      }
      return false;
    };


    con.on('close', function(reasonCode, description) {
        
        userData = userDataBySigchannel[con];
       
        if (userData !== null) {
            
            console.log((new Date()) + " User [" + userData.userid + "] with sigchannel remote address [" + con.remoteAddress + " ] disconnected, RC=[" + reasonCode + "], DESC=[" + description +"]");
            
            for (var i = 0; i < userData.callids.length; i++){
                
                callDetails = activeCallMap[userData.callids[i]];
                if (callDetails !== null){
                    console.log((new Date()) + "The call details " + callDetails.print() + " were removed because User [" + userData.userid + "] was disconnected" );
                    activeCallMap[userData.callids[i]] = null;
                }
            }
            
            registerMap[userData.userid] = null;
        }
        
        console.log((new Date()) + " Unknown User with sigchannel remote address [" + con.remoteAddress + " ] disconnected, RC=[" + reasonCode + "], DESC=[" + description +"]");
    });
    
    
    function processSignalingMessage(con, message) {

        console.log("processSignalingMessage");
        
        util = require("util");
        // util.inspect(sigchannel) - Way to print a javascript object in NOde JS


        var msg = JSON.parse(message);
        console.log(msg);
        
        switch (msg.msg_type) {

            case "OFFER":
                
                var sigchannel = registerMap[msg.calleeid];
                if (sigchannel === null) {
                    console.log("The call [" + msg.callid + "] OFFER attempt from [" + msg.userid + "] to [" + msg.calleeid + "] FAILED, " + msg.calleeid + "not registered");
                    // TBD - Send error message back to caller
                    break;
                }
                //The  web socket server just relays this message to the specified destination
                sigchannel.send(JSON.stringify(msg));
                console.log("OFFER [" + msg.userid + "]-->[" + msg.calleeid + "], FROM remoteaddress=[" + con.remoteAddress + "], localport=[" + con.socket._peername.port + "] TO remoteaddress=[" + sigchannel.remoteAddress + "], localport=[" + sigchannel.socket._peername.port + "], SDP =\n" + msg.data.sdp);
                
                var callDetails = new CallDetails(msg.callid, new CallParty(msg.userid, con), new CallParty(msg.calleeid, sigchannel));
                activeCallMap[msg.callid] = callDetails;
                
                break;

            case "ANSWER":
                
                var callDetails = activeCallMap[msg.callid];
                if (callDetails === null) {
                    console.log("The call [" + msg.callid + "] ANSWER attempt from [" + msg.userid + "] to [" + msg.callerid + "] FAILED, the call details not found");
                    // TBD - Send error message back to callee
                    break;
                }
                //The  web socket server just relays this message to the specified destination
                callDetails.caller.sigchannel.send(JSON.stringify(msg));
                console.log("ANSWER [" + msg.userid + "]-->[" + msg.callerid + "], SDP =\n" + msg.data.sdp);
                
                break;

            case "BYE":
                
                var callDetails = activeCallMap[msg.callid];
                if (callDetails === null) {
                    console.log("The call [" + msg.callid + "] BYE attempt from [" + msg.userid + "] FAILED, the call details not found");
                    // TBD - Send error message back to byeer
                    break;
                }
                
                if (callDetails.caller.sigchannel === con){
                    console.log("The call " + callDetails.print() + " was hanged up by calee");
                    callDetails.callee.sigchannel.send(JSON.stringify(msg));
                }
                else {
                    console.log("The call " + callDetails.print() + " was hanged up by the the caller");
                    callDetails.caller.sigchannel.send(JSON.stringify(msg));
                }
                
                activeCallMap[msg.callid] = null;
       
                break;

            case "CANDIDATE":
                
                var callDetails = activeCallMap[msg.callid];
                if (callDetails === null) {
                    console.log("The call [" + msg.callid + "] CANDIDATE attempt from [" + msg.userid + "] FAILED, the call details not found");
                    // TBD - Send error message back to the candidates sender
                    break;
                }
                
                if (callDetails.caller.sigchannel === con){
                    console.log("CANDIDATE [" + callDetails.caller + "]-->[" +  callDetails.callee + "], CANDIDATE =\n" + msg.candidate);
                    callDetails.callee.sigchannel.send(JSON.stringify(msg));
                }
                else {
                    console.log("CANDIDATE [" + callDetails.callee + "]-->[" +  callDetails.caller + "], CANDIDATE =\n" + msg.candidate);
                    callDetails.caller.sigchannel.send(JSON.stringify(msg));
                }
                
                break;

            case "REGISTER":
                
                registerMap[msg.userid] = con;
                userDataBySigchannel[con] = new UserData(msg.userid);         
                
                console.log("REGISTER userid=[" + msg.userid + "], sigchannel=[" +  con + "], remoteaddress=[" + con.remoteAddress + "], localport=[" + con.socket._peername.port + "]");
                
                break;
                
            default:
                console.log("Unsupported Message Type [" + msg.msg_type + "]");
        }
    }

});


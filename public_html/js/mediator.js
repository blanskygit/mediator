/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

"use strict"

// References
//
// Original code as provided by Antony Meyn (Nov 03, 2012)
//
// https://groups.google.com/forum/?fromgroups=#!topic/discuss-webrtc/emzrT-WDhoE
// Getting a Simple Example of webkitRTCPeerConnection to work
//
// Updated to a combined version of client and server by Dick Gooris (Dec 27, 2012)
//

// This is where the node.js is running
var nodeHostAddress     = "54.201.205.82";
var nodeHostPort        = "8080";
var userId              = "blansky";
var appcontext          = "appstract";

var stunServer       = "stun:stun.l.google.com:19302";
var channelReady     = false;



var sigchannel;
var pc;
var socket;
var localStream;
var remoteStream;

// Obtain the script parameter (CLIENT or SERVER)
var params = document.body.getElementsByTagName('script');
var query = params[0].classList;
var weAreActingAs = query[0];
var sdpConstraints = {'mandatory': {
                        'OfferToReceiveAudio':true, 
                        'OfferToReceiveVideo':true }};

// Button state definitions
btn1.disabled = false;
btn2.disabled = true;




var mediator = new Mediator(userId)


function Mediator(userId){
    this.userId = userId;
    this.sigchannel = new SignalingChannel(nodeHostAddress, nodeHostPort, mediator);
}

Mediator.init = function() {
    
    btn1.disabled = true;
    btn2.disabled = false;

    // Clear the trace section
    tracer.clear();
    
    trace("Mediator.init", "Initializes navigator.getUserMedia & window.URL");

    navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;
    
    window.URL = window.URL || window.webkitURL;
};




// Open a channel towards the Node server
var openChannel = function () {

    trace("openChannel","Opening channel");

    // Construction of the websocket together with the application

	trace("ws://' + nodeHostAddress + ':' + nodeHostPort",'Channel opened.');

    socket = new WebSocket('ws://10.112.10.238:8080', 'appstract');

    socket.onopen = function () {

       trace("openChannel",'Channel opened.');

       // send as CLIENT or SERVER
       var msgINFO = {};
       msgINFO.msg_type = weAreActingAs;
       socket.send(JSON.stringify(msgINFO));

       // if we are acting as CLIENT
        if (weAreActingAs == 'CLIENT') {

            trace("openChannel", "Creating PeerConnection");
            createPeerConnection();

            trace("openChannel", "Adding local stream");
            pc.addStream(localStream);

            trace("openChannel", "Sending offer to peer");

            pc.createOffer(function(sessionDescription) {
                pc.setLocalDescription(sessionDescription);
                var msgOFFER = {};
                msgOFFER.msg_type = 'OFFER';
                msgOFFER.data = sessionDescription;
                trace("openChannel", "Sending sdp : " + sessionDescription.sdp);
                socket.send(JSON.stringify(msgOFFER));
            }, null, sdpConstraints);

        };
    };

    socket.onerror = function (error) {
       trace("openChannel",'Channel error.', error);
    };

    socket.onclose = function () {
       trace("openChannel",'Channel close.');
       
       btn1.disabled = false;
       btn2.disabled = false;
       
       channelReady = false;
    };

    // Log messages from the server
    socket.onmessage = function (e) {
      var msg = JSON.parse(e.data);
      trace("openChannel"," Received message type : " + msg.msg_type);
      switch (msg.msg_type) {

         // To be processed as Server
         case "OFFER":
            trace("openChannel","offer");
            createPeerConnection();
            pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
			
            break;

         // To be processed as Client
         case "ANSWER":
            pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            trace("openChannel","answer");	    
            // trace("openChannel","Got Answer : " + msg.data.sdp);
            break;

         // To be processed as either Client or Server
         case "BYE":
            pc.close();
            btn1.disabled = false;
            btn2.disabled = false;
            break;

         // To be processed as either Client or Server
         case "CANDIDATE":
            var candidate = new RTCIceCandidate({candidate: msg.candidate});
            pc.addIceCandidate(candidate);
            break;

         // Unexpected, but reserved for other message types
         default:
            trace("openChannel",'default');
      }

    };
}

// This function in invoked in case access to the camera devide is rejected
var accessRejected = function() {
    trace("accessRejected","accessRejected");
};

// This function is used to check if the browser has the required API implementation to access the device camera
// Note: Opera is unprefixed. Returns a boolean
var hasGetUserMedia = function() {
    return !!(navigator.getUserMedia ||
              navigator.webkitGetUserMedia ||
              navigator.mozGetUserMedia ||
              navigator.msGetUserMedia);
}



/*******************************************************************************************
 * 
 *                      GUI API            
 * 
 *******************************************************************************************/



// Main entry point...
function start() {
    
    trace("start", "Starting Mediator");
    
    mediator.init();
    
    if (!hasGetUserMedia()) {
         trace("start", "ERROR - GetUserMedia not supported by the browser!");
    }
    else {
        mediator.sigchannel.open(appcontext);
    }
};

function call(/* TBD - call target */) {

    btn2.disabled = true;

    trace("call", "Starting call");

    mediator.makeCall();
    
}

function hangup() {

  // Send bye to the peer
  trace("hangup","Sending BYE");
  
  try {  
     var msgBYE = {};
     msgBYE.msg_type = 'BYE';
     socket.send(JSON.stringify(msgBYE));
    } catch(e) {
     trace("hangup","Peer connection was not established yet");
  }

  stop();
}

function stop() {

    trace("stop","Stopping");
    
    btn1.disabled = false;
    btn2.disabled = false;
    
    try {
     pc.close();
     pc = null;
    } catch(e) {
      trace("stop","Peer connection was not established yet");
    }
}

/*******************************************************************************************
 * 
 *                       Signaling Channel Callbacks  
 * 
 *******************************************************************************************/


/**
 * 
 * @param {type} offer
 * @returns {undefined}
 */
Mediator.onOfferMedia = function(offer) {
    trace("Mediator.onOfferMedia", "Received OFFER = \n" + offer);
    
    // Creates PeerConnection on OFFER (callee side)
    createPeerConnection();
    
    pc.setRemoteDescription(new RTCSessionDescription(offer));
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
};


/**
 * 
 * @param {type} answer
 * @returns {undefined}
 */
Mediator.onAnswerMedia = function(answer) {
    trace("Mediator.onAnswerMedia", "Received ANSWER = \n" + answer);
    
    pc.setRemoteDescription(new RTCSessionDescription(answer));
};


/**
 * 
 * @returns {undefined}
 */
Mediator.onByeMedia = function() {
    trace("Mediator.onByeMedia", "Received BYE");
    
    pc.close();
    btn1.disabled = false;
    btn2.disabled = false;
};



Mediator.onCandidateMedia = function(candidate) {
    trace("Mediator.onByeMedia", "Received CANDIDATE = \n" + candidate);
    
    var iceCandidate = new RTCIceCandidate({candidate: candidate});
    pc.addIceCandidate(iceCandidate);
};


Mediator.onSignalingChannelError = function(error) {
    trace("Mediator.onSignalingChannelError", "Received ERROR from Signaling Channel, error [" + error + "]");
    
    // TBD
};

Mediator.onSignalingChannelClose = function() {
    trace("Mediator.onSignalingChannelError", "Received CLOSE from Signaling Channel");
    
    btn1.disabled = false;
    btn2.disabled = false;
    
    // TBD
    
};





/**
 * 
 * @returns {undefined}
 */
Mediator.makeCall = function () {
    
    var video = $("#local-video");

    navigator.getUserMedia({audio: true, video: true}, function(stream) {

        localStream = stream;
        
        trace("Mediator.makeCall", "Retrieved Local Stream \n[" + stream + "]");

        video.attr('src', window.URL.createObjectURL(localStream));
        
        // Creates Peer Connection on make call
        createPeerConnection();
        
        pc.createOffer(function(sessionDescription) {
            
                pc.setLocalDescription(sessionDescription);
                
                mediator.sigchannel.offerMedia(sessionDescription);
                
            }, null, sdpConstraints);
        
    }, accessRejected);
}



/**
 * 
 * @returns {undefined}
 */
var createPeerConnection = function() {

    var pc_config = {"iceServers": [{"url": stunServer}]};

    pc = new webkitRTCPeerConnection(pc_config);

    pc.onicecandidate = onIceCandidate;
    pc.onconnecting   = onSessionConnecting;
    pc.onopen         = onSessionOpened;

    // On add stream for remote stream presentation
    pc.onaddstream = function(event) {
       
       // Creates URL for the remote stream 
       var url = webkitURL.createObjectURL(event.stream);
       
       // Saves the remote stream
       remoteStream = event.stream;
       
       // Connects the URL to the "remote-video" window 
       $("#remote-video").attr("src", url);
       
       trace("createPeerConnection","Remote stream added for URL [" + url + "]");
    };

    pc.onremovestream = onRemoteStreamRemoved;

    trace("createPeerConnection", "Created webkitRTCPeerConnnection ");
    
    // Once the pc created adds local stream
    pc.addStream(localStream);
    
    trace("createPeerConnection", "Added local stream");
};


/*******************************************************************************************
 * 
 *                       WebRTC Callbacks  
 * 
 *******************************************************************************************/


// This function sends candidates to the remote peer, via the node server
var onIceCandidate = function(event) {

    if (event.candidate) {

       trace("openChannel","Sending ICE candidate to remote peer : " + event.candidate.candidate);
       var msgCANDIDATE = {};
       msgCANDIDATE.msg_type  = 'CANDIDATE';
       msgCANDIDATE.candidate = event.candidate.candidate;
       socket.send(JSON.stringify(msgCANDIDATE));

    } else {
       trace("onIceCandidate","End of candidates");
    }
}

var onSessionConnecting = function(message) {
    trace("onSessionConnecting","Session connecting");
}

var onSessionOpened = function(message) {
    trace("onSessionOpened","Session opened");
}

var onRemoteStreamRemoved = function(event) {
    trace("onRemoteStreamRemoved","Remote stream removed");
}



// In case we received an OFFER as SERVER, we send an ANSWER backwards
function setLocalAndSendMessage(sessionDescription) {
    trace("setLocalAndSendMessage", "Triggers ANSWER");
    pc.setLocalDescription(sessionDescription);
    mediator.sigchannel.answerMedia(sessionDescription);
}
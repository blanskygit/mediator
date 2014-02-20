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
var defaultsigserveraddr     = "54.201.205.82:8080";
var userid              = "blansky";
var appcontext          = "appstract";

var stunServer       = "stun:stun.l.google.com:19302";
var channelReady     = false;


var pc;
var socket;
var localStream;
var remoteStream;
var sigchannel;

// Obtain the script parameter (CLIENT or SERVER)
var params = document.body.getElementsByTagName('script');
var query = params[0].classList;
var sdpConstraints = {'mandatory': {
                        'OfferToReceiveAudio':true, 
                        'OfferToReceiveVideo':true }};




function initParams() {
    // Button state definitions
    btn1.disabled = false;
    btn2.disabled = true;
    sigservertextbox.value = defaultsigserveraddr;

    $.getScript("./js/tracer.js", function() {
        trace("initParams", "tracer.js loaded ------");
    });
    
    $.getScript("./js/signalingchannel.js", function() {
        trace("initParams", "signalingchannel.js loaded ------");
        sigchannel = new SignalingChannel();
    });
    
    $.getScript("./js/uuidgenerator.js", function() {
        trace("initParams", "uuidgenerator.js loaded ------");
    });
};


function CallDetails(caller, callee) {
  this.callid = Math.uuidFast();
  this.callerid = caller;
  this.calleeid = callee;
};




CallDetails.prototype.print = function () {
    trace("CallDetails.prototype.print", "callid=[" + this.callid + "], caller=[" + this.callerid + "], calee=[" + this.calleeid + "]");
};

var mediator = new Mediator();


function Mediator(){
    this.userid = userid;
    this.sigchannel = sigchannel;
    this.activecalls = {};
    this.activecallsByPc = {};
    this.candidates = new Array();
    this.sigserveraddr = defaultsigserveraddr;
}

Mediator.prototype.init = function() {
    
    btn1.disabled = true;
    btn2.disabled = false;
    
    
    this.userid = useridtextbox.value;
    
    if (sigservertextbox.value != null && !sigservertextbox.value.match("")){
        this.sigserveraddr = sigservertextbox.value;
    }

    // Clear the trace section
    tracer.clear();
    
    trace("Mediator.prototype.init", "Initializes navigator.getUserMedia & window.URL");

    navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;
    
    window.URL = window.URL || window.webkitURL;
};


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
        //sigchannel.open(mediator, appcontext);
        sigchannel.open(mediator, appcontext);
    }
};

function call(/* TBD - call target */) {

    btn2.disabled = true;

    trace("call", "Starting call");

    mediator.makeCall(/* TBD - call target */);
    
}

function hangup() {

    // Send bye to the peer
    trace("hangup", "Sending BYE");
    
    var calldetails = mediator.activecallsByPc[pc];

    try {
        sigchannel.hangupMedia(calldetails);
    } catch (e) {
        trace("hangup", "Peer connection was not established yet" + e);
    }
    
    // Resets all the resources
    stop();
}

function stop() {

    trace("stop","Stopping");
    
    btn1.disabled = false;
    btn2.disabled = false;
    
  
    mediator.activecallsByCallId = {};
    mediator.activecallsByPc = {};
    
    // TBD
    
    try {
     pc.removeStream(localStream);   
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
Mediator.prototype.onOfferMedia = function(offer, calldetails) {

    trace("Mediator.prototype.onOfferMedia", "New call: callid=[" + calldetails.callid + "], caller=[" + calldetails.callerid + "], calee=[" + calldetails.calleeid + "], Received OFFER = \n" + offer.sdp);

    // Adds new call details
    mediator.activecalls[calldetails.callid] = calldetails;

    var video = $("#local-video");


    // Creates Peer Connection on make call
    createPeerConnection(calldetails);


    navigator.getUserMedia({audio: true, video: true}, function(stream) {

        localStream = stream;

        trace("Mediator.prototype.onOfferMedia", "Retrieved Local Stream \n[" + stream + "]");

        video.attr('src', window.URL.createObjectURL(localStream));

        // Creates Peer Connection on make call
        //createPeerConnection(calldetails);
        pc.addStream(localStream);

        trace("Mediator.prototype.onOfferMedia", "Added local stream");

        pc.setRemoteDescription(new RTCSessionDescription(offer));
        pc.createAnswer(setLocalAndSendMessage, null /* onSuccess */, sdpConstraints);

    }, accessRejected);

   
};


/**
 * @param {type} answer
 * @param {type} calldetails
 * @returns {undefined}
 */
Mediator.prototype.onAnswerMedia = function(answer, calldetails) {
    trace("Mediator.prototype.onAnswerMedia", "callid=[" + calldetails.callid + "], caller=[" + calldetails.callerid + "], calee=[" + calldetails.calleeid + "], Received ANSWER = \n" + answer.sdp);
    
    for (var i = 0; i < mediator.candidates.length; i++){
        sigchannel.candidate(mediator.candidates[i], calldetails);
    }
    
    pc.setRemoteDescription(new RTCSessionDescription(answer));
};


/**
 * 
 * @returns {undefined}
 */
Mediator.prototype.onByeMedia = function(calldetails) {
    trace("Mediator.prototype.onByeMedia", "Received BYE");
    
    pc.close();
    btn1.disabled = false;
    btn2.disabled = false;
    
    this.activecalls[calldetails.callid] = null;
};



Mediator.prototype.onCandidateMedia = function(candidate, calldetails) {
    trace("Mediator.prototype.onCandidateMedia", "Received CANDIDATE = \n" + candidate);
    
    var iceCandidate = new RTCIceCandidate({candidate: candidate});
    pc.addIceCandidate(iceCandidate);
};


Mediator.prototype.onSignalingChannelError = function(error) {
    trace("Mediator.prototype.onSignalingChannelError", "Received ERROR from Signaling Channel, error [" + error + "]");
    
    // TBD
};

Mediator.prototype.onSignalingChannelClose = function() {
    trace("Mediator.prototype.onSignalingChannelError", "Received CLOSE from Signaling Channel");
    
    stop();
    
};




/**
 * 
 * @returns {undefined}
 */
Mediator.prototype.makeCall = function (/* calee */) {
    
    var callee = calleetextbox.value;
    
    var calldetails = new CallDetails(mediator.userid, callee);
    
    // Adds new call details
    mediator.activecalls[calldetails.callid] = calldetails;
    
    var video = $("#local-video");

    
    navigator.getUserMedia({audio: true, video: true}, function(stream) {

        localStream = stream;
        
        trace("Mediator.prototype.makeCall", "Retrieved Local Stream \n[" + stream + "]");

        video.attr('src', window.URL.createObjectURL(localStream));
        
        // Creates Peer Connection on make call
        createPeerConnection(calldetails);
        
        pc.addStream(localStream);
        
        trace("Mediator.prototype.makeCall", "Added local stream");
        
        pc.createOffer(function(sessionDescription) {
            
                pc.setLocalDescription(sessionDescription);
                
                // Sends OFFER
                sigchannel.offerMedia(sessionDescription, calldetails);
                
            }, null , sdpConstraints);
        
    }, accessRejected);
   
};



/**
 * 
 * @returns {undefined}
 */
var createPeerConnection = function(calldetails) {

    var pc_config = {"iceServers": [{"url": stunServer}]};

    pc = new webkitRTCPeerConnection(pc_config);

    mediator.activecallsByPc[pc] = calldetails;

    pc.onicecandidate = onIceCandidate;
    pc.onconnecting = onSessionConnecting;
    pc.onopen = onSessionOpened;

    // On add stream for remote stream presentation
    pc.onaddstream = function(event) {

        // Creates URL for the remote stream 
        var url = webkitURL.createObjectURL(event.stream);

        // Saves the remote stream
        remoteStream = event.stream;

        // Connects the URL to the "remote-video" window 
        $("#remote-video").attr("src", url);

        trace("createPeerConnection", "Remote stream added for URL [" + url + "]");
    };

    pc.onremovestream = onRemoteStreamRemoved;

    trace("createPeerConnection", "PeerConnnection created");
};


/*******************************************************************************************
 * 
 *                       WebRTC Callbacks  
 * 
 *******************************************************************************************/


// This function sends candidates to the remote peer, via the node server
var onIceCandidate = function(event) {

    if (event.candidate) {
       trace("onIceCandidate", "Sending ICE candidate to remote peer : " + event.candidate.candidate);
       
       // Retrieves the context PC of this callback - get the relevant call by the PC 
       var evpc = event.currentTarget;
       
       var calldetails = mediator.activecallsByPc[evpc];
       
       if (mediator.userid.match(calldetails.callerid)){ // Caller case, store all the candidates
           mediator.candidates.push(event.candidate.candidate);
       }
       else { //Callee case
            sigchannel.candidate(event.candidate.candidate, calldetails);
        }
       
      
    } else {
       trace("onIceCandidate","End of candidates");
    }
};

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
    var calldetails = mediator.activecallsByPc[pc];
    sigchannel.answerMedia(sessionDescription, calldetails);
}




 
 

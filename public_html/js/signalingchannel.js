/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/**
 * 
 * @param {type} targetHost
 * @param {type} targetPort
 * @param {type} mediator
 * @returns {SignalingChannel}
 */
function SignalingChannel(targetHost, targetPort, mediator) {
  this.targetHost = targetHost;
  this.targetPort = targetPort;
  this.tracer = new Tracer("SignalingChannel");
  this.mediator = mediator;
  this.socket;
}

/**
 * 
 * @param {type} appcontext
 * @returns {undefined}
 */
SignalingChannel.open = function(appcontext) {

    this.tracer.trace("SignalingChannel.open", "Opening channel");

    // Construction of the websocket together with the application

    var targetURL = 'ws://' + this.targetHost + ':' + this.targetPort;

    this.tracer.trace("SignalingChannel.open", 'Channel URL: ' + targetURL);

    this.socket = new WebSocket(targetURL, appcontext);

    this.socket.onopen = function() {
        
        trace("SignalingChannel.open.socket.onopen", "Signaling Channel open, sends REGISTER for user id [" + this.mediator.userid + "]");
        
         var msgREGISTER = {};
            msgREGISTER.msg_type = "REGISTER";
            msgREGISTER.userid = this.mediator.userid;
            this.socket.send(JSON.stringify(msgREGISTER));
    };

    this.socket.onerror = SignalingChannel.onError(error);

    // 
    this.socket.onclose = SignalingChannel.onClose();

    // Calls local on message
    this.socket.onmessage = SignalingChannel.onMessage(wsMessage);
};


SignalingChannel.offerMedia = function(offer, calldetails) {
    var msgOFFER = {};
    msgOFFER.msg_type = 'OFFER';
    msgOFFER.data = offer;
    msgOFFER.calldetails = calldetails;
    msgOFFER.userid = this.mediator.userId;
    
    trace("SignalingChannel.offerMedia", "Call Id [" + msgOFFER.calldetails.callid + "] Sending SDP : " + offer.sdp);
    this.socket.send(JSON.stringify(msgOFFER));
};


SignalingChannel.answerMedia = function(answer, calldetails) {
    var msgANSWER = {};
    msgANSWER.msg_type = 'ANSWER';
    msgANSWER.data = answer;
    msgANSWER.calldetails = calldetails;
    msgANSWER.userid = this.mediator.userId;
    
    trace("SignalingChannel.answerMedia", "Sending SDP : " + answer.sdp);
    this.socket.send(JSON.stringify(msgANSWER));
};

SignalingChannel.hangupMedia = function(calldetails) {
     var msgBYE = {};
     msgBYE.msg_type = 'BYE';
     msgBYE.calldetails = calldetails;
     msgBYE.userid = this.mediator.userId;
     
     trace("SignalingChannel.hangupMedia", "Sending BYE");
     this.socket.send(JSON.stringify(msgBYE));
};


SignalingChannel.candidate = function(candidate, calldetails) {
    var msgCANDIDATE = {};
    msgCANDIDATE.msg_type  = 'CANDIDATE';
    msgCANDIDATE.candidate = candidate;
    msgCANDIDATE.calldetails = calldetails;
    msgCANDIDATE.userid = this.mediator.userId;
     
    trace("SignalingChannel.candidate", "Candidate : " + candidate);
    this.socket.send(JSON.stringify(msgCANDIDATE));
};

SignalingChannel.sendMessage = function(msgType, msgData, calldetails) {
    var msg = {};
    msg.msg_type = msgType;
    msg.calldetails = calldetails;
    msg.userid = this.mediator.userId;
    
    if (msgData !== null){
        msg.data = msgData;
        trace("SignalingChannel.sendMessage", "type [" + msgType + "] data\n " + msgData);
    }
    
    this.socket.send(JSON.stringify(msg));
};


SignalingChannel.offerData = function(offer) {
    
};

SignalingChannel.answerData = function(answer) {
    
};

SignalingChannel.hangupData = function() {
    
};


SignalingChannel.close = function() {
    
};


/**
 * SignalingChannel.onMessage
 * 
 * @param {type} wsMessage
 * @returns {undefined}
 */
SignalingChannel.onMessage = function(wsMessage) {
    
      var msg = JSON.parse(wsMessage.data);
      
      trace("SignalingChannel.onMessage"," Received message type [" + msg.msg_type + "]");
      
      switch (msg.msg_type) {

         // Calls mediator callbacks by type
         case "OFFER":
            this.mediator.onOfferMedia(msg.data, msg.calldetails);
            break;

         // To be processed as Client
         case "ANSWER":
            this.mediator.onAnswerMedia(msg.data, msg.calldetails);
            break;

         // To be processed as either Client or Server
         case "BYE":
            this.mediator.onByeMedia(msg.calldetails);
            break;

         // To be processed as either Client or Server
         case "CANDIDATE":
            this.mediator.onCandidateMedia(msg.candidate, msg.calldetails);
            break;

         // Unexpected, but reserved for other message types
         default:
            trace("SignalingChannel.onMessage", "Unexpected message type [" + msg.msg_type + "] was received, dropped");
      }
};


SignalingChannel.onError = function(error) {
    
    // TBD - Local treatment
    
    this.mediator.onSignalingChannelError(error);
};


SignalingChannel.onClose = function() {
    
    // TBD - Local treatment
    
    this.mediator.onSignalingChannelClose();
};




 
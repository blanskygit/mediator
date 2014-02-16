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


SignalingChannel.offerMedia = function(offer) {
    var msgOFFER = {};
    msgOFFER.msg_type = 'OFFER';
    msgOFFER.data = offer;
    trace("SignalingChannel.offerMedia", "Sending SDP : " + offer.sdp);
    this.socket.send(JSON.stringify(msgOFFER));
};


SignalingChannel.answerMedia = function(answer) {
    var msgANSWER = {};
    msgANSWER.msg_type = 'ANSWER';
    msgANSWER.data = answer;
    trace("SignalingChannel.answerMedia", "Sending SDP : " + answer.sdp);
    this.socket.send(JSON.stringify(msgANSWER));
};

SignalingChannel.hangupMedia = function() {
    
};

SignalingChannel.offerData = function(offer) {
    
};

SignalingChannel.answerData = function(answer) {
    
};

SignalingChannel.hangupData = function() {
    
};

SignalingChannel.sendMessage = function(msgType, msgData) {
    var msg = {};
    msg.msg_type = msgType;
    if (msgData !== null){
        msg.data = msgData;
        trace("SignalingChannel.sendMessage", "type [" + msgType + "] data\n " + msgData);
    }
    
    this.socket.send(JSON.stringify(msg));
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
            this.mediator.onOfferMedia(msg.data);
            break;

         // To be processed as Client
         case "ANSWER":
            this.mediator.onAnswerMedia(msg.data);
            break;

         // To be processed as either Client or Server
         case "BYE":
            this.mediator.onByeMedia();
            break;

         // To be processed as either Client or Server
         case "CANDIDATE":
            this.mediator.onCandidateMedia(msg.candidate);
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
/**
 * 
 * @param {type} targetHost
 * @param {type} targetPort
 * @param {type} mediator
 * @returns {SignalingChannel}
 */
function SignalingChannel() {
    this.mediator;
    this.socket;
    this.isopen = false;
};


/**
 * 
 * @param {type} mediator
 * @param {type} appcontext
 * @returns {undefined}
 */
SignalingChannel.prototype.open = function(mediator, appcontext) {
    
    if (!this.isopen) {

        trace("SignalingChannel.prototype.open", "Opening channel");

        this.mediator = mediator;

        // Construction of the websocket together with the application

        var targetURL = 'ws://' + mediator.sigserveraddr;

        trace("SignalingChannel.prototype.open", 'Channel URL: ' + targetURL);

        this.socket = new WebSocket(targetURL, appcontext);

        this.socket.onopen = function() {

            trace("SignalingChannel.prototype.open.socket.onopen", "Signaling Channel open, sends REGISTER for user id [" + mediator.userid + "]");

            this.isopen = true;

            var msgREGISTER = {};
            msgREGISTER.msg_type = "REGISTER";
            msgREGISTER.userid = mediator.userid;
            sigchannel.socket.send(JSON.stringify(msgREGISTER));
        };

        this.socket.onerror = SignalingChannel.prototype.onError;

        // 
        this.socket.onclose = SignalingChannel.prototype.onClose;

        // Calls local on message
        //this.socket.onmessage = SignalingChannel.prototype.onMessage;
        this.socket.onmessage = function(wsMessage) {

            var msg = JSON.parse(wsMessage.data);

            trace("SignalingChannel.prototype.onMessage", " Received message type [" + msg.msg_type + "], callid [" + msg.callid + "]");

            var calldetails = getCallDetails(msg);

            switch (msg.msg_type) {

                // Calls mediator callbacks by type
                case "OFFER":
                    mediator.onOfferMedia(msg.data, getCallDetails(msg, calldetails));
                    break;

                    // To be processed as Client
                case "ANSWER":
                    mediator.onAnswerMedia(msg.data, calldetails);
                    break;

                    // To be processed as either Client or Server
                case "BYE":
                    mediator.onByeMedia(getCallDetails(msg, calldetails));
                    break;

                    // To be processed as either Client or Server
                case "CANDIDATE":
                    mediator.onCandidateMedia(msg.candidate, getCallDetails(msg, calldetails));
                    break;

                    // Unexpected, but reserved for other message types
                default:
                    trace("SignalingChannel.prototype.onMessage", "Unexpected message type [" + msg.msg_type + "] was received, dropped");
            }
        };

    }
    else {
        trace("SignalingChannel.prototype.open", "Signaling Channel already open");
    }
};


SignalingChannel.prototype.offerMedia = function(offer, calldetails) {
    var msgOFFER = {};
    msgOFFER.msg_type = 'OFFER';
    msgOFFER.data = offer;
    setCallDetails(msgOFFER, calldetails);
    msgOFFER.userid = mediator.userid;

    trace("SignalingChannel.prototype.offerMedia", "Call ID [" + calldetails.callid + "], Caller [" + calldetails.callerid + "], Callee [" + calldetails.calleeid + "], Sending SDP : " + offer.sdp);
    this.socket.send(JSON.stringify(msgOFFER));
};


SignalingChannel.prototype.answerMedia = function(answer, calldetails) {
    var msgANSWER = {};
    msgANSWER.msg_type = 'ANSWER';
    msgANSWER.data = answer;
    setCallDetails(msgANSWER, calldetails);
    msgANSWER.userid = mediator.userid;
    
    trace("SignalingChannel.prototype.answerMedia", "Sending SDP : " + answer.sdp);
    this.socket.send(JSON.stringify(msgANSWER));
};

SignalingChannel.prototype.hangupMedia = function(calldetails) {
     var msgBYE = {};
     msgBYE.msg_type = 'BYE';
     setCallDetails(msgBYE, calldetails);
     msgBYE.userid = mediator.userid;
     
     trace("SignalingChannel.prototype.hangupMedia", "Sending BYE");
     this.socket.send(JSON.stringify(msgBYE));
};


SignalingChannel.prototype.candidate = function(candidate, calldetails) {
    var msgCANDIDATE = {};
    msgCANDIDATE.msg_type  = 'CANDIDATE';
    msgCANDIDATE.candidate = candidate;
    setCallDetails(msgCANDIDATE, calldetails);
    msgCANDIDATE.userid = mediator.userid;
     
    trace("SignalingChannel.prototype.candidate", "Candidate : " + candidate);
    this.socket.send(JSON.stringify(msgCANDIDATE));
};

SignalingChannel.prototype.sendMessage = function(msgType, msgData, calldetails) {
    var msg = {};
    msg.msg_type = msgType;
    setCallDetails(msg, calldetails);
    msg.userid = mediator.userid;
    
    if (msgData !== null){
        msg.data = msgData;
        trace("SignalingChannel.prototype.sendMessage", "type [" + msgType + "] data\n " + msgData);
    }
    
    this.socket.send(JSON.stringify(msg));
};


SignalingChannel.prototype.offerData = function(offer) {
    
};

SignalingChannel.prototype.answerData = function(answer) {
    
};

SignalingChannel.prototype.hangupData = function() {
    
};


SignalingChannel.prototype.close = function() {
    this.socket.close();
};


/**
 * SignalingChannel.prototype.onMessage
 * 
 * @param {type} wsMessage
 * @returns {undefined}
 */
SignalingChannel.prototype.onMessage = function(wsMessage) {
    
      var msg = JSON.parse(wsMessage.data);
      
      trace("SignalingChannel.prototype.onMessage"," Received message type [" + msg.msg_type + "]");
      
      var calldetails;
      
      switch (msg.msg_type) {

         // Calls mediator callbacks by type
         case "OFFER":
            mediator.onOfferMedia(msg.data, getCallDetails(msg, calldetails));
            break;

         // To be processed as Client
         case "ANSWER":
            mediator.onAnswerMedia(msg.data, getCallDetails(msg, calldetails));
            break;

         // To be processed as either Client or Server
         case "BYE":
            mediator.onByeMedia(getCallDetails(msg, calldetails));
            break;

         // To be processed as either Client or Server
         case "CANDIDATE":
            mediator.onCandidateMedia(msg.candidate, getCallDetails(msg, calldetails));
            break;

         // Unexpected, but reserved for other message types
         default:
            trace("SignalingChannel.prototype.onMessage", "Unexpected message type [" + msg.msg_type + "] was received, dropped");
      }
};


SignalingChannel.prototype.onError = function(error) {
    
    // TBD - Local treatment
    
    mediator.onSignalingChannelError(error);
};


SignalingChannel.prototype.onClose = function() {
    
    this.isopen = false;
    
    mediator.onSignalingChannelClose();
};


function setCallDetails(msg, calldetails){
    msg.callid = calldetails.callid;
    msg.callerid = calldetails.callerid;
    msg.calleeid = calldetails.calleeid;
}

function getCallDetails(msg){
    var calldetails = new CallDetails(null,null);
    calldetails.callid = msg.callid;
    calldetails.callerid = msg.callerid;
    calldetails.calleeid = msg.calleeid;
    return calldetails;
}

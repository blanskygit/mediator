/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function SignalingChannel(targetHost, targetPort, mediator) {
  this.targetHost = targetHost;
  this.targetPort = targetPort;
  this.tracer = new Tracer("SignalingChannel");
  this.mediator = mediator;
  this.socket;
}

// Open a channel towards the Node server
SignalingChannel.open = function(onsigchannelmsg, onsigchannelclose, onsigchannelerror) {

    this.tracer.trace("open", "Opening channel");

    // Construction of the websocket together with the application

    var targetURL = 'ws://' + this.targetHost + ':' + this.targetPort;

    this.tracer.trace("open", 'Channel URL: ' + targetURL);

    this.socket = new WebSocket(targetURL, 'appstract');

    this.socket.onopen = function() {
        
        trace("open", 'Channel opened.');
        
         var msgREGISTER = {};
            msgREGISTER.msg_type = "REGISTER";
            msgREGISTER.userid = this.userid;
            socket.send(JSON.stringify(msgREGISTER));

    };

    this.socket.onerror = onsigchannelerror(error);

    this.socket.onclose = onsigchannelclose;

    // Log messages from the server
    this.socket.onmessage = function(e) {
        var msg = JSON.parse(e.data);
        onsigchannelmsg(msg);
    };
};


SignalingChannel.offerMedia = function(offer) {
    
};


SignalingChannel.answerMedia = function(answer) {
    
};

SignalingChannel.hangupMedia = function() {
    
};

SignalingChannel.offerData = function(offer) {
    
};

SignalingChannel.answerData = function(answer) {
    
};

SignalingChannel.hangupData = function() {
    
};

SignalingChannel.close = function() {
    
};



SignalingChannel.on
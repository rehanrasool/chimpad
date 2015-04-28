$(function(){

  var socket = io();
	// getting the id of the room from the url
	var chimpad_pad_id = Number(window.location.pathname.match(/\/pad\/(\d+)$/)[1]);
  var messages=[];
	$.ajax
  	({
      type: "POST",
      //the url where you want to sent the userName and password to
      url: "/get_pad",
      //json object to sent to the authentication url
      data : {
      pad_id : chimpad_pad_id
    } }).done(function(raw_data) {
      
      	var data = raw_data[0];
        $('#pad_title').html(data['title']);
        $('#pad_content').val(data['content']);
        $('#pad_content_last_modified_timestamp').html('last modified: ' + moment(new Date(data['last_modified_timestamp'])).fromNow());
        $('#pad_content_last_modified_user').html('last modified by : <a href="">' + data['last_modified_user'] + '</a>');

  	});

    $.ajax
    ({
      type: "POST",
      //the url where you want to sent the userName and password to
      url: "/get_messages",
      //json object to sent to the authentication url
      data : {
      pad_id : chimpad_pad_id
    } }).done(function(raw_data) {
      
        var data = raw_data;

        var messenger= $('#pad_messages');
        for(var i=0;i<data.length;i++) {
          html+=data[i].user_name+": "+data[i].message_text+"\n";
        }
        messenger.val(html);
        //location.reload();
    });

  socket.on('connect', function(){
    socket.emit('load', chimpad_pad_id);
  });

    socket.on('pad_content_sent', function (data) {
      console.log(data);
        //var messages = [];
        if(data.message) {
            $('#pad_content').val(data.message);

        } else {
            console.log("There is a problem:", data);
        }
    });
 
    $("#pad_content").bind('keyup', function(){
       var text = $('#pad_content').val();
        socket.emit('pad_content_send', { message: text });
    }); 
     //Added functions
    socket.on('messenger_sent',function (data){
      var messenger= $('#pad_messages');
      if(data.message)
      {
      messages.push({message:data.message, user:data.user_id, username:data.user_name});
      var html='';
      for(var i=0;i<messages.length;i++)
      {
        html+=messages[i].username+": "+messages[i].message+"\n";
      }
      messenger.val(html);
      }
      else
      {
        console.log(data);
      }
    });

    //Adding send message functionality to it 
    $('#send_message_button').click(function(){
      var message_text=$('#pad_input_message').val();
      $('#pad_input_message').val('');
      socket.emit('messenger_send',{message:message_text});

      $.ajax
        ({
          type: "POST",
          //the url where you want to sent the userName and password to
          url: "/send_message",
          //json object to sent to the authentication url
          data : {
          pad_id : chimpad_pad_id,
          message_content : message_text
        } }).done(function(raw_data) {
          
            var data = raw_data[0];
            //location.reload();
        });

    });

    $("#save_content_button").click(function(){
       var chimpad_pad_content = $('#pad_content').val();
        $.ajax
          ({
            type: "POST",
            //the url where you want to sent the userName and password to
            url: "/save_pad",
            //json object to sent to the authentication url
            data : {
            pad_id : chimpad_pad_id,
            pad_content : chimpad_pad_content
          } }).done(function(raw_data) {
            
              var data = raw_data[0];
              //location.reload();
          });

    }); 

});

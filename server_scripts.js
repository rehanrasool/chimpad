var pg = require('pg');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')();
var session = require('cookie-session')({secret: 'ssshhhhh'});


module.exports = function(app, io) {

  app.use(cookieParser);
  app.use(session);

  io.use(function(socket, next) {
    var req = socket.handshake;
    var res = {};
    cookieParser(req, res, function(err) {
        if (err) return next(err);
        session(req, res, next);
    });
  });

  app.use(express.static(__dirname + '/public'));
  
    // parse application/json
  app.use(bodyParser.json());                        
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/', function(req, res){

    // Render views/index.html
    res.render('index');
  });

  app.get('/db', function (request, response) {
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      client.query('SELECT * FROM user_table', function(err, result) {
        done();
        if (err)
         { console.error(err); response.send("Error " + err); }
        else
         { response.send(result.rows); }
      });
    });
  })

  app.post('/login', function(request, response) {
      var username = request.body.inputUsername;
      var password = request.body.inputPassword;
      console.log("post received: %s %s", username, password);

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {

        client.query('SELECT id FROM user_table WHERE username = $1 AND password = $2;' , [username, password], function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            var id = result.rows[0]["id"];

            sess=request.session;
            sess.user_id=id;
            sess.user_name=username;

            response.redirect('/home/'+id);
           }
        });
      });
  });

  app.post('/signup', function(request, response) {
      var username = request.body.inputUsername;
      var password = request.body.inputPassword;
      var email = request.body.inputEmail;
      console.log("post received: %s %s", username, password, email);

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {

        signup_query = 'INSERT INTO user_table (username,password,email) VALUES ( \'' + username + '\',\'' + password + '\',\'' + email + '\') RETURNING id;';
        console.log(signup_query);
        client.query('INSERT INTO user_table (username,password,email) VALUES ( $1,$2,$3) RETURNING id;',[username, password, email] , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            var id = result.rows[0]["id"];

            sess=request.session;
            sess.user_id=id;
            sess.user_name=username;

            response.redirect('/home/'+id);
           }
        });
      });
  });

  app.post('/get_user_pads', function(request, response) {
      var chimpad_user_id = request.body.user_id;

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        get_user_pads_id_list = 'SELECT pad_id FROM user_pad WHERE user_id = \'' + chimpad_user_id + '\';';

        client.query(get_user_pads_id_list , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            var user_pad_ids = "0";
            for (row in result.rows) {
              user_pad_ids = user_pad_ids + "," + result.rows[row]['pad_id'];
            }

            get_user_pads_data = 'SELECT  p.id , p.title , p.content , date_part(\'epoch\' , p.last_modified_timestamp)*1000 as last_modified_timestamp , p.last_modified_user, u.username FROM pad p INNER JOIN user_table u ON (u.id = p.last_modified_user) Where p.id IN ('+ user_pad_ids +') ORDER BY p.last_modified_timestamp DESC;';

              client.query(get_user_pads_data , function(err, result) {
                done();
                if (err)
                 { console.error(err); response.send("Error " + err); }
                else
                 { 
                    response.send(result.rows); 
                 }
              });
           }
        });
      });
  });

  app.post('/get_all_pads', function(request, response) {

    var sess = request.session;
    var chimpad_pad_user = sess.user_id;
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {

        client.query('SELECT p.id , p.title , p.content , date_part(\'epoch\' , p.last_modified_timestamp)*1000 as last_modified_timestamp , p.last_modified_user, u.username FROM pad p INNER JOIN user_table u ON (u.id = p.last_modified_user) WHERE type = \'public\' AND p.id NOT IN ( SELECT pad_id from user_pad WHERE user_id = $1) ORDER BY p.last_modified_timestamp DESC;' , [chimpad_pad_user], function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });



  app.post('/get_stats', function(request, response) {
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        get_stats_query = 'SELECT (SELECT COUNT(id) FROM user_table) AS users_count,(SELECT COUNT(id) FROM pad WHERE type=\'public\') AS public_pads_count,(SELECT COUNT(id) FROM pad WHERE type=\'private\') AS private_pads_count';

        client.query(get_stats_query , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });

  //adding function to get data from user table 
  app.post('/get_user_profile',function(request,response){
    pg.connect(process.env.DATABASE_URL,function(err,client,done){
      var id=request.body.user_id;

      client.query("SELECT id,username,email FROM user_table WHERE id = $1 ;",[id],function(err,result){
        done();
        if(err)
        {
          console.error(err);
          response.send("Error "+err);
        }
        else
        {
          response.send(result.rows);
        }
      });
    });
  });
  app.post('/get_user_contributions',function(request,response){
    pg.connect(process.env.DATABASE_URL,function(err,client,done){
      var id=request.body.user_id;

      client.query("SELECT COUNT(pad_id) as number FROM user_pad WHERE user_id= $1 ;",[id],function(err,result){
        done();
        if(err)
        {
          console.error(err);
          response.send("Error "+err);
        }
        else
        {
          response.send(result.rows);
        }
      });
    });
  });
    app.post('/get_user_pad_ownerships',function(request,response){
    pg.connect(process.env.DATABASE_URL,function(err,client,done){
      var id=request.body.user_id;

      client.query("SELECT COUNT(pad_id) as number FROM user_pad WHERE user_id= $1 AND admin=1;",[id],function(err,result){
        done();
        if(err)
        {
          console.error(err);
          response.send("Error "+err);
        }
        else
        {
          response.send(result.rows);
        }
      });
    });
  });
    app.post('/get_user_skills',function(request,response){
    pg.connect(process.env.DATABASE_URL,function(err,client,done){
      var id=request.body.user_id;

      client.query("SELECT DISTINCT lang FROM pad WHERE id IN (SELECT pad_id FROM user_pad WHERE user_id= $1) ;",[id],function(err,result){
        done();
        if(err)
        {
          console.error(err);
          response.send("Error "+err);
        }
        else
        {
          response.send(result.rows);
        }
      });
    });
  });
    app.post('/get_user_public_pads',function(request,response){
    pg.connect(process.env.DATABASE_URL,function(err,client,done){
      var chimpad_user_id=request.body.user_id;

        client.query('SELECT pad_id FROM user_pad WHERE user_id = $1;' ,[chimpad_user_id], function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            var user_pad_ids = "0";
            for (row in result.rows) {
              user_pad_ids = user_pad_ids + "," + result.rows[row]['pad_id'];
            }

            get_user_pads_data = 'SELECT  p.id , p.title , p.content , date_part(\'epoch\' , p.last_modified_timestamp)*1000 as last_modified_timestamp , p.last_modified_user, u.username FROM pad p INNER JOIN user_table u ON (u.id = p.last_modified_user) Where p.id IN ('+ user_pad_ids +') ORDER BY p.last_modified_timestamp DESC;';

              client.query(get_user_pads_data , function(err, result) {
                done();
                if (err)
                 { console.error(err); response.send("Error " + err); }
                else
                 { 
                    response.send(result.rows); 
                 }
              });

            //response.send();
           }
        });
      });
  });

  app.post('/search_collaborator', function(request, response) {
    var potential_name = request.body.chimpad_list_text;
    potential_name = potential_name + '%';
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
       
        client.query('SELECT username FROM user_table WHERE username like $1', [potential_name] , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           {
            response.send(result.rows);
           }
        });
      });
  });

  app.post('/create_pad', function(request, response) {
    sess=request.session;
    var chimpad_pad_type = request.body.pad_type;
    var chimpad_pad_title = request.body.pad_title;
    var chimpad_pad_user = sess.user_id;
    var collaborators_array = request.body.pad_collaborators;

    var chimpad_pad_id = 1;

    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      
      client.query('INSERT INTO pad (title,last_modified_timestamp,last_modified_user,type) VALUES ($1,NOW(),$2,$3) RETURNING id;',[chimpad_pad_title,chimpad_pad_user,chimpad_pad_type] , function(err, result) {
        done();
        if (err)
         { console.error(err); response.send("Error " + err); }
        else
         { 
            chimpad_pad_id = result.rows[0]['id'];


            update_admin_pads_query = 'INSERT INTO user_pad(user_id,pad_id,admin) VALUES (' + chimpad_pad_user + ',' + chimpad_pad_id + ',1);'; // not an admin


            client.query(update_admin_pads_query , function(err, result) {
                  done();
                  if (err)
                  { console.error(err); response.send("Error " + err); }
                  else
                  { // dummy message
                    for(collaborator in collaborators_array){
                      var collaborator_id = collaborators_array[collaborator];
                      //add_user_pads(collaborator_id,chimpad_pad_id);

                      var get_username_from_id_query = 'SELECT id from user_table WHERE username = \'' + collaborator_id + '\'' + ';';

                      client.query(get_username_from_id_query, function(err,result){
                        done();
                        if (err){
                          console.error(err);
                          response.send("Error " + err);
                        }else{
                          pad_user_id = result.rows[0]['id'];

                          update_user_pads_query = 'INSERT INTO user_pad(user_id,pad_id,admin) VALUES (' + pad_user_id + ',' + chimpad_pad_id + ',0);'; // not an admin


                          client.query(update_user_pads_query , function(err, result) {
                                done();
                                if (err)
                                { console.error(err); response.send("Error " + err); }
                                else
                                { // dummy message

                                }
                          });

                        }
                      });



                    }

                  }
            });
            response.send([{"id": chimpad_pad_id}]);
          }
          
      });
    });
            
  });

  //save content on pressing the save button
  app.post('/save_pad', function(request, response) {
    sess=request.session;
    var chimpad_pad_id = request.body.pad_id;
    var chimpad_pad_content = request.body.pad_content;
    var chimpad_pad_language = request.body.pad_language;
    var chimpad_pad_user = sess.user_id;

    pg.connect(process.env.DATABASE_URL, function(err, client, done) {

      client.query('UPDATE pad SET last_modified_timestamp = NOW() ,content = $1 ,last_modified_user = $2, lang = $3 WHERE id = $4;', [chimpad_pad_content, chimpad_pad_user, chimpad_pad_language, chimpad_pad_id ], function(err, result) {
        done();
        if (err)
         { console.error(err); response.send("Error " + err); }
        else
         { 
          response.send(result.rows);
         }
      });
    });
  });

  app.post('/get_messages', function(request, response) {
      var chimpad_pad_id = request.body.pad_id;

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        get_messages_query = 'SELECT pad_id,user_id,user_name,content as message_text,date_part(\'epoch\',time_stamp)*1000 as time_stamp FROM messages WHERE pad_id = ' + chimpad_pad_id + ' ORDER BY time_stamp;';

        client.query(get_messages_query , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });

  app.post('/get_languages', function(request, response) {

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        get_languages_query = 'SELECT * FROM langs ORDER BY name;';

        client.query(get_languages_query , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });

  //save content on pressing the save button
  app.post('/send_message', function(request, response) {
    sess=request.session;
    var chimpad_pad_id = request.body.pad_id;
    var chimpad_message_content = request.body.message_content;
    var chimpad_pad_user = sess.user_id;
    var chimpad_pad_username = sess.user_name;

    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      insert_message_query = 'INSERT INTO messages(pad_id,user_id,user_name,content,time_stamp) VALUES (' + chimpad_pad_id + ',' + chimpad_pad_user + ',\'' + chimpad_pad_username + '\',\'' + chimpad_message_content + '\', NOW() );';

      client.query(insert_message_query , function(err, result) {
        done();
        if (err)
         { console.error(err); response.send("Error " + err); }
        else
         { 
          response.send(result.rows);
         }
      });
    });
  });

  app.post('/get_pad', function(request, response) {
      var chimpad_pad_id = request.body.pad_id;

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {

        get_pad_query = 'SELECT p.id , p.title , p.content , date_part(\'epoch\' , p.last_modified_timestamp)*1000 as last_modified_timestamp , p.last_modified_user, p.lang, u.username FROM pad p INNER JOIN user_table u ON (u.id = p.last_modified_user) WHERE p.id = ' + chimpad_pad_id + ';';

        client.query(get_pad_query , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });

/**
  If user is admin then all the people from the pad are deleted along with him.
  If user is not an admin then only he is removed from the pad.
**/
  app.post('/leave_pad', function(request, response) {
      sess=request.session;
      var chimpad_user_id = sess.user_id; // user's id
      var chimpad_pad_id = request.body.pad_id;

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {

        check_if_user_admin_query = 'SELECT admin FROM user_pad WHERE user_id = ' + chimpad_user_id + ' AND pad_id =' + chimpad_pad_id + ';';

        client.query(check_if_user_admin_query , function(err, result) {
          done();
          if (err){ 
            console.error(err); response.send("Error " + err); 
          }else{ 
            
            if(result.row[0].admin == 1){//user is admin, so remove all the users from this pad and delete pad
               remove_users_from_this_pad = 'DELETE FROM user_pad WHERE pad_id = '+ chimpad_pad_id + ';'; // delete all user's pad with this id
               client.query(check_if_user_admin_query , function(err, result) {
                 done();
                 if (err)
                   { console.error(err); response.send("Error " + err); }
                  else
                  {// all pads from user's now deleted, now delete the pad itself
                    //delete_pad(chimpad_pad_id);              
                  }
                });
            }else{// user not admin, so just remove him from the pad
               remove_users_from_this_pad = 'DELETE FROM user_pad WHERE pad_id = '+ chimpad_pad_id + ' AND user_id ='+ chimpad_user_id +';'; // delete all user's pad with this id
               
               client.query(check_if_user_admin_query , function(err, result) {
                done();
                 if (err)
                   { console.error(err); response.send("Error " + err); }
                  else
                  {// all pads from user's now deleted, now delete the pad itself
                    response.send("Success");
                  }
                });
       
            }
          }
        });

      });
  });

//gets all users
  app.post('/get_all_users', function(request, response) {
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        get_all_users_data = 'SELECT * FROM user;';

        client.query(get_all_users_data , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });

   //gets a specific user with the provided id in the post request 
  app.post('/get_user', function(request, response) {
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {

        var user_id = request.body.user_id;// user id in the header

        get_user_data = 'SELECT * FROM user WHERE id =' + user_id + ';';

        client.query(get_user_data , function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { 
            response.send(result.rows);
           }
        });
      });
  });

  app.get('/create', function(request, response) {
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.render('create');
  });

  app.get('/find', function(request, response) {
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.render('find');
  });

  app.get('/about', function(request, response) {
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.render('about');
  });

  app.get('/index', function(request, response) {
    sess=request.session;
    sess.user_id = null;
    response.render('index');
  });

  app.get('/home/:id', function(request,response){
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.render('home');
  });

  app.get('/home', function(request,response){
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.redirect('/home/'+sess.user_id);
  });

  app.get('/pad/:id', function(request,response){
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.render('pad');
  });

  app.get('/user/:id', function(request,response){
    sess=request.session;
    if (isNaN(sess.user_id)){
      response.redirect('index');
    }
    response.render('user');
  });

  io.on('connection', function (socket) {
      console.log("Session: ", socket.handshake.session);
      
      socket.on('load',function(data){ 
        socket.room = data;
        socket.join(data);
      });
      
      socket.on('pad_content_send', function (data) {
          socket.broadcast.to(socket.room).emit('pad_content_sent', data);
      });

      socket.on('change_mode', function (data) {
          socket.broadcast.to(socket.room).emit('mode_changed', data);
      });
      
      socket.on('messenger_send',function (data){
        data.user_id = socket.handshake.session.user_id;
        data.user_name = socket.handshake.session.user_name;
        io.sockets.in(socket.room).emit('messenger_sent',data);

      });
  });


};
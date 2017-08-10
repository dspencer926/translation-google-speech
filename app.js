const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
const ss = require('socket.io-stream');
const fs = require('fs');
const request = require('request');
const translate = require('@google-cloud/translate');
const projectId = 'translation-app-168502';
const speechKey = 'AIzaSyAZuY1GFWzD36xL_4pkWBDmCCPWhv5S348';
const translateClient = translate({
  projectId: projectId
});
var speech = require('@google-cloud/speech')({
  projectId: projectId,
  keyFilename: './Translation App-d08cdf654c59.json'
});

require('dotenv').config()

const PORT = process.env.PORT || 3001;
server.listen(PORT, function() {
  console.log(`listening on port ${PORT}`);
});

app.use(express.static(path.join(__dirname, 'client/build')));
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


let socketIds = [];
let usernamesOnline = []

function translation(data) {
  
}

// connect socket
io.on('connection', (socket) => { 
  socketIds.push(socket.id);
  console.log(`${socket.id} has connected`);
  socket.emit('myID', socket.id);

  // socket disconnect
  socket.on('disconnect', () => {
    if (socket.nickname !== undefined) {
      usernamesOnline.splice( usernamesOnline.indexOf(socket), 1 );
      console.log(usernamesOnline.length);
    }
    console.log(`${socket.id} has disconnected`);
    socketIds = socketIds.filter((val) => {
      return (val !== socket.id)
    })
  })

  socket.on('disconnectFrom', (user) => {
    console.log(`disconnecting from ${user}`)
    socket.broadcast.to(user.socketID).emit('disconnectChat');
  })

  socket.on('signOff', (user) => {
    console.log(user);
    usernamesOnline = usernamesOnline.filter((val) => {
      return val.username !== user.username;
    })
    console.log(usernamesOnline);
    socket.emit('signedOff');
  })

  socket.on('userList', () => {
    console.log(usernamesOnline);
    socket.emit('userListResponse', usernamesOnline);
  });

  //username submission
  socket.on('username', (username) => {
    if (usernamesOnline.filter((val) => {
      return val.username === username
    }).length === 0){
    socket.nickname = username;
    usernamesOnline.push({username: username, socketID: socket.id});
    console.log(usernamesOnline.length);
    console.log(socket.id + ': ' + socket.nickname);
    socket.emit('usernameReceived');
    } else {
      socket.emit('usernameTaken');
    }
  })

  socket.on('userConnect', (user)=> {
      socket.broadcast.to(user.socketID).emit('chatRequest', {username: socket.nickname, socketID: socket.id});
    });

  socket.on('accept', (user, user2) => {
    console.log('accept function');
    socket.broadcast.to(user.socketID).emit('accepted', user2);
  })

  socket.on('reject', (user) => {
    console.log('reject function');
    socket.broadcast.to(user.socketID).emit('rejected');
  })

  //stream received for speech recognition
  ss(socket).on('stream', function(stream, data) {
    console.log('streamed');

const speechReq = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 44100,
    languageCode: data.langFrom,
  },
  interimResults: false // If you want interim results, set this to true
};

// Create a recognize stream
const recognizeStream = speech.streamingRecognize(speechReq)
  .on('error', console.error)
  .on('data', (results) => {
    text = results.results[0].alternatives[0].transcript;
    console.log(`recognized: ${text}`);
    let options = {
      from: data.langFrom,
      to: data.langTo,
    }
    translateClient.translate(text, options)
    .then((results) => {
      translation = results[0];
      console.log(`translated: ${translation}`);
      options = {
        from: options.to,
        to: options.from,
      }})
      .catch((err) => {
      console.error('ERROR:', err);
    })
    .then(() => {translateClient.translate(translation, options)
      .then((results) => {
        let stsTranslation = results[0];
        console.log(`translated2: ${stsTranslation}`);
        console.log('translation', translation)
        console.log('sts translation', stsTranslation);
        socket.emit('sts', {
            translation: translation, 
            stsTranslation: stsTranslation,
            source: options.from, 
            target: options.to})
      })
    })

    
    // socket.emit('recognized', data.results[0].alternatives[0].transcript)
    // data.results[0].alternatives.forEach((val)=>{
    //   console.log(val.transcript)
    // })
  })
      // process.stdout.write(
      //   (data.results[0] && data.results[0].alternatives[0])
      //     ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
      //     : `\n\nReached transcription time limit, press Ctrl+C\n`));

stream.pipe(recognizeStream);
  })

  //translation with socket? 
  socket.on('translate again', (data) => {
    console.log('translate testing');
    console.log(data);
    let text = data.message;
    let options = {
      from: data.from,
      to: data.to,
    }
    translateClient.translate(text, options)
    .then((results) => {
      translation = results[0];
      console.log(`translated: ${translation}`);
      options = {
        from: options.to,
        to: options.from,
      }})
      .catch((err) => {
      console.error('ERROR:', err);
    })
    .then(() => {translateClient.translate(translation, options)
      .then((results) => {
        let stsTranslation = results[0];
        console.log(`translated2: ${stsTranslation}`);
        console.log('translation', translation)
        console.log('sts translation', stsTranslation);
        socket.emit('sts', {
            translation: translation, 
            stsTranslation: stsTranslation,
            source: options.from, 
            target: options.to})
      })
    })
  });

  //send translated message to other user
  socket.on('send', (data) => {
    let userID = data.user.socketID;
    console.log('should send to: ', userID, 'message: ', data.message);
    socket.broadcast.to(userID).emit('translatedResponse', data.message);
  });


  socket.on('received', (user) => {
    console.log('in receive function, should send to: ', user);
    socket.broadcast.to(user.socketID).emit('received');
  })
})

// const translationRoute = require('./routes/translationRoute');
// app.use('/translation', translationRoute);

app.get('/*', function (req, res) {
   res.sendFile(path.join(__dirname, 'client/build/index.html'));
 });

/* handling 404 */
app.get('*', function(req, res) {
  res.status(404).send({message: 'Oops! Not found.'});
});
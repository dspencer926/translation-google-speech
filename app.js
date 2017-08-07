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

// connect socket
io.on('connection', (socket) => { 
  socketIds.push(socket.id);
  console.log(`${socket.id} has connected`);

  // socket disconnect
  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected`);
    socketIds = socketIds.filter((val) => {
      return (val !== socket.id)
    })
  })

  //stream received for speech recognition
  ss(socket).on('stream', function(stream, langFrom, langTo) {
    console.log('streamed');

const speechReq = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 44100,
    languageCode: langFrom,
  },
  interimResults: false // If you want interim results, set this to true
};

// Create a recognize stream
const recognizeStream = speech.streamingRecognize(speechReq)
  .on('error', console.error)
  .on('data', (data) => {
    let text = data.results[0].alternatives[0].transcript;
    console.log(`recognized: ${text}`);
    let options = {
      from: langFrom,
      to: langTo,
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
  socket.on('translate', (data) => {
    console.log('translate testing');
    console.log(data);
    let text = data.message;
    let options = {
      from: 'en',
      to: data.to,
    }
    translateClient.translate(text, options)
    .then((results) => {
      translation = results[0];
      console.log(translation);
      options = {
        from: options.to,
        to: options.from,
      }})
      .catch((err) => {
      console.error('ERROR:', err);
    })
  })

  //send translated message to other user
  socket.on('send', (message) => {
    let testSocket = socketIds.filter((val) => {
    return (val !== socket.id)
  })
    console.log(testSocket);
    console.log('testing, should send to: ', testSocket[0], 'message: ', message);
    socket.broadcast.to(testSocket[0]).emit('translatedResponse', message);
  });
  socket.on('received', () => {
    socket.broadcast.emit('received');
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
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
const sox = require('sox-stream');
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

let appId = 'NMDPTRIAL_dspencer926_gmail_com20170528030155';
  let appKey = '8491cf9930c4e9470946769de7d0d55551e262248a00b4ba09e6597051bf62d550326f80f658c8009e3e9d850e72db5f543d84df3d3899471ef2b76fb11a4402';

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
  ss(socket).on('stream', function(stream, langFrom) {
    console.log('streamed');

const speechReq = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 44100,
    languageCode: 'en'
  },
  interimResults: false // If you want interim results, set this to true
};

// Create a recognize stream
const recognizeStream = speech.streamingRecognize(speechReq)
  .on('error', console.error)
  .on('data', (data) => {
    io.emit('translated', data.results[0].alternatives[0].transcript)
    data.results[0].alternatives.forEach((val)=>{
      console.log(val.transcript)
    })
  })
      // process.stdout.write(
      //   (data.results[0] && data.results[0].alternatives[0])
      //     ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
      //     : `\n\nReached transcription time limit, press Ctrl+C\n`));

stream.pipe(recognizeStream);


// using SoX _______________________________________________________________________________________
    // stream.pipe(sox({
    //   output: {
    //       bits: 16,
    //       rate: 16000,
    //       channels: 1,
    //       type: 'wav'
    //   }
    // })).pipe(request.post({
    //   'url'     : `https://dictation.nuancemobility.net/NMDPAsrCmdServlet/dictation?appId=${appId}&appKey=${appKey}`,   //add multi-language input functionality
    //   'headers' : {
    //     'Transfer-Encoding': 'chunked',
    //     'Content-Type': 'audio/x-wav;codec=pcm;bit=16;rate=16000',
    //     'Accept': 'text/plain',
    //     'Accept-Language': langFrom,
    //   }
    // }, (err, res, body) => {
    //   console.log(body);
    //   socket.emit('recognized', body);
    // }))
//_________________________________________________________________________________________________________

  })

  //translation with socket? 
  socket.on('translate', (data) => {
    // console.log('translate testing');
    // console.log(data);
    // let text = data.message;
    // let options = {
    //   from: 'en',
    //   to: data.to,
    // }
    // translateClient.translate(text, options)
    // .then((results) => {
    //   translation = results[0];
    //   console.log(translation);
    //   options = {
    //     from: options.to,
    //     to: options.from,
    //   }})
    //   .catch((err) => {
    //   console.error('ERROR:', err);
    // })
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
   res.sendFile(path.join(__dirname, 'index.html'));
 });

/* handling 404 */
app.get('*', function(req, res) {
  res.status(404).send({message: 'Oops! Not found.'});
});
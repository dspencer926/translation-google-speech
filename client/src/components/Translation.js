import React, { Component } from 'react';
import responsiveVoice from '../responsiveVoice.js';
const io = require('socket.io-client')('/');
const ss = require('socket.io-stream');
const MSR = require('msr');

class Translation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      langFrom: 'eng_USA',                                          //  source language code (from drop-down)
      langTo: 'es',                                                 //  target language code (from drop-down)
      speakLang: '',                                                //  language-code for TTS to speak
      audioClip: null,                                              //  TTS audio clip 
      inputText: '',                                                //  input text to be translated
      recogResult: '',                                              //  result of speech recog
      stsTranslation: '',                                           //  STS translation
      translatedResponse: '',                                       //  response from other user    
      result: '',                                                   //  translated text in target language
      isRecording: false,                                           //  true/false is currently recording voice
      rdyToRecord: true,                                            //  true/false is ready to record
      recClass: 'off',                                              //  class for record button animation
      convoMode: false,                                             //  conversation mode on/off
      convoStyle: {backgroundColor: '#FFFFEA', color: 'black'},     //  conversation mode button style
      textStyle: null,                                              //  for animation of text
      resultStyle: null,                                            //  ''
      status: null,                                                 //  status of app overall for user to view
      canSend: false,                                               //  should send btn display
      sendStyle: {backgroundColor: '#FF5E5B'},                      //  bkgrnd color of send button
    }
    this.handleLangFromChange = this.handleLangFromChange.bind(this);
    this.handlePhraseSubmit = this.handlePhraseSubmit.bind(this);
    this.handleLangToChange = this.handleLangToChange.bind(this);
    this.recorderInitialize = this.recorderInitialize.bind(this);
    this.recognizeAudio = this.recognizeAudio.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.translation = this.translation.bind(this);
    this.convoToggle = this.convoToggle.bind(this);
    this.clear = this.clear.bind(this);
    this.speak = this.speak.bind(this);

    io.on('sts', (response) => {
      this.setState({
        inputText: response.stsTranslation,
        rdyToRecord: true,
        result: response.translation,
        resultStyle: 'text-animate',
        status: 'Ready to send message',
        sendStyle: {backgroundColor: 'lightgreen'},
        canSend: true,
      })
    })

    io.on('translatedResponse', (response) => {
      console.log(response);
      this.setState({
        inputText: '',
        translatedResponse: response,
        rdyToRecord: true,
      }, () => {
        io.emit('received');
        this.speak()
      })
    });
    io.on('received', () => {
      this.setState({
        status: 'Message received',
        rdyToRecord: true,
      });
    })
    io.on('recognized', (message) => {
      console.log(message);
      this.setState({inputText: message,})
    })
  }

componentDidMount() {
  let langFrom = document.querySelector('#langFrom')[0].value;
  let langTo = document.querySelector('#langTo')[0].value;
  this.setState({
    langFrom: langFrom,
    langTo: langTo,
    status: 'Ready for input',
  });
  console.log(langFrom, langTo);
  this.recorderInitialize()
}

// componentDidUpdate() {
//   console.log('updating');
//   console.log(this.state);
// }

//sets state with input text
handleInput(e) {
  this.setState({inputText: e.target.value});
}

//sets state with translation result text
handleResult(e) {
  this.setState({result: e.target.value});
}

// state change for source language change
handleLangFromChange(e) {      
  this.setState({langFrom: e.target.value});
}

// state change for target language change
handleLangToChange(e) {
  this.setState({langTo: e.target.value});
}

// sends recorded audio to backend for recognition [then creates choice div if necessary] <-- make its own function?
recognizeAudio(message) {


  this.setState({textStyle: null});
  // fetch('/translation/recognize', {
  //   credentials: 'same-origin',
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     message: url,
  //   }),
  // })
  // .then((res) => {
  //   return res.json()
  // })
  // .then((json) => {
    this.setState({
      status: 'Ready for input',
      rdyToRecord: true,
    })

  // })
}
  
choiceDiv(arr) {
  this.setState({
    status: 'Choose phrase',
    sendStyle: {backgroundColor: '#FF5E5B'}
  });
  arr.pop();
  let translationBox = document.querySelector('#input-div');
  let choiceBox = document.createElement('div');
  choiceBox.setAttribute('id', 'choice-box');
  let xBox = document.createElement('xbox');
  xBox.innerHTML = 'X'
  xBox.addEventListener('click', () => {
    choiceBox.remove(),
    this.setState({status: 'Ready for input'})
  });
  choiceBox.appendChild(xBox);
  let choiceList = document.createElement('ul');
  let choices = arr.forEach((val) => {
    let newChoice = document.createElement('li');
    let newButton = document.createElement('button')
    newButton.addEventListener('click', 
      (e) => {
        this.setState((prevState) => {
          return {
            inputText: prevState.inputText += e.target.innerHTML,
            textStyle: 'text-animate',
            status: 'Awaiting translation data',
          }
        },
        () => {
          choiceBox.remove()
          this.translation();
        })
      })
    newButton.innerHTML = val;
    newChoice.appendChild(newButton);
    choiceList.appendChild(newChoice);
  })
  choiceBox.appendChild(choiceList);
  choiceBox.classList.add('on-top');
  translationBox.appendChild(choiceBox);
}

//________ANIMATION FOR TEXT APPEARANCE_____________________________________________________________________
    // let phrase = json.data.translation.charAt(0).toUpperCase() + json.data.translation.slice(1)
    // console.log(phrase);
//___________________________________________________________________________________________________________



// trying to do the Nuance TTS fetch
//________________________________________________________________________________________________________________
  // fetch('http://localhost:3001/translation/speak', {
  //   credentials: 'same-origin',
  //   method: 'GET'})
  //   .then((response) => {
  //     return response;
  //   })
  //   .then((blob) => {
  //     let ctx = new AudioContext;
  //     let body = blob.body;
  //     let reader = body.getReader();
  //     reader.read().then((result) => {
  //     console.log(result);
  //     }) 
//____________________________________________________________________________________________________________________

// sends message

sendMsg(e) {
  e.preventDefault();
  if (this.state.canSend) {
    console.log(io.id);
    io.emit('send', this.state.result);
    this.setState({
      status: 'Message sent',
      inputText: '',
      translatedResponse: '',
      canSend: false,
      sendStyle: {backgroundColor: '#FF5E5B'},
    });
  }
}

// sends input text to backend to be translated and sets state with translated resul [then sends info to TTS] <-- own func?
translation(e) {
  this.setState({resultStyle: null});
  // fetch('/translation/translate', {
  //   credentials: 'same-origin',
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     text: this.state.inputText,
  //     langFrom: this.state.langFrom,
  //     langTo: this.state.langTo,
  //   })
  // })
  // .then((res) => {
  //   return res.json()
  // })
  // .then((json) => {
  //   console.log(json);
  //   this.setState({
  //       inputText: json.data.stsTranslation,
  //       result: json.data.translation,
  //       resultStyle: 'text-animate',
  //       status: 'Ready to send message',
  //       sendStyle: {backgroundColor: 'lightgreen'},
  //       canSend: true,
  //   });
  // })
}


//runs TTS module
  speak() {
    console.log('in speak function');
    let speakLang;
    switch (this.state.langFrom) {
      case 'es': 
        speakLang = 'Spanish Latin American Female';
        break;
      case 'fr': 
        speakLang = 'French Female';
        break;
      case 'pt': 
        speakLang = 'Brazilian Portuguese Female';
        break;
      case 'ru': 
        speakLang = 'Russian Female';
        break;
      case 'hi': 
        speakLang = 'Hindi Female';
        break;
      case 'it': 
        speakLang = 'Italian Female';
        break;
      case 'ar-eg': 
        speakLang = 'Arabic Male';
        break;
      case 'zh-cn': 
        speakLang = 'Chinese Female';
        break;
      case 'ja': 
        speakLang = 'Japanese Female';
        break;
      case 'de': 
        speakLang = 'Deutsch Female';
        break;
      case 'en': 
        speakLang = 'US English Female';
        break;
    }
    let response = this.state.translatedResponse
    this.setState({speakLang: speakLang})
    console.log(this.state.translatedResponse, speakLang);
    responsiveVoice.speak(response, speakLang);
  }

//submits info to save phrase [delete?]
  handlePhraseSubmit() {
    let lang = document.querySelector('#langFrom')[0].value;
    fetch('/api/phrases', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: "same-origin",
          body: JSON.stringify({
                phrase: this.state.text,
                language: lang,
          }),
    })
    .then((res) => {
          return res.json()
    })
    .then((json) => {
          console.log(json);
    })
}

// toggles conversation mode on/off
  convoToggle() {
    this.setState({convoMode: !this.state.convoMode},
    () => {
      if (this.state.convoMode === true) {
        this.setState({convoStyle: {backgroundColor: 'black', color: 'white'}})
      } else {this.setState({convoStyle: {backgroundColor: '#FFFFEA', color: 'black'}})}
    });
  }

//clears both input/result divs
  clear() {
    this.setState({
      inputText: '',
      result: ''
    });
  }

//  recorderInitialize() {
//  let record = document.getElementById('start-recog');
//     if (navigator.mediaDevices) {
//       var constraints = { audio: true };
//       let count = 0;
//       let str;
//       navigator.mediaDevices.getUserMedia(constraints)
//       .then((stream) => {
//         var audioContext = window.AudioContext;
//         var context = new audioContext();
//         var audioInput = context.createMediaStreamSource(stream);
//         var bufferSize = 2048;
//         // create a javascript node
//         var recorder = context.createScriptProcessor(bufferSize, 1, 1);

//         // specify the processing function
//         recorder.onaudioprocess = recorderProcess;
//         var sStream = ss.createStream();
//         ss(socket).emit('stream', sStream);
//         // connect stream to our recorder
//         audioInput.connect(recorder);
//         // connect our recorder to the previous destination
//         recorder.connect(context.destination);

//         function recorderProcess(e) {

//         //   for (
//         var float32Array = e.inputBuffer.getChannelData(0) || new Float32Array(this.bufferSize);
//         // len = float32Array.length,
//         // int16Array = new Int16Array(len);
//         // len--;)
//         // int16Array[len] = 32767 * Math.min(1, float32Array[len]);
//         // ss(socket).emit('stream', int16Array.buffer);
//         sStream.write('hola ');
//           var left = convertFloat32ToInt16(e.inputBuffer.getChannelData(0));
//           // sStream.write(left)
//           // console.log(sStream);
//           //var f = $("#aud").attr("src");
//           // var src = window.URL.createObjectURL(stream);
//           // ss.createBlobReadStream(src).pipe(sStream);
//           //ss.createReadStream(f).pipe(widnow.stream);

//             }



  recorderInitialize() {
    let record = document.getElementById('start-recog');
    let audio = document.getElementById('audio');
    let blobby;
    if (navigator.mediaDevices) {
      console.log('getUserMedia supported.');
      var constraints = { audio: true };
      var chunks = [];
      navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        var mediaRecorder = new MSR(stream);
        mediaRecorder.audioChannels = 1;
        mediaRecorder.mimeType = 'audio/wav';
        mediaRecorder.ondataavailable = function (blob) {
          blobby = blob;
        };

        // visualize(stream);

        record.onclick = () => {
          var sStream = ss.createStream();
          ss(io).emit('stream', sStream, this.state.langFrom, this.state.langTo);
          if (this.state.rdyToRecord === true) {
          mediaRecorder.start(10000);
          this.setState({
            recClass: 'rec',
            status: 'Recording input',
            isRecording: true,
            rdyToRecord: false,
          }, () => {console.log("recorder started - status: ", this.state.status)})
          
        }

        else if (this.state.isRecording === true) {
          mediaRecorder.stop();
          console.log('stopped')
          var file = new File([blobby], 'msr-' + (new Date).toISOString().replace(/:|\./g, '-') + '.wav', {
            type: 'audio/wav' // is file necessary?
          });
          // console.log(url);
          //   audio.src = url;
          //   audio.play();
          ss.createBlobReadStream(file).pipe(sStream);
          this.setState({
            recClass: 'off',
            status: 'Processing audio',
            isRecording: false,
          });
          console.log("recorder stopped - status: ", this.state.status);
          // mediaRecorder.onstop = (e) => {

            // var audioBox = document.getElementById('audio-box');
            // var audio = document.createElement('audio');
            // audioBox.appendChild(audio);

            // var blob = new Blob(chunks, {'type' : 'audio/ogg; codecs=pcm'});
            //   chunks = [];
            //   ss(socket).emit('stream', sStream);
            //   sStream.write(blob);
            //   console.log(blob);
              // let url = URL.createObjectURL(blob)

              // console.log(blob);
              // this.recognizeAudio(url);
            // }
          }
        }
      })
  } else {
    console.log('Audio doesnt work');
  }
}

  render() {
    return (
      <div id='translation-container'>
      <div id='audio-box'><audio id='audio' /></div>
        <div id='translation-div'>
          <div id='input-div'>
            <form id='translation-form' onSubmit={(e) => this.translation(e)}>
              <textarea id='input-box' name='text' rows='3' value={this.state.inputText} className={this.state.textStyle} onChange={(e) => this.handleInput(e)}/>
              <div id='tr-again-div'onClick={this.translation}>Translate Again</div>
                <div id='to-from-div'>
                    <select name='langFrom' className='langInput' defaultValue='eng-USA' id='langFrom' onChange={(e) => {this.handleLangFromChange(e)}}> 
                      <option value='en'>English</option>
                      <option value='es'>Spanish</option>
                      <option value='fr'>French</option>
                      <option value='pt'>Portuguese</option>
                      <option value='it'>Italian</option>
                      <option value='ru'>Russian</option>
                      <option value='ar-eg'>Arabic</option>
                      <option value='zh-cn'>Chinese</option>
                      <option value='ja'>Japanese</option>
                      <option value='de'>German</option>
                      <option value='iw'>Hebrew</option>
                      <option value='fi'>Finnish</option>
                      <option value='hi'>Hindi</option>
                      <option value='ko'>Korean</option>
                      <option value='tr'>Turkish</option>
                    </select>
                  <div id='yellow'></div>
                  <div id='triangle-div'>
                    <div id='triangle-topleft'></div>
                    <div id='triangle-bottomright'></div>
                  </div>
                  <div id='green'></div>
                    <select name='langTo' id='langTo' className='langInput' defaultValue='es' onChange={(e) => {this.handleLangToChange(e)}}> 
                      <option value='en'>English</option>
                      <option value='es'>Spanish</option>
                      <option value='fr'>French</option>
                      <option value='pt'>Portuguese</option>
                      <option value='it'>Italian</option>
                      <option value='ru'>Russian</option>
                      <option value='ar-eg'>Arabic</option>
                      <option value='zh-cn'>Chinese</option>
                      <option value='ja'>Japanese</option>
                      <option value='de'>German</option>
                      <option value='iw'>Hebrew</option>
                      <option value='fi'>Finnish</option>
                      <option value='hi'>Hindi</option>
                      <option value='ko'>Korean</option>
                      <option value='tr'>Turkish</option>
                    </select>
                  </div>
                {/*<input id='submit-btn' type='submit'/>*/}
              <textarea id='result-box' name='result' rows='3' value={this.state.translatedResponse} className={this.state.resultStyle} onChange={(e) => this.handleResult(e)}></textarea>
            </form>
          </div>
          <div id='controls'>
            <div id='top-row'>
              <button id='log-btn'>Log</button>
              <button id='convo-btn' style={this.state.convoStyle} onClick={this.convoToggle}><i className="fa fa-comments-o" aria-hidden="true"></i></button>
              <button id='clear-btn' onClick={this.clear}>Clear</button>
            </div>
          <div id='bottom-row'>
            <div id='status-div'>{this.state.status}</div>
            <div id='recognize-button-container' className={this.state.recClass}>
              <button id='start-recog'><i className={`${this.state.recClass} fa fa-microphone fa-3x`} aria-hidden="true"></i></button>
            </div>
            <button id='send-btn' style={this.state.sendStyle} onClick={(e) => {this.sendMsg(e)}}>Send!</button>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default Translation;

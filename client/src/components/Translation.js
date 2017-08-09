import React, { Component } from 'react';
import responsiveVoice from '../responsiveVoice.js';
const io = require('socket.io-client')('/');
const ss = require('socket.io-stream');
const MSR = require('msr');

class Translation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      langFrom: 'en',                                               //  source language code (from drop-down)
      langTo: 'es',                                                 //  target language code (from drop-down)
      speakLang: '',                                                //  language-code for TTS to speak
      audioClip: null,                                              //  TTS audio clip 
      inputText: '',                                                //  input text to be translated
      recogResult: '',                                              //  result of speech recog
      stsTranslation: '',                                           //  STS translation
      responseBox: '',                                              //  translated text/response to be displayed   
      result: '',                                                   //  translated text in target language
      isRecording: false,                                           //  true/false is currently recording voice
      rdyToRecord: true,                                            //  true/false is ready to record
      recClass: 'off',                                              //  class for record button animation
      convoMode: false,                                             //  conversation mode on/off
      convoStyle: {backgroundColor: '#FFFFEA', color: 'black'},     //  conversation mode button style
      usernameEntry: false,                                         //  if username entry box should appear
      username: '',                                                 //  current username
      usersOnline: [],                                              //  array of users online {username, userID}
      userSelected: '',                                             //  username currently selected from list
      chattingWith: null,                                             //  currently chatting with (username)
      textStyle: null,                                              //  for animation of text
      resultStyle: null,                                            //  ''
      status: null,                                                 //  status of app overall for user to view
      canSend: false,                                               //  should send btn display
      sendStyle: {backgroundColor: '#FF5E5B'},                      //  bkgrnd color of send button
    }
    this.recorderInitialize = this.recorderInitialize.bind(this);
    this.usernameSubmit = this.usernameSubmit.bind(this);
    this.translateAgain = this.translateAgain.bind(this);
    this.userChatSelect = this.userChatSelect.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.switchLangs = this.switchLangs.bind(this);
    this.convoToggle = this.convoToggle.bind(this);
    this.clear = this.clear.bind(this);
    this.speak = this.speak.bind(this);

    // receive list of usernames
    io.on('userListResponse', (userList) => {
      this.setState({usersOnline: userList}, (userList) => {
        console.log(this.state.usersOnline);
      })      
    }) 

    io.on('chatRequest', (user) => {
      console.log('request from: ', user.username);
      // if (chatRequestBox(user)) {
        this.setState({chattingWith: user});
        io.emit('accept', user);
      // } else {
      //   io.emit('reject');
      // }

    })

    // receive translation and sts translation
    io.on('sts', (response) => {
      this.setState((prevState) => { 
        return {
          inputText: response.stsTranslation,
          rdyToRecord: true,
          result: response.translation,
          responseBox: this.state.convoMode? prevState.responseBox : response.translation,
          resultStyle: 'text-animate',
          status: this.state.convoMode? 'Ready to send message' : 'Ready for input',
          sendStyle: this.state.convoMode? {backgroundColor: 'lightgreen'} : {backgroundColor: '#FF5E5B'},
          canSend: this.state.convoMode? true: false,
        }
      }, () => {
        if (!this.state.convoMode) {
          this.speak();
        }
      })
    })

    //receive message from other user?
    io.on('translatedResponse', (response) => {
      console.log(response);
      this.setState({
        inputText: '',
        responseBox: response,
        rdyToRecord: true,
      }, () => {
        io.emit('received');
        this.speak()
      })
    });

    // confirmation of receipt?
    io.on('received', () => {
      this.setState({
        status: 'Message received',
        rdyToRecord: true,
      });
    })

    // receive voice recognition response
    io.on('recognized', (message) => {
      console.log(message);
      this.setState({inputText: message,})
    })
  }

componentDidMount() {
  this.setState({
    status: 'Ready for input',
  });
  this.recorderInitialize()
}

//sets state to handle changes
handleChange(e, field) {
  this.setState({
    [field]: e.target.value,
  });
}

// toggles conversation mode on/off
  convoToggle() {
    console.log('in convo toggle')
    this.setState({convoMode: !this.state.convoMode},
    () => {
      if (this.state.convoMode === true) {
        this.setState({
          convoStyle: {backgroundColor: 'black', color: 'white'},
          usernameEntry: true,
        });
        console.log('userlist?')
        io.emit('userList'); 
      } else {
        this.setState({convoStyle: {backgroundColor: '#FFFFEA', color: 'black'}})
      }
    });
  }

usernameSubmit() {
  let username = this.state.username;
  io.emit('username', username)
  // this.setState({usernameEntry: false});
}

userChatSelect() {
  let findUser = (user) => { 
    console.log('in function');
    return user.username === this.state.userSelected;
  }
  let userToConnect = this.state.usersOnline.find(findUser);
  return new Promise((resolve, reject) => {
    io.emit('userConnect', (userToConnect));
    io.on('accepted', () => {resolve()})
    io.on('rejected', () => {reject()})
  })
  .then(() => {
    console.log('accepted!')
  })
  .catch(() => {
    console.log('shut downnnn');
  })

}

switchLangs() {
  this.setState((prevState) => { 
    return {
      langFrom: prevState.langTo,
      langTo: prevState.langFrom,
    }
  })
}

// will be able to delete as soon as I implement text animation in a different function
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

// sends message

sendMsg(e) {
  e.preventDefault();
  if (this.state.canSend) {
    console.log(io.id);
    io.emit('send', this.state.result, this.state.chattingWith);
    this.setState({
      status: 'Message sent',
      inputText: '',
      responseBox: '',
      canSend: false,
      sendStyle: {backgroundColor: '#FF5E5B'},
    });
  }
}

// resends inputText for re-translation
translateAgain(e) {
  this.setState({resultStyle: null});
  let data = {
    message: this.state.inputText,
    from: this.state.langFrom,
    to: this.state.langTo,
  }
  io.emit('translate again', data);
}


//runs TTS module
  speak() {
    console.log('in speak function');
    let speakLang;
    switch (this.state.convoMode? this.state.langFrom : this.state.langTo) {
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
      case 'ar': 
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
    let response = this.state.responseBox
    this.setState({speakLang: speakLang})
    console.log(this.state.responseBox, speakLang);
    responsiveVoice.speak(response, speakLang);
  }


//clears both input/result divs
  clear() {
    this.setState({
      inputText: '',
      result: ''
    });
  }


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
          let data = {
            langFrom: this.state.langFrom,
            langTo: this.state.langTo,
          }
          ss(io).emit('stream', sStream, data);
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
          ss.createBlobReadStream(blobby).pipe(sStream);
          this.setState({
            recClass: 'off',
            status: 'Processing audio',
            isRecording: false,
          });
          console.log("recorder stopped - status: ", this.state.status);
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
            {this.state.usernameEntry ? 
            <div id='username-div'>
              <div id='username-input-div'>
                <input id='username-entry' type='text' onChange={(e) => {this.handleChange(e, 'username')}}></input>
                <button id='username-submit' onClick={this.usernameSubmit}> -> </button>
              </div>
              <div id='user-select-div'>
                <select id='current-users' size='4' multiple='multiple' onChange={(e) => {this.handleChange(e, 'userSelected')}}>
                  {this.state.usersOnline.map((user) => {
                    return <option>{user.username}</option>
                  })}
                </select>
                <button id='choose-chat-user' onClick={this.userChatSelect}>Connect</button>
              </div>
            </div>
            : null}
            <form id='translation-form'>
              <textarea id='input-box' name='text' rows='3' value={this.state.inputText} className={this.state.textStyle} onChange={(e) => this.handleChange(e, 'inputText')}/>
              <div id='tr-again-div'onClick={this.translateAgain}>Translate Again</div>
                <div id='to-from-div'>
                    <select name='langFrom' className='langInput' value={this.state.langFrom} id='langFrom' onChange={(e) => {this.handleChange(e, 'langFrom')}}> 
                      <option value='en'>English</option>
                      <option value='es'>Spanish</option>
                      <option value='fr'>French</option>
                      <option value='pt'>Portuguese</option>
                      <option value='it'>Italian</option>
                      <option value='ru'>Russian</option>
                      <option value='ar'>Arabic</option>
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
                    <div id='exchg-arrows' onClick={this.switchLangs}>
                      <i className="fa fa-exchange fa-2x" aria-hidden="true"></i>
                    </div>
                    <div id='triangle-topleft'></div>
                    <div id='triangle-bottomright'></div>
                  </div>
                  <div id='green'></div>
                    <select name='langTo' id='langTo' className='langInput' value={this.state.langTo} onChange={(e) => {this.handleChange(e, 'langTo')}}> 
                      <option value='en'>English</option>
                      <option value='es'>Spanish</option>
                      <option value='fr'>French</option>
                      <option value='pt'>Portuguese</option>
                      <option value='it'>Italian</option>
                      <option value='ru'>Russian</option>
                      <option value='ar'>Arabic</option>
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
              <textarea id='result-box' name='result' rows='3' value={this.state.responseBox} className={this.state.resultStyle} onChange={(e) => this.handleChange(e, 'result')}></textarea>
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
            <button id='send-btn' style={this.state.convoMode ? this.state.sendStyle: {backgroundColor: 'gray', opacity: 0.3}} onClick={(e) => {this.sendMsg(e)}}>Send!</button>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default Translation;

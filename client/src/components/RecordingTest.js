import React, { Component } from 'react';

navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia;

class RecordingTest extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mediaWorks: false,
      audioClip: null,
    }
  }
  

startRecord() {
  // make status router in this function?
  if (!this.state.recording) {
    if (navigator.mediaDevices) {
      console.log('record');

      navigator.getUserMedia = navigator.getUserMedia
        || navigator.webkitGetUserMedia 
        || navigator.mozGetUserMedia;

      const constraints = {audio: true};
      const recBtn = document.getElementById('start-recog')
      var chunks = [];

      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        console.log('instream')
        
        
        var mediaRecorder = new mediaRecorder(stream);

        // visualize(stream);

        mediaRecorder.start();
        //style of button

        mediaRecorder.onstop = (e) => {
          console.log('stop');
          var blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'});
          chunks = [];
        }

        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data)
        }
      }).catch(function(err) {
        /* handle the error */
      });
    } else {
      console.log('Unable to record');
    }
  } else {
    console.log('stop')
    mediaRecorder.stop();
  }
}



}

export default RecordingTest;
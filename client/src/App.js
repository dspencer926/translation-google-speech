import React, { Component } from 'react';
import './App.css';
import Translation from './components/Translation';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      audioClip: null,
      username: null,
      isLogged: false,
    }
    this.recordState = this.recordState.bind(this);
  }

  recordState(clip) {
    this.setState({audioClip: clip});
  }


  render() {
    return (
      <div className="App">
        <Translation 
        recordState={this.recordState} />
      </div>
    );
  }
}

export default App;

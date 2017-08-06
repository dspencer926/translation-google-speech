const translate = require('@google-cloud/translate');
// const speech = require('@google-cloud/speech');
const sox = require('sox-stream');


const translationController = {};

const rec = require('node-record-lpcm16')//"borrowed" from https://www.npmjs.com/package/node-record-lpcm16#options 
const request = require('request')

const projectId = 'translation-app-168502';
const translateClient = translate({
    projectId: projectId
  });

  let appId = 'NMDPTRIAL_dspencer926_gmail_com20170528030155';
  let appKey = '8491cf9930c4e9470946769de7d0d55551e262248a00b4ba09e6597051bf62d550326f80f658c8009e3e9d850e72db5f543d84df3d3899471ef2b76fb11a4402';

translationController.recognize = (req, res) => {

//__________________NUANCE CODE_____________________________________________________________________________________

  console.log('************************************in recognize******************************************************')
  let data = req.body.message;
  console.log(data);
  // console.log(req.body);
  // const write = new wav.Writer(data);
  // console.log(write);
  // let langFrom = req.body.langFrom;
  // let blob = req.body.blob;
  // console.log(blob);
  // console.log(langFrom);
  // res.json(blob);


    const config = {
      config: {
        languageCode: 'en-US'
      },
      interimResults: false // If you want interim results, set this to true
    };
    const recognizeStream = speechClient.streamingRecognize(config)
      .on('error', console.error)
      .on('data', (data) => {
        console.log(
            `Transcription: ${data.results[0].alternatives[0].transcript}`);
      });

//   exports.parseResult = (err, resp, body) => {
//     return res.json(body);  // figure out status/error
//   }
  
//  if (req.body.status === 'go') {
//   rec.start({
//     sampleRate: 16000,
//   }).pipe(request.post({
//     'url'     : `https://dictation.nuancemobility.net/NMDPAsrCmdServlet/dictation?appId=${appId}&appKey=${appKey}`,   //add multi-language input functionality
//     'headers' : {
//       'Transfer-Encoding': 'chunked',
//       'Content-Type': 'audio/x-wav;codec=pcm;bit=16;rate=16000',
//       'Accept': 'text/plain',
//       'Accept-Language': langFrom,
//     }
//   }, exports.parseResult))
// }
 
//   if (req.body.status === 'stop') {
//     rec.stop()
//   }
}

//______________GOOGLE TRANSLATE_____________________________________________________________________________

translationController.translate = (req, res) => {
  console.log('************************************in translate******************************************************')
  let langFrom = '';
  switch (req.body.langFrom) {
    case 'eng-USA': 
      langFrom = 'en';
      break;
    case 'spa-XLA': 
      langFrom = 'es';
      break;
    case 'fra-FRA': 
      langFrom = 'fr';
      break;
    case 'por-BRA': 
      langFrom = 'pt';
      break;
    case 'ita-ITA': 
      langFrom = 'it';
      break;
    case 'rus-RUS': 
      langFrom = 'ru';
      break;
    case 'hin-IND': 
      langFrom = 'hi';
      break;
    case 'ara-XWW': 
      langFrom = 'ar';
      break;
    case 'cmn-CHN': 
      langFrom = 'zh-CN';
      break;
    case 'jpn-JPN': 
      langFrom = 'ja';
      break;
    case 'deu-DEU': 
      langFrom = 'de';
      break;
    case 'heb-ISR': 
      langFrom = 'iw';
      break;
    case 'jpn-JPN': 
      langFrom = 'fi';
      break;
    case 'tur-TUR': 
      langFrom = 'tr';
      break;
    case 'kor-KOR': 
      langFrom = 'ko';
      break;
  }
  let text = req.body.text;
  let translation = '';
  let options = {
    from: langFrom,
    to: req.body.langTo,
  };
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
    .then(() => {translateClient.translate(translation, options)
      .then((results) => {
        let stsTranslation = results[0];
        console.log('translation', translation)
        console.log('sts translation', stsTranslation);
        res.json({message: 'worked', 
          data: {
            translation: translation, 
            stsTranslation: stsTranslation,
            source: options.from, 
            target: options.to}})
      })
      .catch((err) => {
        console.error('ERROR:', err);
      });
    });
}

module.exports = translationController;
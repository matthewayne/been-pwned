'use strict';

const functions = require('firebase-functions');
const request = require('request');
const {
  dialogflow,
  Suggestions,
  BasicCard,
  Button,
  SimpleResponse,
  List
} = require('actions-on-google')

const PWN_URL = 'https://haveibeenpwned.com/api/v2';
const PWN_IMG_URL = 'https://haveibeenpwned.com/Content/Images/PwnedLogos/'
const PWN_SITE_URL = 'https://haveibeenpwned.com/PwnedWebsites#'

const REPROMPT = `Say the name of a website or email address to see if it was compromised in a breach.`

const app = dialogflow();

app.intent('PwnedEmail', (conv, { PwnedEmail }) => {
  return callPwnApi('breachedaccount', PwnedEmail).then((response) => {
    if (response && response.length > 30) {
      response = response.slice(0,30)
    }
    if (!response){
      conv.ask(`${PwnedEmail} was not found in any known breaches.`);
      conv.ask(REPROMPT);
      conv.ask(new Suggestions('youremail@gmail.com', 'Dropbox', 'Cancel'))
      return;
    } else if (response.length === 1) {
      conv.ask(`${PwnedEmail} was found in 1 breach: ${response[0].Title}`);
      conv.ask(REPROMPT);
      conv.ask(new Suggestions(response[0].Title, 'youremail@gmail.com', 'Cancel'))
      return;
    } else {
      let items = {};
      let titles = [];
      for (let breach in response){
        titles.push(response[breach].Title)
        items[response[breach].Name] = {
          title: response[breach].Title,
          synonyms: [response[breach].Title, response[breach].Domain],
          image: {
            url: PWN_IMG_URL+response[breach].Name+'.'+response[breach].LogoType,
            accessibilityText: response[breach].Title + ' logo'
          }
        }
      }
      let speech, text;
      speech = text = `${PwnedEmail} was found in ${response.length} breaches: `;
      if (titles.length > 5){
        speech += titles.slice(0,5).join(', ')+` and ${titles.length-5} others.`;
      } else {
        speech += titles.slice(0,-1).join(', ')+" and "+titles[titles.length-1];  
      }
      conv.ask(new SimpleResponse({
        speech: speech,
        text: text,
      }));
      conv.ask(new List({
        title: `${PwnedEmail} breaches`,
        items: items
      }));
      conv.ask(REPROMPT);
    }
  }).catch( (err) => {
    console.log(`Error: ${err}`)
    conv.close(`I'm sorry I couldn't reach the database to lookup ${PwnedEmail}. Please try again later.`);
  })
})

app.intent('PwnedSite', (conv, params, listSelectKey) => {
  const PwnedSite = params.PwnedSite || listSelectKey;
  console.log(`PwnedSite: ${JSON.stringify(PwnedSite)}`)
  return callPwnApi('breach', PwnedSite).then((response) => {
    if (!response){
      conv.ask(`${PwnedSite} was not found in any known breaches.`);
      conv.ask(REPROMPT);
      conv.ask(new Suggestions('youremail@gmail.com', 'Dropbox', 'Cancel'))
    } else {
      const description = response.Description.replace(new RegExp('<[^>]*>', 'g'), "");
      const breechDataTypes = response.DataClasses;
      const breachSize = response.PwnCount.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,');
      const breachTypesString = (breechDataTypes.length === 1 ? breechDataTypes[0] : breechDataTypes.slice(0,-1).join(', ')+" and "+breechDataTypes[breechDataTypes.length-1])
      conv.ask(`${breachSize} ${breachTypesString} were exposed in the ${response.Title} breach.`);
      conv.ask(new BasicCard({
        title: response.Title,
        text: description,
        image: { // Mostly, provide anonymous Objects with the properties defined by the raw JSON API
          url: PWN_IMG_URL + response.Name + '.' + response.LogoType,
          accessibilityText: 'Google Logo',
        },
        buttons: new Button({
          title: 'More info',
          url: PWN_SITE_URL + response.Name,
        })
      }))
      conv.ask(REPROMPT);
      conv.ask(new Suggestions('troy@troyhut.com', 'Dropbox', 'Cancel'))
    }
  }).catch( (err) => {
    console.log(`Error: ${err}`)
    conv.close(`I'm sorry I couldn't reach the database to lookup ${PwnedSite}. Please try again later.`);
  })
})

function callPwnApi(api, param) {
  const options = {
    url: `${PWN_URL}/${api}/${param}`,
    headers: {
      'User-Agent': 'BeenPwned?GoogleAssistant'
    }
  };
  console.log(`API call to ${options.url}`)
  return new Promise((resolve, reject) => {
    request.get(options, (error, response, body) => {
      console.log(`API Call Reponse Code: ${response.statusCode}`)
      if (response.statusCode === 404) {
        resolve(null)
      } else if (response.statusCode === 200) {
        resolve(JSON.parse(body));
      } else {
        reject(null)  
      }
    });
  });
}

exports.dialogflowFirebasFulfillmentaoglib2 = functions.https.onRequest(app)

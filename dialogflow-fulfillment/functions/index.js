'use strict';

const functions = require('firebase-functions');
const request = require('request');
const {WebhookClient, Card, Suggestion} = require('dialogflow-fulfillment');
const {SimpleResponse, List} = require('actions-on-google')

process.env.DEBUG = 'dialogflow:debug';

const PWN_URL = 'https://haveibeenpwned.com/api/v2';
const PWN_IMG_URL = 'https://haveibeenpwned.com/Content/Images/PwnedLogos/'
const PWN_SITE_URL = 'https://haveibeenpwned.com/PwnedWebsites#'

const REPROMPT = `Say the name of a website or email address to see if it was compromised in a breach.`

exports.dialogflowFirebaseFulfillmentdflib = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function pwnedEmail(agent) {
    console.log('pwnedEmail handler')
    const email = agent.parameters.PwnedEmail;
    return callPwnApi('breachedaccount', email).then((response) => {
      if (response && response.length > 30) {
        response = response.slice(0,30)
      }
      if (!response){
        agent.add(`${email} was not found in any known breaches.`);
        agent.add(REPROMPT);
        agent.add(new Suggestion('youremail@gmail.com'))
        agent.add(new Suggestion('Dropbox'))
        agent.add(new Suggestion('Cancel'))
        return;
      } else if (response.length === 1) {
        agent.add(`${email} was found in 1 breach: ${response[0].Title}`);
        agent.add(REPROMPT);
        agent.add(new Suggestion(response[0].Title))
        agent.add(new Suggestion('youremail@gmail.com'))
        agent.add(new Suggestion('Cancel'))
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
        speech = text = `${email} was found in ${response.length} breaches: `;
        if (titles.length > 5){
          speech += titles.slice(0,5).join(', ')+` and ${titles.length-5} others.`;
        } else {
          speech += titles.slice(0,-1).join(', ')+" and "+titles[titles.length-1];  
        }
        const conv = agent.conv();
        conv.ask(new SimpleResponse({
          speech: speech,
          text: text,
        }));
        conv.ask(new List({
          title: `${email} breaches`,
          items: items
        }));
        conv.ask(REPROMPT);
        agent.add(conv);
        return;
    }
    }).catch( (err) => {
      console.log(`Error: ${err}`)
      agent.add(agent.conv().close(`I'm sorry I couldn't reach the database to lookup ${email}. Please try again later.`));
      return;
    })
  }

  function pwnedSite(agent) {
    console.log('pwnedSite handler')
    const context = agent.getContext('actions_intent_option');
    const site = agent.parameters.PwnedSite || context.parameters.OPTION;
    return callPwnApi('breach', site).then((response) => {
      if (!response){
        agent.add(`${site} was not found in any known breaches.`);
        agent.add(REPROMPT);
        agent.add(new Suggestion('youremail@gmail.com'))
        agent.add(new Suggestion('Dropbox'))
        agent.add(new Suggestion('Cancel'))
      } else {
        const description = response.Description.replace(new RegExp('<[^>]*>', 'g'), "");
        const breechDataTypes = response.DataClasses;
        const breachSize = response.PwnCount.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,');
        const breachTypesString = (breechDataTypes.length === 1 ? breechDataTypes[0] : breechDataTypes.slice(0,-1).join(', ')+" and "+breechDataTypes[breechDataTypes.length-1])
        agent.add(`${breachSize} ${breachTypesString} were exposed in the ${response.Title} breach.`);
        agent.add(new Card({
          title: response.Title,
          text: description,
          imageUrl: PWN_IMG_URL + response.Name + '.' + response.LogoType,
          buttonText: 'More info',
          buttonUrl: PWN_SITE_URL + response.Name,
        }))
        agent.add(REPROMPT);
        agent.add(new Suggestion('troy@troyhut.com'))
        agent.add(new Suggestion('Dropbox'))
        agent.add(new Suggestion('Cancel'))
      }
    }).catch( (err) => {
      console.log(`Error: ${err}`)
      agent.add(agent.conv().close(`I'm sorry I couldn't reach the database to lookup ${site}. Please try again later.`));
      return;
    })
  }

  let intentMap = new Map();
  intentMap.set('PwnedEmail', pwnedEmail);
  intentMap.set('PwnedSite', pwnedSite);
  agent.handleRequest(intentMap);
});

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

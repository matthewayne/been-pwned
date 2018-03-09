# Been Pwned for the Google Assistant
This is the code powering [the Google Assistant app "Been Pwned"](https://assistant.google.com/services/a/uid/000000e8ebcfc479) which use's [Troy Hunt](https://www.troyhunt.com/)'s [Have I Been Pwned?](https://haveibeenpwned.com/) API to determine if a given email address or website has been compromised.  The two folders here contain two distinct but functionally inditical implementations of fulfillment for Dialogflow, one using the [Actions on Google v2 client library](https://github.com/actions-on-google/actions-on-google-nodejs) and the other using [Dialogflow's Fulfillment library](https://github.com/dialogflow/dialogflow-fulfillment-nodejs).

## Try it out
Say `Talk to been pwned` to any Google Assistant device or [click here](https://assistant.google.com/services/a/uid/000000e8ebcfc479)

## Dialogflow setup
1. [Sign up for or sign into Dialogflow](https://console.dialogflow.com/api-client/#/login)
1. [Create a Dialogflow agent](https://dialogflow.com/docs/getting-started/building-your-first-agent#create_an_agent)
1. [Restore the zip file `HaveIBeenPwned.zip`](https://dialogflow.com/docs/agents#export_and_import)

## Fulfillment Setup: Dialogflow Inline Editor (option 1)

1. [Enable the Cloud Function for Firebase inline editor](https://dialogflow.com/docs/fulfillment#cloud_functions_for_firebase)
1. Copy this code in `functions/index.js` the `index.js` file in the Dialogflow Cloud Function for Firebase inline editor.
1. Copy this code in `functions/package.json` the `package.json` file in the Dialogflow Cloud Function for Firebase inline editor.
1. Click `Deploy`

## Fulfillment Setup: Firebase CLI (option 2)

1. `cd` to the `functions` directory
1. Run `npm install`
1. Install the Firebase CLI by running `npm install -g firebase-tools`
1. Login to your Google account with `firebase login`
1. Add your project to the sample with `firebase use [project ID]` [find your project ID here](https://dialogflow.com/docs/agents#settings)
1. Run `firebase deploy --only functions:dialogflowFirebaseFulfillment`
1. Paste the URL into your Dialogflow agent's fulfillment and click `Save`

## License
See LICENSE.md.

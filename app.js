//
// Required modules
//
"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { config } = require('dotenv');
const app = express();
require('dotenv').config({path: '.env'});

//
// Encoding bodies support
//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//
// Set the consts
//
const port = process.env.PORT || 3000;
const HUBSPOT_API_URL = process.env.HUBSPOT_API_URL;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_OWNER_ID = process.env.HUBSPOT_OWNER_ID;
const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

//
// Start the webservice 
//
const server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});

//
// Public folder
//
app.use(express.static('public'));

//
// GET /Hubspot for Hubspot integration
//
app.get('/Hubspot', async function(req, res) {    
    if (req.query){
        if (
            req.query.TenantID && req.query.InteractionID && 
            req.query.DNIS && req.query.QueueID && req.query.AgentID && 
            req.query.AgentName && req.query.ANI && req.query.QueueName
        ){
            console.log ("Receive Popup Request");
            console.log ("TenantID: " + req.query.TenantID);
            console.log ("InteractionID: " + req.query.InteractionID);
            console.log ("DNIS: " + req.query.DNIS);
            console.log ("QueueID: " + req.query.QueueID);
            console.log ("AgentID: " + req.query.AgentID);
            console.log ("AgentName: " + req.query.AgentName);
            console.log ("ANI: " + req.query.ANI);
            console.log ("QueueName: " + req.query.QueueName);

            //
            // Get the contact information from the Hubspot API
            //
            let contactId = await getContactIdByPhone(req.query.ANI) 
            console.log("Contact ID: " + contactId);

            //
            // Register the call in hubspot
            // Redirect to the hubspot call URL
            //
            if (contactId){
                let callId = await createCallEngagement(req.query.ANI, req.query.DNIS, contactId);
                console.log("Call ID: " + callId);

                res.redirect('https://app.hubspot.com/contacts/' + HUBSPOT_PORTAL_ID + '/contact/' + contactId + '/?engagement=' + callId);
            }
            else
                res.redirect('https://app.hubspot.com/contacts/' + HUBSPOT_PORTAL_ID);
        }
    }
    else{
        res.sendStatus(404);
    }
});

//
// Get Hubspots Contact Id by phone
//
async function getContactIdByPhone(phone){
    //
    // Create the data to search
    //
    let data = JSON.stringify({
        "filterGroups": [
        {
            "filters": [
                {
                "propertyName": "phone",
                "operator": "CONTAINS_TOKEN",
                "value": "*" + phone
                }
            ]
        }
    ]
    });

    //
    // Create the request config
    //
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: HUBSPOT_API_URL + '/crm/v3/objects/contacts/search',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + HUBSPOT_API_KEY
        },
        data: data
    };

    //
    // Make the request
    //
    let response = await axios.request(config);
    if (response.data.results[0].id)
        return response.data.results[0].id;
    else
        return null;
}

//
// Create a Call in Hubspot
//
async function createCallEngagement(ANI, DNIS, contactId){
    const CallDisposition = Object.freeze({
        BUSY:           '9d9162e7-6cf3-4944-bf63-4dff82258764',
        CONNECTED:      'f240bbac-87c9-4f6e-bf70-924b57d47db7',
        LEFT_MESSAGE:   'a4c4c377-d246-4b32-a13b-75a56a4cd0ff',
        LEFT_VOICEMAIL: 'b2cf5968-551e-4856-9783-52b3da59a7d0',
        NO_ANSWER:      '73a0d17f-1163-4015-bdd5-ec830791da20',
        WRONG_NUMBER:   '17b47fee-58de-441e-a44c-c6300d46f273'
    });

    //
    // Create the data to search
    //
    let data = JSON.stringify({
        "properties": {
            "hs_timestamp": "1736285838",
            "hs_call_title": "Webex Calling Call",
            "hubspot_owner_id": HUBSPOT_OWNER_ID,
            "hs_call_body": "Enter your comments here ... <br/>Transcription link: https://wip.techniclabs.app",
            "hs_call_direction": "INBOUND",
            "hs_call_disposition": CallDisposition.CONNECTED,
            "hs_call_duration": "3000",
            "hs_call_from_number": ANI,
            "hs_call_to_number": DNIS,
            "hs_call_recording_url": "https://techniclabs.app/TranscriptionJobs/llamadaprueba.wav",
            "hs_call_status": "IN_PROGRESS"
          },
          "associations": [
            {
              "to": {
                "id": contactId
              },
              "types": [
                {
                  "associationCategory": "HUBSPOT_DEFINED",
                  "associationTypeId": 194
                }
              ]
            }
        ]
    });

    //
    // Create the request config
    //
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: HUBSPOT_API_URL + '/crm/v3/objects/calls',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + HUBSPOT_API_KEY
        },
        data: data
    };

    //
    // Make the request
    //
    let response = await axios.request(config);
    if (response.data.id)
        return response.data.id;
    else
        return null;
}

//
// Required modules
//
"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { config } = require('dotenv');
const app = express();
const formatISO = require('date-fns/formatISO');
require('dotenv').config({ path: '.env' });

//
// Encoding bodies support
//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//
// Set the consts
//
const port = process.env.PORT || 3000;
const HUBSPOT_API_URL = process.env.HUBSPOT_API_URL;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_OWNER_ID = process.env.HUBSPOT_OWNER_ID;
const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

if (!HUBSPOT_API_URL || !HUBSPOT_API_KEY || !HUBSPOT_OWNER_ID || !HUBSPOT_PORTAL_ID) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

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
app.get('/Hubspot', async function(req, res){
    try {
        if (req.query){

            const { TenantID, InteractionID, DNIS, QueueID, AgentID, AgentName, ANI, QueueName } = req.query;
            if (TenantID && InteractionID && DNIS && QueueID && AgentID && AgentName && ANI && QueueName) {
                console.log ("Receive Popup Request");
                console.log (`TenantID: ${TenantID}`);
                console.log (`InteractionID: ${InteractionID}`);
                console.log (`DNIS: ${DNIS}`);
                console.log (`QueueID: ${QueueID}`);
                console.log (`AgentID: ${AgentID}`);
                console.log (`AgentName: ${AgentName}`);
                console.log (`ANI: ${ANI}`);
                console.log (`QueueName: ${QueueName}`);
    
                //
                // Get the contact information from the Hubspot API
                //
                let contactId = await getContactIdByPhone(ANI) 
                console.log("Contact ID: " + contactId);
    
                //
                // Register the call in hubspot
                // Redirect to the hubspot call URL
                //
                if (contactId){
                    let callId = await createCallEngagement(ANI, DNIS, contactId, req.secure? "https": "http", req.headers.host, InteractionID);
                    console.log("Call ID: " + callId);
                    res.redirect(`https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/contact/${contactId}/?engagement=${callId}`);

                } else {
                    res.redirect(`https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}`);
                }
                    
            }
        }
        else{
            res.sendStatus(404);
        }
    }
    catch (error) {
        console.error("Error processing request:", error);
        res.sendStatus(500).send("Internal Server Error");
    }
    
});

//
// Get Hubspots Contact Id by phone
//
async function getContactIdByPhone(phone){
    try{
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

    } catch (error) {
        console.error("Error fetching contact ID:", error);
        return null;
    }
    
}

//
// Create a Call in Hubspot
//
async function createCallEngagement(ANI, DNIS, contactId, protocol, host, interactionID){
    try {
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
        let date = new Date();
        let isoDate = formatISO.formatISO(date);
        let data = JSON.stringify({
            "properties": {
                "hs_timestamp": isoDate,
                "hs_call_title": "Webex Calling Call",
                "hubspot_owner_id": HUBSPOT_OWNER_ID,
                "hs_call_body": `Enter your comments here ... <br/>Transcription link: ${protocol}://${host}/Webex/Transcription?InteractionID=${interactionID}`,
                "hs_call_direction": "INBOUND",
                "hs_call_disposition": CallDisposition.CONNECTED,
                "hs_call_duration": "3000",
                "hs_call_from_number": ANI,
                "hs_call_to_number": DNIS,
                "hs_call_recording_url": `${protocol}://${host}/recording-not-available-es.mp3?InteractionID=${interactionId}`,
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
    catch (error) {
        console.error("Error creating call engagement:", error);
        return null;
    }
}


//
// http://localhost:3000/Hubspot?TenantID=74a12140-d78e-4d77-86ca-09ec72f86e94&InteractionID=e44ab073-f9cb-4de4-9a62-089569e19cc2&DNIS=9000&QueueID=101603bc-82b9-45ed-ab2c-b46292a85a2c&AgentID=4c6fabf7-9943-4637-99ea-32b6b673470e&AgentName=diegofn+diegofn&ANI=3167046747&QueueName=Servicio+Cliente
//
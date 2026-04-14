const express = require('express');
const axios = require('axios');
const qs = require('qs');
const { config } = require('dotenv');

require('dotenv').config({ path: '.env' });

const SALESFORCE_LOGIN_URL = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const SALESFORCE_USERNAME = process.env.SALESFORCE_USERNAME;
const SALESFORCE_PASSWORD = process.env.SALESFORCE_PASSWORD;
const SALESFORCE_SECURITY_TOKEN = process.env.SALESFORCE_SECURITY_TOKEN;

let SALESFORCE_ACCESS_TOKEN = null;
let SALESFORCE_INSTANCE_URL = null;

const router = express.Router();

//
// GET /Salesforce for Salesforce integration
//
router.get('/', async function(req, res){
    try {
        if (req.query){
            const { TenantID, InteractionID, DNIS, QueueID, AgentID, AgentName, ANI, QueueName } = req.query;
            if (TenantID && InteractionID && DNIS && QueueID && AgentID && AgentName && ANI && QueueName) {
                console.log ("Receive Popup Request for Salesforce");
                console.log (`TenantID: ${TenantID}`);
                console.log (`InteractionID: ${InteractionID}`);
                console.log (`DNIS: ${DNIS}`);
                console.log (`QueueID: ${QueueID}`);
                console.log (`AgentID: ${AgentID}`);
                console.log (`AgentName: ${AgentName}`);
                console.log (`ANI: ${ANI}`);
                console.log (`QueueName: ${QueueName}`);

                // Authenticate with Salesforce if not already done
                if (!SALESFORCE_ACCESS_TOKEN) {
                    await authenticateSalesforce();
                }

                // Get contact information by phone
                const contact = await getContactByPhone(ANI);
                console.log("Contact found: ", contact);

                // Create a case in Salesforce
                const caseId = await createCase(ANI, DNIS, AgentName, QueueName, InteractionID, req.headers.host, contact);
                console.log("Case ID: " + caseId);

                if (caseId) {
                    const caseUrl = `${SALESFORCE_INSTANCE_URL}/${caseId}`;
                    res.redirect(caseUrl);
                } else {
                    res.status(500).send("Error creating case");
                }
            } else {
                res.status(400).send("Missing required parameters");
            }
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal Server Error");
    }
});

//
// Authenticate with Salesforce
//
async function authenticateSalesforce() {
    try {
        const data = {
            grant_type: 'client_credentials',
            client_id: SALESFORCE_CLIENT_ID,
            client_secret: SALESFORCE_CLIENT_SECRET
            //username: SALESFORCE_USERNAME,
            //password: SALESFORCE_PASSWORD + SALESFORCE_SECURITY_TOKEN
        };

        const response = await axios.post(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, qs.stringify(data), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        SALESFORCE_ACCESS_TOKEN = response.data.access_token;
        SALESFORCE_INSTANCE_URL = response.data.instance_url;
        console.log("Authenticated with Salesforce");
    } catch (error) {
        console.error("Error authenticating with Salesforce:", error);
        throw error;
    }
}

//
// Get Contact by Phone from Salesforce
//
async function getContactByPhone(phone) {
    try {
        const query = `SELECT Id, Name, Phone, Account.Name FROM Contact WHERE Phone = '${phone}' LIMIT 1`;
        const encodedQuery = encodeURIComponent(query);
        const url = `${SALESFORCE_INSTANCE_URL}/services/data/v57.0/query?q=${encodedQuery}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${SALESFORCE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.records && response.data.records.length > 0) {
            const contact = response.data.records[0];
            return {
                id: contact.Id,
                name: contact.Name,
                phone: contact.Phone,
                accountName: contact.Account ? contact.Account.Name : null
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching contact:", error);
        return null;
    }
}

//
// Create a Case in Salesforce
//
async function createCase(ANI, DNIS, AgentName, QueueName, InteractionID, host, contact) {
    try {
        let description = `Call from ${ANI} to ${DNIS}. \n`;
        description += `Agent: ${AgentName}. \nQueue: ${QueueName}. \nInteractionID: ${InteractionID}. \n`;
        description += `Transcription link: https://${host}/Webex/Transcription?InteractionID=${InteractionID}\n`;
        description += `Record: https://${host}/recording-not-available-es.mp3?InteractionID=${InteractionID}\n`;

        if (contact) {
            description += `\n\nContact Name: ${contact.name}\nContact Phone: ${contact.phone}\nAccount Name: ${contact.accountName || 'N/A'}`;
        }

        const data = {
            Subject: `Webex Calling Case - ${ANI}`,
            Description: description,
            Origin: 'Web',
            Status: 'New',
            Priority: 'Medium'
        };

        if (contact) {
            data.ContactId = contact.id;
        }

        const config = {
            method: 'post',
            url: `${SALESFORCE_INSTANCE_URL}/services/data/v57.0/sobjects/Case`,
            headers: {
                'Authorization': `Bearer ${SALESFORCE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        return response.data.id;
    } catch (error) {
        console.error("Error creating case:", error);
        return null;
    }
}

module.exports = router;
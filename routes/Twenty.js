const express = require('express');
const axios = require('axios');

require('dotenv').config({ path: '.env' });

//
// Twenty CRM settings
//   TWENTY_API_URL  : base URL of the Twenty instance (ex: https://crm.example.com)
//   TWENTY_API_KEY  : API key created in Settings > APIs & Webhooks
//   TWENTY_APP_URL  : (optional) frontend URL used for the redirect, defaults to TWENTY_API_URL
//
const TWENTY_API_URL = (process.env.TWENTY_API_URL || '').replace(/\/+$/, '');
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_APP_URL = (process.env.TWENTY_APP_URL || TWENTY_API_URL).replace(/\/+$/, '');
const TWENTY_OPPORTUNITY_STAGE = process.env.TWENTY_OPPORTUNITY_STAGE || 'NEW';

const router = express.Router();

const twenty = axios.create({
    baseURL: `${TWENTY_API_URL}/rest`,
    headers: {
        'Authorization': `Bearer ${TWENTY_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

//
// GET /Twenty for Twenty CRM integration
//
router.get('/', async function(req, res){
    try {
        if (!TWENTY_API_URL || !TWENTY_API_KEY) {
            console.error("Missing TWENTY_API_URL or TWENTY_API_KEY");
            return res.status(500).send("Twenty integration not configured");
        }

        const { TenantID, InteractionID, DNIS, QueueID, AgentID, AgentName, ANI, QueueName } = req.query;
        if (!(TenantID && InteractionID && DNIS && QueueID && AgentID && AgentName && ANI && QueueName)) {
            return res.status(400).send("Missing required parameters");
        }

        console.log("Receive Popup Request for Twenty");
        console.log(`TenantID: ${TenantID}`);
        console.log(`InteractionID: ${InteractionID}`);
        console.log(`DNIS: ${DNIS}`);
        console.log(`QueueID: ${QueueID}`);
        console.log(`AgentID: ${AgentID}`);
        console.log(`AgentName: ${AgentName}`);
        console.log(`ANI: ${ANI}`);
        console.log(`QueueName: ${QueueName}`);

        // Get person information by phone
        const person = await getPersonByPhone(ANI);
        console.log("Person found: ", person);

        // Create an opportunity in Twenty
        const opportunityId = await createOpportunity(ANI, person);
        console.log("Opportunity ID: " + opportunityId);

        if (!opportunityId) {
            return res.status(500).send("Error creating opportunity");
        }

        // Attach the call details as a note (non blocking for the redirect)
        await createCallNote(opportunityId, ANI, DNIS, AgentName, QueueName, InteractionID, req.headers.host, person);

        res.redirect(`${TWENTY_APP_URL}/object/opportunity/${opportunityId}`);
    } catch (error) {
        console.error("Error processing request:", error.response ? error.response.data : error);
        res.status(500).send("Internal Server Error");
    }
});

//
// Extract the record created from a Twenty REST response: { data: { createXxx: {...} } }
//
function extractCreated(response) {
    const data = response && response.data && response.data.data;
    if (!data) return null;
    const record = Object.values(data)[0];
    return record || null;
}

//
// Get Person by Phone from Twenty
// Matches the last 10 digits so numbers with or without country code are found
//
async function getPersonByPhone(phone) {
    try {
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return null;
        const lastDigits = digits.slice(-10);

        const response = await twenty.get('/people', {
            params: {
                filter: `phones.primaryPhoneNumber[like]:"%${lastDigits}%"`,
                limit: 1
            }
        });

        const people = response.data && response.data.data && response.data.data.people;
        if (people && people.length > 0) {
            const p = people[0];
            const firstName = p.name ? p.name.firstName || '' : '';
            const lastName = p.name ? p.name.lastName || '' : '';
            return {
                id: p.id,
                name: `${firstName} ${lastName}`.trim(),
                phone: p.phones ? `${p.phones.primaryPhoneCallingCode || ''}${p.phones.primaryPhoneNumber || ''}` : phone,
                companyId: p.companyId || null
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching person:", error.response ? error.response.data : error.message);
        return null;
    }
}

//
// Create an Opportunity in Twenty
//
async function createOpportunity(ANI, person) {
    try {
        const data = {
            name: `Webex Calling Opportunity - ${person && person.name ? person.name : ANI}`,
            stage: TWENTY_OPPORTUNITY_STAGE
        };

        if (person) {
            data.pointOfContactId = person.id;
            if (person.companyId) {
                data.companyId = person.companyId;
            }
        }

        const response = await twenty.post('/opportunities', data);
        const record = extractCreated(response);
        return record ? record.id : null;
    } catch (error) {
        console.error("Error creating opportunity:", error.response ? error.response.data : error.message);
        return null;
    }
}

//
// Create a Note with the call details and link it to the opportunity
//
async function createCallNote(opportunityId, ANI, DNIS, AgentName, QueueName, InteractionID, host, person) {
    try {
        let markdown = `Call from ${ANI} to ${DNIS}.\n\n`;
        markdown += `- Agent: ${AgentName}\n- Queue: ${QueueName}\n- InteractionID: ${InteractionID}\n`;
        markdown += `- Transcription link: https://${host}/Webex/Transcription?InteractionID=${InteractionID}\n`;
        markdown += `- Record: https://${host}/recording-not-available-es.mp3?InteractionID=${InteractionID}\n`;

        if (person) {
            markdown += `\n**Contact Name:** ${person.name}\n\n**Contact Phone:** ${person.phone}\n`;
        }

        const title = `Webex Calling - ${ANI}`;
        let note;
        try {
            // Recent Twenty versions use the rich text field bodyV2
            note = extractCreated(await twenty.post('/notes', { title, bodyV2: { markdown } }));
        } catch (error) {
            // Older versions only have the plain "body" field
            console.warn("bodyV2 not supported, retrying with body");
            note = extractCreated(await twenty.post('/notes', { title, body: markdown }));
        }

        if (!note) return null;

        await twenty.post('/noteTargets', { noteId: note.id, opportunityId });
        if (person) {
            await twenty.post('/noteTargets', { noteId: note.id, personId: person.id });
        }
        return note.id;
    } catch (error) {
        console.error("Error creating note:", error.response ? error.response.data : error.message);
        return null;
    }
}

module.exports = router;

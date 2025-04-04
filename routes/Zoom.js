const express = require('express');
const axios = require('axios');
const { config } = require('dotenv');

const formatISO = require('date-fns/formatISO');
const nodemailer = require('nodemailer');
const ical = require('ical-generator').default;
const crypto = require('crypto');

require('dotenv').config({ path: '.env' });
const MSGRAPH_CLIENT_ID = process.env.MSGRAPH_CLIENT_ID;
const MSGRAPH_CLIENT_SECRET = process.env.MSGRAPH_CLIENT_SECRET;
const MSGRAPH_TENANT_ID = process.env.MSGRAPH_TENANT_ID;

const MSGRAPH_USER_URL = process.env.MSGRAPH_USER_URL;
const MSGRAPH_EMAIL_USER = process.env.MSGRAPH_EMAIL_USER;
const ZOOM_REDIRECT_EMAILS = process.env.ZOOM_REDIRECT_EMAILS;
const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

const router = express.Router();

//
// Zoom / for Zoom Integration
//
router.get('/', async function(req, res){
    res.status(200)
    res.send(`Zoom Webhook sample successfully running`)  
});
//
// POST / for Zoom Integration
//
router.post('/', async function(req, res){
    try {

        //
        // Construct the message string
        // 
        const message = `v0:${req.headers['x-zm-request-timestamp']}:${JSON.stringify(req.body)}`
        const hashForVerify = crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex')

        //
        // hash the message string with your Webhook Secret Token and prepend the version semantic
        //
        const signature = `v0=${hashForVerify}`

        if (req.headers['x-zm-signature'] === signature) {

            //
            // Zoom validating you control the webhook endpoint 
            //
            if(req.body.event === 'endpoint.url_validation') {
                const hashForValidate = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN).update(req.body.payload.plainToken).digest('hex')

                response = {
                    message: {
                        plainToken: req.body.payload.plainToken,
                        encryptedToken: hashForValidate
                    },
                    status: 200
                }

                console.log(response.message)

                res.status(response.status)
                res.json(response.message)
            } else {

                //
                // Zoom sending the event to your endpoint
                //
                if (req.body){
                    const data = req.body;
                    
                    //
                    // New meeting event
                    //
                    if (data.event == null){
                      console.log("Reveived body empty request");
                      res.sendStatus(200);
                      return;
                    }
                      
                    if (data.event == "meeting.created"){
                        console.log (`operator:  ${data.payload.operator}`);
                        console.log (`uuid:  ${data.payload.object.uuid}`);
                        console.log (`topic:  ${data.payload.object.topic}`);
                        console.log (`start_time:  ${data.payload.object.start_time}`);
                        console.log (`join_url:  ${data.payload.object.join_url}`);
                        console.log (`duration:  ${data.payload.object.duration}`);
                        console.log (`timezone:  ${data.payload.object.timezone}`);
        
                        //
                        // Request a new Microsoft Graph token
                        //
                        let token_data = qs.stringify({
                            'grant_type': 'client_credentials',
                            'client_id': MSGRAPH_CLIENT_ID,
                            'client_secret': MSGRAPH_CLIENT_SECRET,
                            'scope': 'https://graph.microsoft.com/.default'
                        });
                        const MSGRAPH_TOKEN_URL = 'https://login.microsoftonline.com/' + MSGRAPH_TENANT_ID + '/oauth2/v2.0/token';
                    
                        //
                        // Create the request config
                        //
                        let config = {
                            method: 'post',
                            maxBodyLength: Infinity,
                            url: MSGRAPH_TOKEN_URL,
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            data: token_data
                        };
                    
                        //
                        // Make the request
                        //
                        let msgraph_token;
                        let response = await axios.request(config);
                        if (response.data.access_token)
                            msgraph_token = response.data.access_token;
                        else
                            return null;
        
                        //
                        // Create the event in Microsoft Graph
                        //
                        const endDateTime = new Date(data.payload.object.start_time);
                        const attendees = JSON.parse(ZOOM_REDIRECT_EMAILS)
                        endDateTime.setMinutes  (endDateTime.getMinutes() + data.payload.object.duration);
                        let event_data = JSON.stringify({
                            "subject": data.payload.object.topic,
                            "start": {
                            "dateTime": data.payload.object.start_time,
                            "timeZone": data.payload.object.timezone
                            },
                            "end": {
                              "dateTime": endDateTime.toISOString(),
                              "timeZone": data.payload.object.timezone
                            },
                            "location": {
                              "displayName": data.payload.object.join_url,
                              "locationUri": data.payload.object.join_url
                            },
                          "attendees": attendees
                        });
        
                        //
                        // Create the request config
                        //
                        let event_config = {
                            method: 'post',
                            maxBodyLength: Infinity,
                            url: MSGRAPH_USER_URL + MSGRAPH_EMAIL_USER + '/events',
                            headers: { 
                                'Content-Type': 'application/json', 
                                'Authorization': 'Bearer ' + msgraph_token
                            },
                            data : event_data
                        };
        
                        //
                        // Make the request
                        //
                        let response_event = await axios.request(event_config);
                        if (response_event)
                            return response_event.id;
                        else
                            return null;
                        
                    }            
                }
            }
        } else {
            response = { message: 'Unauthorized request to Zoom Webhook sample.', status: 401 }

            console.log(response.message)

            res.status(response.status)
            res.json(response)
        }
    }
    catch (error) {
        console.error("Error processing request:", error);
        res.sendStatus(500).send("Internal Server Error");
    }
    
});

//
// Send the email with the .ics file
//
router.post('/SendMail', async function(req, res){

    //
    // Send the .ics to a email user
    //
    let transporter = nodemailer.createTransport({
        host: "smtp.163.com",
        port: "25",
        
        auth: {
            user: process.env.NODEMAIL_USER,
            pass: process.env.NODEMAIL_PASSWORD
        }
    });
    
    //
    // Create the calendar invitation
    //
    const cal = ical({ name: data.payload.object.topic });
    const startTime = new Date();
    const endTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    endTime.setHours(startTime.getHours() + 2);

    cal.createEvent({
        start: startTime,
        end: endTime,
        summary: data.payload.object.topic,
        description: "Zoom Meeting",
        location: data.payload.object.join_url,
        url: data.payload.object.join_url,
        organizer: {
            name: "Webex Zoom Webhook",
            email: data.payload.operator
        },
    });
    
    //
    // Mail options
    //
    var maillist = [
        'mail1@gmail.com',
        'mail2@gmail.com',
    ];

    let mailOptions = {
        from: process.env.NODEMAIL_USER,
        to: maillist,
        subject: data.payload.object.topic,
        text: "You have a new meeting invitation",
        attachments: [
            {
                name: 'invite.ics',
                type: 'text/calendar;method=REQUEST;name=\"invite.ics\"',
                data: cal.toString(),
            },
        ],
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            res.status(500).send({
                message: {
                Error: "Could not sent email"
                }
        })
        }
    });  
});

module.exports = router;
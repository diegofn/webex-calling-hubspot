//
// Required modules
//
"use strict";

const express = require('express');
const bodyParser = require('body-parser');
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
app.get('/Hubspot', function(req, res) {    
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
            // Redirect to the hubspot call URL
            //
            res.redirect("https://app.hubspot.com/contacts/%s/contact/%s/?engagement=%s", HUBSPOT_PORTAL_ID, "80163986750", "68440462250");
        }
    }
    else{
        res.sendStatus(404);
    }
});

//
// http://localhost:3000/Hubspot?TenantID=74a12140-d78e-4d77-86ca-09ec72f86e94&InteractionID=e44ab073-f9cb-4de4-9a62-089569e19cc2&DNIS=9000&QueueID=101603bc-82b9-45ed-ab2c-b46292a85a2c&AgentID=4c6fabf7-9943-4637-99ea-32b6b673470e&AgentName=diegofn+diegofn&ANI=3167046747&QueueName=Servicio+Cliente
//


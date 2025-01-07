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
const HUBSPOT_URL = process.env.HUBSPOT_URL;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

//
// Start the webservice 
//
const server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});

//
// GET /
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
            res.redirect(HUBSPOT_URL);
        }
    }
    else{
        res.sendStatus(404);
    }
});


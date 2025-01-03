//
// Required modules
//
"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
require('dotenv').config({path: '.env'});

//
// Encoding bodies support
//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var HUBSPOT_URL = "https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/";
var HUBSPOT_API_KEY = "YOUR_HUBSPOT"


//
// Start the webservice 
//
const server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});

//
// GET /
//
app.get('/Hubspot', function(req, res) {
    res.send('Hello World!');
});


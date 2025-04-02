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
const nodemailer = require('nodemailer');
const { ICalEvent } = require('ical-generator');
const ical = require('ical-generator').default;
const qs = require('qs');
require('dotenv').config({ path: '.env' });

//
// Map the routes
//
const hubspotRoute = require('./routes/Hubspot');
const zoomRoute = require('./routes/Zoom');

//
// Encoding bodies support
//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/Hubspot', hubspotRoute);
app.use('/Zoom', zoomRoute);

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
// http://localhost:3000/Hubspot?TenantID=74a12140-d78e-4d77-86ca-09ec72f86e94&InteractionID=e44ab073-f9cb-4de4-9a62-089569e19cc2&DNIS=9000&QueueID=101603bc-82b9-45ed-ab2c-b46292a85a2c&AgentID=4c6fabf7-9943-4637-99ea-32b6b673470e&AgentName=diegofn+diegofn&ANI=3167046747&QueueName=Servicio+Cliente
//
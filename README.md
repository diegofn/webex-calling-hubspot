# webex-calling-hubspot
Webex Calling integration with HubSpot, Salesforce and Twenty CRM through Webex Customer Experience (CX).

When an agent receives a call, Webex CX opens a screen pop URL in the browser. This service receives that request, registers the call in the CRM and redirects the browser to the record that was created.

# Common setup
1. Install the dependencies and create the `.env` file:
   ```
   npm install
   cp .env.sample .env
   ```
2. Fill in the variables of the CRM you will use (see each section below). `PORT` defaults to `3000`.
3. Start the service:
   ```
   npm start
   ```
4. In Webex CX, set the screen pop URL to `https://<your-host>/<CRM>` (`/Hubspot`, `/Salesforce` or `/Twenty`). See https://help.webex.com/en-us/article/72sb3r/Webex-Customer-Experience-Essentials

Every endpoint is a `GET` and requires these query parameters, sent by Webex CX:

| Parameter | Description |
|---|---|
| `TenantID` | Webex CX tenant |
| `InteractionID` | Call identifier, used for the transcription and recording links |
| `DNIS` | Dialed number |
| `QueueID` | Queue identifier |
| `AgentID` | Agent identifier |
| `AgentName` | Agent name |
| `ANI` | Caller number, used to look up the contact |
| `QueueName` | Queue name |

# HubSpot integration
Endpoint: `GET /Hubspot`

- Looks up a Contact whose `phone` ends with `ANI`.
- Creates an inbound Call engagement associated with the contact, with the transcription and recording links, owned by `HUBSPOT_OWNER_ID`.
- Redirects the browser to the contact with the call open. If no contact is found, redirects to the contacts list.

## Getting an access token
HubSpot no longer uses API keys; the integration uses a private app access token.
1. Sign in to HubSpot as a super admin.
2. Go to **Settings > Integrations > Private Apps** (in newer accounts: **Development > Legacy apps > Create legacy app > Private**) and click **Create a private app**.
3. Give it a name (ex: `webex-cx`) and, in the **Scopes** tab, enable:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
4. Click **Create app** and copy the access token (`pat-...`).
5. Get the remaining values:
   - **Portal ID (Hub ID):** shown in the account menu (top right, next to the account name).
   - **Owner ID:** the HubSpot user that will own the calls. List them with:
     ```
     curl -H "Authorization: Bearer $HUBSPOT_API_KEY" "https://api.hubapi.com/crm/v3/owners"
     ```
     and use the `id` of the user.
6. Put them in `.env`:
   ```
   HUBSPOT_API_URL = https://api.hubapi.com
   HUBSPOT_API_KEY = <access token>
   HUBSPOT_OWNER_ID = <owner id>
   HUBSPOT_PORTAL_ID = <hub id>
   ```

## Testing
Check the token:
```
curl -H "Authorization: Bearer $HUBSPOT_API_KEY" "https://api.hubapi.com/crm/v3/objects/contacts?limit=1"
```
Create a test contact with the phone `3167046747` and open:
```
http://localhost:3000/Hubspot?TenantID=t1&InteractionID=i1&DNIS=9000&QueueID=q1&AgentID=a1&AgentName=Agent+Test&ANI=3167046747&QueueName=Servicio+Cliente
```

# Salesforce integration
Endpoint: `GET /Salesforce`

- Authenticates with the OAuth 2.0 Client Credentials flow.
- Looks up a Contact whose `Phone` is exactly `ANI`.
- Creates a Case (`Status = New`, `Priority = Medium`, `Origin = Web`) with the call details in the description, linked to the contact if found.
- Redirects the browser to the case.

## Getting the client credentials
1. Sign in to Salesforce as an administrator and open **Setup**.
2. Go to **App Manager** and click **New Connected App** (in newer orgs: **New External Client App**).
3. Fill in the name and contact email, then under **API (Enable OAuth Settings)**:
   - Check **Enable OAuth Settings**.
   - Callback URL: any valid URL (ex: `https://localhost/callback`); it is not used.
   - Selected OAuth scopes: **Manage user data via APIs (api)**.
   - Check **Enable Client Credentials Flow**.
4. Save. Then click **Manage > Edit Policies** and, under **Client Credentials Flow**, set **Run As** to the user the integration will act as (it needs permission to read Contacts and create Cases).
5. Back in the app, click **Manage Consumer Details** and copy the **Consumer Key** and **Consumer Secret**.
6. Get your **My Domain** URL in **Setup > My Domain** (ex: `https://yourcompany.my.salesforce.com`). The Client Credentials flow does not work with `login.salesforce.com`.
7. Put them in `.env`:
   ```
   SALESFORCE_LOGIN_URL = https://yourcompany.my.salesforce.com
   SALESFORCE_CLIENT_ID = <consumer key>
   SALESFORCE_CLIENT_SECRET = <consumer secret>
   ```
   `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD` and `SALESFORCE_SECURITY_TOKEN` are not used by the current flow.

Notes:
- The `Web` value must exist in the Case `Origin` picklist.
- The access token is requested once and kept in memory; restart the service if it expires or is revoked.

## Testing
Check the credentials:
```
curl -X POST "$SALESFORCE_LOGIN_URL/services/oauth2/token" -d "grant_type=client_credentials" -d "client_id=$SALESFORCE_CLIENT_ID" -d "client_secret=$SALESFORCE_CLIENT_SECRET"
```
The response must contain `access_token` and `instance_url`. Create a test contact with the phone `3167046747` and open:
```
http://localhost:3000/Salesforce?TenantID=t1&InteractionID=i1&DNIS=9000&QueueID=q1&AgentID=a1&AgentName=Agent+Test&ANI=3167046747&QueueName=Servicio+Cliente
```

# Twenty CRM integration
Endpoint: `GET /Twenty`

- Looks up a Person whose primary phone matches the last 10 digits of `ANI`.
- Creates an Opportunity (stage `TWENTY_OPPORTUNITY_STAGE`, default `NEW`) with the person as point of contact and their company.
- Creates a Note with the call details linked to the opportunity and the person.
- Redirects the browser to the opportunity in Twenty.

## Getting an API key
1. Sign in to your Twenty instance as an admin.
2. Go to **Settings** and enable **Advanced mode** (toggle at the bottom of the settings menu) if **Developers** is not visible.
3. Open **Settings > Developers > API** and click **Create API key**.
4. Give it a name (ex: `webex-cx`) and an expiration date, then copy the key. It is shown only once.
5. Put it in `.env`:
   ```
   TWENTY_API_URL = https://your-twenty-instance.example.com
   TWENTY_API_KEY = <key>
   ```
   Set `TWENTY_APP_URL` only if the web UI lives on a different URL than the API.

## Testing
Check the key:
```
curl -H "Authorization: Bearer $TWENTY_API_KEY" "$TWENTY_API_URL/rest/opportunities?limit=1"
```
Then open:
```
http://localhost:3000/Twenty?TenantID=t1&InteractionID=i1&DNIS=9000&QueueID=q1&AgentID=a1&AgentName=Agent+Test&ANI=3167046747&QueueName=Servicio+Cliente
```

# webex-calling-hubspot
Webex Calling integration to Hubspot through Webex Customer Experience CX

# Features
- Receive through GET the Webex Calling Customer Experience parameters. https://help.webex.com/en-us/article/72sb3r/Webex-Customer-Experience-Essentials
- Create a task in Hubspot to the existing contact based on ANI.
- Get the task URL.
- Redirect to the Task URL in the Web browser.

# Twenty CRM integration
Endpoint: `GET /Twenty` with the same Webex CX parameters (`TenantID`, `InteractionID`, `DNIS`, `QueueID`, `AgentID`, `AgentName`, `ANI`, `QueueName`).

- Looks up a Person whose primary phone matches the last 10 digits of `ANI`.
- Creates an Opportunity (stage `TWENTY_OPPORTUNITY_STAGE`, default `NEW`) with the person as point of contact and their company.
- Creates a Note with the call details linked to the opportunity and the person.
- Redirects the browser to the opportunity in Twenty.

## Getting an API key
1. Sign in to your Twenty instance as an admin.
2. Go to **Settings** and enable **Advanced mode** (toggle at the bottom of the settings menu) if **APIs & Webhooks** is not visible.
3. Open **Settings > Developers > API ** and click **Create API key**.
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


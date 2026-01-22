---
date: 2020-10-01
authors:
  - coulof
categories:
  - Dell
---

# CloudIQ Webhook to ServiceNow

In this article you will learn how to use [CloudIQ webhooks](https://cloudiq.emc.com/ui/index.html#/webhooks) to open a ticket in [ServiceNow](https://www.servicenow.com/).

<!-- more -->

## Webhook? What webhook?

To paraphrase [Wikipedia](https://en.wikipedia.org/wiki/Webhook) :material-wikipedia: which paraphrases [Atlassian](https://developer.atlassian.com/server/jira/platform/webhooks/) a webhook is a user-defined callback over HTTP.

In other terms, it allows users to add a flow of new behavior or actions via an HTTP call. It is a popular way to have real-time updates with third-party applications.

In the context of CloudIQ, you can use the webhook feature to notify 3rd party application of health issue on monitored systems like storage arrays, virtual machines, etc.

## ServiceNow Development resources

ServiceNow offers tons of resources to learn and try ServiceNow features on [developer.servicenow.com](https://developer.servicenow.com/dev.do).

One of the most outstanding features is to spin an on-demand instance with a release of your choice and sample data. It is free to create an account.

## From CloudIQ health issue to ServiceNow incident

This chapter will present the mechanisms and code to create a ServiceNow incident from CloudIQ health issue notification.

[Incident Management](https://docs.servicenow.com/bundle/paris-it-service-management/page/product/incident-management/concept/c_IncidentManagement.html) is one of the many ITIL processes that can be orchestrated with ServiceNow.

### When is a webhook triggered?

At the time of the publication, a notification is triggered on health issue change.

### Webhook event details

#### Headers

| Name              | Value | Description |
|-------------------|-------|-------------|
|x-ciq-event        |string |Indicates the type of event this message represents |
|x-ciq-event-version|x.y    |Indicates the version of payload contents |
|x-ciq-delivery-id  |xxxx   |Uniquely identifies the delivery |
|x-ciq-signature    |SHA-256=SIGNATURE|HMAC-SHA256 signature for verification |
|User-Agent         |string | `DellEMC-CloudIQ-Webhooks/1.0.3` |

#### Payload

Below is a sample payload:

```json
{
  "systemDisplayIdentifier": "APM00000000000",
  "systemName": "APM00000000000",
  "systemModel": "Unity 450F",
  "timestamp": 1594138375970,
  "timestampIso8601": "2020-07-07T16:12Z",
  "currentScore": 94,
  "newIssues": [],
  "resolvedIssues": [
    {
      "impact": -6,
      "description": "Host 'lglxxxx.emc.com' is not logged in to both SPs",
      "resolution": "Review your connectivity to ensure High Availability.",
      "ruleId": "HOST_CONNECTIVITY_RULE",
      "category": "CONFIGURATION",
      "impactedObjects": [{"id": "APM00000000000__HOST__Host_57"}]
    }
  ]
}
```

### ServiceNow Scripted REST API

The reference documentation for Scripted REST API is available [here](https://docs.servicenow.com/bundle/paris-application-development/page/integrate/custom-web-services/concept/c_CustomWebServices.html).

The script has logic to create and close the incident and maps CloudIQ fields to ServiceNow incident parameters. The `urgency` level is set using the same threshold as CloudIQ green/orange/red.

### Configure CloudIQ Webhook

From the CloudIQ GUI under Admin > Webhooks, you can click on the button *ADD WEBHOOK* and fill:

* *Name* ; to name your webhook
* *Payload URL* ; where an **HTTP POST** operation will be performed
* *Secret* ; pass-phrase to verify the event's signature
* *List of systems table* ; select the systems for which the URL should be invoked

### Testing

It is possible to test the script using ServiceNow [REST API explorer](https://developer.servicenow.com/dev.do#!/learn/learning-plans/orlando/technology_partner_program/app_store_learnv2_rest_orlando_introduction_to_the_rest_api_explorer).

Another option is to use [https://webhook.site/](https://webhook.site/) as an endpoint for testing.

## What's next?

The next article of this series will describe how to use CloudIQ webhooks with Serverless providers like AWS Lambda or Azure function.

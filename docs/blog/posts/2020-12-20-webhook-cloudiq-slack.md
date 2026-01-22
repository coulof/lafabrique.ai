---
date: 2020-12-20
authors:
  - coulof
categories:
  - Dell
---

# CloudIQ Webhook to Slack

In this article, you will learn how to use [CloudIQ webhooks](https://cloudiq.emc.com/ui/index.html#/webhooks) to send a [Slack](https://api.slack.com/messaging/managing) :material-slack: or [Teams](https://docs.microsoft.com/en-us/microsoftteams/platform/overview) :material-microsoft-teams: message using serverless providers like [GCP Cloud Functions](https://cloud.google.com/functions) :material-google-cloud: or [AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html) :material-aws:.

<!-- more -->

## Intro

This article is the second of the series about CloudIQ Webhooks. In the previous article, [CloudIQ Webhook to ServiceNow](2020-10-01-webhook-cloudiq-snow.md), we discussed how the CloudIQ Webhook could integrate directly with ServiceNow with Scripted REST API.

The serverless computing is a perfect fit to pre-process the CloudIQ webhook data. It is a stateless processing design, requires no infrastructure management, and it is pay-per-use.

## Slack integration

The first case study uses [GCP Cloud Functions](https://cloud.google.com/functions/docs) :material-google-cloud: to receive the health issue event, process it, then send it to Slack.

For this integration, we use [Incoming Webhooks](https://api.slack.com/messaging/webhooks) :material-slack:. Incoming Webhooks are the easiest way to post JSON payload as a Slack message.

### Slack app creation

The first step is to create a Slack app at [https://api.slack.com/apps](https://api.slack.com/apps) :material-slack:.

1. Click on *create* button and set application name and workspace
2. Click *Add features and functionality* then *Incoming Webhooks*
3. Activate the feature *Request to Add New Webhook*
4. Request permission to access a channel
5. Copy the URL to be used

### Google Cloud Functions

There are three main functions:

1. **slack_notification** - the entry point function called on HTTP POST
2. **verify_signature** - algorithm to verify the message comes from CloudIQ
3. **ciq_fields_to_slack_message** - converts the CloudIQ event into a Slack message

```python
def slack_notification(request):
    try:
        check_signature = bool(os.environ['CHECK_SIGNATURE'])
    except KeyError:
        check_signature = False
    try:
        shared_secret = os.environ['SHARED_SECRET']
    except KeyError:
        shared_secret = 'test'
    try:
        slack_app_url = os.environ['SLACK_APP_URL']
    except KeyError:
        slack_app_url = ''
    request_json = request.get_json()

    if request.headers['x-ciq-event'] == 'ping':
        return 'pong', 200
    elif request.headers['x-ciq-event'] == 'health-score-change':
        if check_signature:
            if not verify_signature(request.data,
                    request.headers['x-ciq-signature'].removeprefix('SHA-256='),
                    shared_secret):
                return 'Wrong signature', 412
        return ciq_fields_to_slack_message(request_json, slack_app_url)
    else:
        return 'unknown or missing x-ciq-event', 406
```

### Local try

Google Cloud Functions allows you to try your code locally:

```bash
pip install functions-framework
functions-framework --target slack_notification
```

### Deployment

GCP offers to deploy a function from `gcloud` command or the console. You can learn more in [this article](https://cloud.google.com/functions/docs/deploying).

## What's next?

Next on my TODO list is to implement a similar use-case using Microsoft Teams and Azure Functions.

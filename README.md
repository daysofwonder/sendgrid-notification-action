# E-mail Release Notification

This repo contains a re-usable GitHub Action that when installed sends an e-mail to a distribution list with the release notes every time a GitHub Release is created for the repository.

This Action makes use of [SendGrid's](https://sendgrid.com/) API to send the e-mails.

## Pre-Requisites

To run this action you'll need:
- A [**SendGrid API Key**](https://sendgrid.com/docs/ui/account-and-settings/api-keys/). _SendGrid is [free to up 100 e-mails a day](https://sendgrid.com/pricing/) so feel free to register and get your API KEY._

## Setup

### 1. Create the workflow

Add a new YML file workflow in `.github/workflows` to trigger on `release`. For example:
```yml
name: E-Mail Release Notification
on:
  release:
    types: [published]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
    - name: Notify about a new release
      uses: ba-st-actions/email-release-notification@v3.0.0
      env:
        SENDGRID_API_TOKEN: ${{ secrets.SENDGRID_API_TOKEN }}
        SENDER_EMAIL: ${{ secrets.SENDER_EMAIL }}
        DISTRIBUTION_LISTS: ${{ secrets.DISTRIBUTION_LISTS }}
```

### 2. Set the SendGrid secret

Create a new secret on your project named `SENDGRID_API_TOKEN`. Set the value to your [SendGrid API Key](https://sendgrid.com/docs/ui/account-and-settings/api-keys/).

### 3. Set the DISTRIBUTION_LISTS secret (Optional)

Do the same for a secret named `DISTRIBUTION_LISTS`. The secret contents is a comma separated list of e-mails for other lists (This e-mails will be put in CC in the outgoing mail).

### 4. Set the SENDER_EMAIL secret

Do the same for a secret named `SENDER_EMAIL` including the e-mail to be used in the `from:` field on the mail message.

### 5. Test the workflow!

Create a new release for your repository and verify that the action triggers and that the e-mails were sent. Sometimes it's worth checking the spam inbox.



This Action is modified from action : https://github.com/ba-st-actions/email-release-notification

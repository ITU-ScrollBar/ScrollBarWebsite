# Calendar Firebase Functions

Small, focused Firebase Cloud Functions that power the Calendar backend for the website. Provides HTTP and background functions to read and sync a users calendar events with external providers (Google Calendar, etc.). Intended to be used with the website frontend and Firebase Authentication.

## Prerequisites
- Node.js LTS (recommended: 18+)
- Firebase CLI (>= 9.x) for deployment
- npm or yarn
- A Firebase project with Firestore and Cloud Functions enabled

## Quick setup
1. `npm install` or `yarn install` to install dependencies for this project

2. Configure firebase project by navigating to [Firebase Service accounts](https://console.firebase.google.com/u/0/project/_/settings/serviceaccounts/adminsdk)

3. Generate new private key and save it in `./.credentials.json` (root of repository) - make sure not to expose this to anyone else.

4. Deploy functions
    ```bash
    firebase deploy --only functions
    ```
    or run locally:
    ```bash
    npm start
    # or
    yarn start
    ```

## Local testing

Once the setup guide is followed, you can test the function locally by accessing `http://localhost:5001/calendar/<uid>` where `<uid>` is a user id. This will download an `.ics` file that can be imported in modern calendar apps.

# Mailgun service

## Quick setup

1. Generate a sending key on app.eu.mailgun.net and store in as `MAILGUN_API_KEY` in `.env`

2. Set up `MAILGUN_DOMAIN`

3. Run pre-build script `yarn run prebuild` to ensure types are available in this project.
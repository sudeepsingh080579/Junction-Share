export const PRIVACY_EFFECTIVE = 'October 7, 2026';

export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Summary',
    body: 'JunctionShare has no accounts or in-app payments in this release, no advertising SDKs, and does not sell personal information. The name and WhatsApp number you save stay on your device. This release does not request device location; nearby riders are demo data. Continuing a match opens WhatsApp, which is operated by Meta under its own policies.',
  },
  {
    heading: 'Information stored on your device',
    body: 'Profile stores your display name and WhatsApp number in the device secure store. They are not uploaded to a JunctionShare backend. Clearing the phone field deletes the saved number. On a new install the app clears secure-store values left behind by a previous install, because the iOS keychain can survive uninstall.',
  },
  {
    heading: 'Location',
    body: 'This release does not request location permission and does not read your position. Nearby riders in the inbox are demo cards included so you can try matching. If a later release uses location, this policy will change.',
  },
  {
    heading: 'Contacts',
    body: 'Contacts permission is requested only when you tap “Use number from this phone” and then pick one contact. The app reads the phone number on that contact. Cancelling the picker reads nothing else. Contacts are not uploaded to JunctionShare servers.',
  },
  {
    heading: 'Destination search and maps',
    body: 'The destination text you search is sent to Photon (photon.komoot.io, Komoot) or, when a Google Maps API key is configured for the build, to Google Places. The map preview loads Google Maps. Those providers process the query under their own policies.',
  },
  {
    heading: 'WhatsApp handoff',
    body: 'Chat on WhatsApp opens a wa.me link to the other person’s number with a prefilled greeting. That conversation is handled by WhatsApp (Meta), not by JunctionShare. This release has no in-app chat and does not send WhatsApp alerts.',
  },
  {
    heading: 'Data retention',
    body: 'On-device profile data remains until you clear app data or uninstall. Because profile fields are not stored on a JunctionShare server, there is no cloud profile to delete with us. Questions: hello@rydio.app.',
  },
];
